import type { Request, Response } from 'express';
import { client } from '../server.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { JwtPayload } from 'jsonwebtoken';
import authConfig from '../config/authConfig.js';
import tokenService from '../services/TokenService.js';
import logger from '../utils/logger.js';

//UTILITY FUNCTIONS

/*
function: authenticateUser
This function checks if the provided username and password match a user in the database.
It returns the user ID if successful, or null if the user is not found or the password is incorrect.
*/
const authenticateUser = async (username: string, password: string): Promise<number | null> => {
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
}

/*
function: handleLogin
It checks the password's validity. If valid, it shows a success message.
*/
async function handleLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const userId = await authenticateUser(username, password);

  if (typeof userId === 'number') {
    // If the user is authenticated successfully

    const accessToken = tokenService.createAccessToken(userId);

    const refreshToken = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const newRefreshToken = await tokenService.createRefreshToken(userId, tx);
      return newRefreshToken;
    });

    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      message: 'Login successful',
      accessToken: accessToken,
    });
    return;
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
}

/*
function: handleLogout
This function clears the refresh token cookie and sends a success message.
*/
async function handleLogout(req: Request, res: Response): Promise<void> {
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

  try {
    // Verify token signature and expiry
    tokenService.verifyRefreshToken(refreshToken);
  } catch {
    res.status(200).json({
      message: 'Logout successful (invalid or expired refresh token).',
    });
    return;
  }

  try {
    await client.$transaction(async (tx: Prisma.TransactionClient) => {
      await tokenService.revokeSpecificRefreshToken(refreshToken, tx);
    });
  } catch (err) {
    logger.error('Token revocation failed', err);
  }

  res.status(200).json({ message: 'Logout successful' });
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

  let payload: JwtPayload;
  try {
    payload = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    res.status(403).json({ error: 'Invalid or expired refresh token.' });
    return;
  }

  const userId = parseInt(payload.sub as string, 10);

  await client.$transaction(async (tx: Prisma.TransactionClient) => {
    const tokenFound = await tokenService.revokeSpecificRefreshToken(refreshToken, tx);

    if (!tokenFound) {
      await tokenService.revokeUserRefreshTokens(userId, tx);
      res.status(400).json({ error: 'Invalid refresh token' });
      logger.error(`User with user ID: ${userId} potentially compromised.`)
    } else {
      const newAccessToken = tokenService.createAccessToken(userId);
      const newRefreshToken = await tokenService.createRefreshToken(userId, tx);

      setRefreshTokenCookie(res, newRefreshToken);

      res.status(200).json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
      });
    }
  });
}

export { handleRegistration, handleLogin, handleLogout, handleExpiredAccessToken };
