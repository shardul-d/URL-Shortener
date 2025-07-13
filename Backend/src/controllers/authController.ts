import type { Request, Response } from 'express';
import { client } from '../server.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { JwtPayload } from 'jsonwebtoken';
import authConfig from '../config/authConfig.js';
import tokenService from '../services/TokenService.js';

//UTILITY FUNCTIONS

/*
function: authenticateUser
This function checks if the provided username and password match a user in the database.
It returns the user ID if successful, or null if the user is not found or the password is incorrect.
*/
const authenticateUser = async (username: string, password: string): Promise<number | null> => {
  try {
    const user = await client.users.findUnique({
      where: { username },
      select: { id: true, password_hash: true },
    });

    if (!user) return null;

    const stored_password_hash = user.password_hash;
    const passwordMatch = await bcrypt.compare(password, stored_password_hash);

    if (passwordMatch) {
      return Number(user.id);
    } else {
      return null; //Invalid password
    }
  } catch (error) {
    console.error('Database error in authenticateUser:', error);
    return null; // Return null in case of an error
  }
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
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const result = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingUser = await tx.users.findUnique({
        where: { username },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error('Username already exists.');
      }

      const hashed_password: string = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);

      const newUser = await tx.users.create({
        data: {
          username,
          password_hash: hashed_password,
        },
      });

      const userId = Number(newUser.id);
      const accessToken = tokenService.createAccessToken(userId);
      const refreshToken = await tokenService.createRefreshToken(userId, tx);

      return { accessToken, refreshToken };
    });

    setRefreshTokenCookie(res, result.refreshToken);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error. Registration failed.' });
  }
}

/*
function: handleLogin
It checks the password's validity. If valid, it shows a success message.
*/
async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const userId = await authenticateUser(username, password);

    if (userId !== null) {
      // If the user is authenticated successfully
      const result = await client.$transaction(async (tx: Prisma.TransactionClient) => {
        const refreshToken = await tokenService.createRefreshToken(userId, tx);
        return { refreshToken };
      });

      setRefreshTokenCookie(res, result.refreshToken);

      const accessToken = tokenService.createAccessToken(userId);
      res.status(200).json({
        message: 'Login successful',
        accessToken: accessToken,
      });
      return;
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).json({ error: 'Internal server error. Login failed.' });
    return;
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
      httpOnly: authConfig.cookies.httpOnly,
      secure: authConfig.cookies.secure,
      sameSite: authConfig.cookies.sameSite,
    });

    let payload: JwtPayload;
    try {
      // Verify token signature and expiry
      payload = tokenService.verifyRefreshToken(refreshToken);
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

    try {
      await client.$transaction(async (tx: Prisma.TransactionClient) => {
        await tokenService.revokeSpecificRefreshToken(refreshToken, tx);
      });
    } catch (error) {
      console.error('Error during logout token revocation:', error);
      // Still return success since cookie is cleared
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

  try {
    let payload: JwtPayload;
    try {
      payload = tokenService.verifyRefreshToken(refreshToken);
    } catch {
      res.status(403).json({ error: 'Invalid or expired refresh token.' });
      return;
    }

    const userId = parseInt(payload.sub as string, 10);

    const result = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const tokenFound = await tokenService.revokeSpecificRefreshToken(refreshToken, tx);

      if (!tokenFound) {
        console.warn(
          `SECURITY ALERT: Unknown refresh token detected for user ${userId}. Revoking all sessions.`
        );
        await tokenService.revokeUserRefreshTokens(userId, tx);
        res.status(400).json('Invalid refresh token');
      }

      const newAccessToken = tokenService.createAccessToken(userId);
      const newRefreshToken = await tokenService.createRefreshToken(userId, tx);

      return { newAccessToken, newRefreshToken };
    });

    setRefreshTokenCookie(res, result.newRefreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: result.newAccessToken,
    });
    return;
  } catch (error) {
    console.error('Error during token refresh:', error);
    res.status(500).json({ error: 'Internal server error. Token refresh failed.' });
    return;
  }
}

export { handleRegistration, handleLogin, handleLogout, handleExpiredAccessToken };
