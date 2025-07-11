import type { Request, Response } from 'express';
import pool from '../database/index.js';
import bcrypt from 'bcrypt';
import type { QueryResult, PoolClient } from 'pg';
import jwt from 'jsonwebtoken';
import type { SignOptions, JwtPayload } from 'jsonwebtoken';
import authConfig from '../config/authConfig.js';
import jwtConfig from '../config/jwtConfig.js';
//UTILITY FUNCTIONS

/*
function: authenticateUser
This function checks if the provided username and password match a user in the database.
It returns the user ID if successful, or null if the user is not found or the password is incorrect.
*/
const authenticateUser = async (username: string, password: string): Promise<number | null> => {
  try {
    interface UserRow {
      id: number;
      password_hash: string;
    }

    const fetch_user_row: QueryResult<UserRow> = await pool.query(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (fetch_user_row.rowCount === 0) {
      return null; // User not found
    }

    const user = fetch_user_row.rows[0]!;
    const stored_password_hash = user.password_hash;
    const passwordMatch = await bcrypt.compare(password, stored_password_hash);

    if (passwordMatch) {
      return user.id;
    } else {
      return null; //Invalid password
    }
  } catch (error) {
    console.error('Database error in authenticateUser:', error);
    return null; // Return null in case of an error
  }
};

const generateAndStoreRefreshToken = async (
  userId: number,
  client: PoolClient
): Promise<string> => {
  const payload = {
    sub: userId,
  };
  const secret: string = process.env['REFRESH_TOKEN_SECRET']!;
  const options: SignOptions = { expiresIn: jwtConfig.refreshTokenExpiresIn };
  const refreshToken = jwt.sign(payload, secret, options);

  const refreshTokenHash: string = await bcrypt.hash(refreshToken, authConfig.bcrypt.saltRounds);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  await client.query(
    'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, refreshTokenHash, expiresAt]
  );

  return refreshToken;
};

const generateAccessToken = (userId: number): string => {
  const payload = {
    sub: userId,
  };
  const secret: string = process.env['ACCESS_TOKEN_SECRET']!;
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, secret, options);
};

/*
function: setRefreshTokenCookie
This function sets the refresh token in a secure HTTP-only cookie.
*/
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  // Set the refresh token in a secure cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: authConfig.cookies.httpOnly,
    secure: authConfig.cookies.secure, // Use secure cookies in production
    sameSite: authConfig.cookies.sameSite, // Prevent CSRF attacks
    maxAge: authConfig.cookies.maxAge,
  });
};

// ENDPOINT HANDLERS

/*
function: handleRegistration
It checks that the username is unique, hashes the password, and adds the new user to the database.
*/
async function handleRegistration(req: Request, res: Response): Promise<void> {
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    await client.query('BEGIN');

    const existingUser: QueryResult<{ id: number }> = await client.query(
      'SELECT id FROM users WHERE username = $1 FOR UPDATE',
      [username]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({ error: 'Username already exists.' });
      return;
    }

    const hashed_password: string = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);

    const insertResult = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hashed_password]
    );

    const userId: number = insertResult.rows[0].id;

    const accessToken = generateAccessToken(userId);
    const refreshToken = await generateAndStoreRefreshToken(userId!, client);
    setRefreshTokenCookie(res, refreshToken);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'User registered successfully',
      accessToken: accessToken,
    });
  } catch (error) {
    // Handle transaction rollback
    await client?.query('ROLLBACK');

    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error. Registration failed.' });
  } finally {
    client?.release();
  }
}

/*
function: handleLogin
It checks the password's validity. If valid, it shows a success message.
*/
async function handleLogin(req: Request, res: Response): Promise<void> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();

    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const userId = await authenticateUser(username, password);
    if (userId !== null) {
      // If the user is authenticated successfully
      await client.query('BEGIN');

      const refreshToken = await generateAndStoreRefreshToken(userId!, client);
      setRefreshTokenCookie(res, refreshToken); // Set the refresh token in a cookie

      await client.query('COMMIT');

      res.status(200).json({
        message: 'Login successful',
        accessToken: generateAccessToken(userId),
      });
      return;
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
  } catch (error) {
    await client?.query('ROLLBACK');
    console.error('Error during authentication:', error);
    res.status(500).json({ error: 'Internal server error. Login failed.' });
    return;
  } finally {
    client?.release();
  }
}

/*
function: handleLogout
This function clears the refresh token cookie and sends a success message.
*/
async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies['refreshToken']; // Get the refresh token from the cookie

    if (!refreshToken) {
      res.status(200).json({ message: 'Logout successful (no refresh token found).' });
      return;
    }

    res.clearCookie('refreshToken', {
      // Clear the refresh token cookie
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
    });

    let payload: JwtPayload | null = null;
    try {
      // Verify token signature and expiry
      payload = jwt.verify(refreshToken, process.env['REFRESH_TOKEN_SECRET']!) as JwtPayload;
    } catch {
      res.status(200).json({
        message: 'Logout successful (invalid or expired refresh token).',
      });
      return;
    }

    const userId = parseInt(payload.sub as string, 10);
    if (isNaN(userId)) {
      res.status(403).json({ error: 'Invalid refresh token payload.' });
      return;
    }

    const userSessions: QueryResult<{ id: number; token_hash: string }> = await pool.query(
      'SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    for (const row of userSessions.rows) {
      const isMatch = await bcrypt.compare(refreshToken, row.token_hash);
      if (isMatch) {
        await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        break;
      }
    }

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error. Logout failed.' });
  }
}

/*
function: handleExpiredAccessToken
This function checks the validity of the refresh token and issues a new access token and a new refresh token if valid.
*/
async function handleExpiredAccessToken(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies['refreshToken']; // Get the refresh token from the cookie

  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token provided' });
    return;
  }

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();
    let payload: JwtPayload | null = null;
    try {
      // Verify token signature and expiry first.
      payload = jwt.verify(refreshToken, process.env['REFRESH_TOKEN_SECRET']!) as JwtPayload;
    } catch {
      res.status(403).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const userId = parseInt(payload.sub as string, 10);
    if (isNaN(userId)) {
      res.status(403).json({ error: 'Invalid refresh token payload.' });
      return;
    }

    await client.query('BEGIN');

    const userSessions: QueryResult<{ id: number; token_hash: string }> = await client.query(
      'SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );

    let potentialBreach: boolean = true;

    for (const row of userSessions.rows) {
      const isMatch = await bcrypt.compare(refreshToken, row.token_hash);
      if (isMatch) {
        potentialBreach = false;
        await client.query('DELETE FROM refresh_tokens WHERE id = $1', [row.id]);
        break;
      }
    }

    if (potentialBreach) {
      console.warn(
        `SECURITY ALERT: Re-used or unknown refresh token detected for user ID: ${userId}. Invalidating all sessions.`
      );
      try {
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
      } catch (error) {
        console.error(
          'SECURITY ALERT: Database error while invalidating all sessions of a breached user:',
          error
        );
      }

      res.status(403).json({ error: 'Invalid refresh token.' });
      return;
    }

    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = await generateAndStoreRefreshToken(userId!, client);
    setRefreshTokenCookie(res, newRefreshToken);
    await client.query('COMMIT');

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
    return;
  } catch (error) {
    await client?.query('ROLLBACK');
    console.error('Error during token refresh:', error);
    res.status(500).json({ error: 'Internal server error. Token refresh failed.' });
    return;
  } finally {
    client?.release();
  }
}

export { handleRegistration, handleLogin, handleLogout, handleExpiredAccessToken };
