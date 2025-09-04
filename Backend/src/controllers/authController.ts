import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { LoginInputSchema, RegistrationInputSchema } from '../../../lib/src/index.js';
import authConfig from '../config/authConfig.js';
import { client } from '../server.js';
import { clearAllAuthCookies, setAuthCookies } from '../services/CookieService.js';
import {
  createAccessToken,
  createRefreshToken,
  revokeSpecificRefreshToken,
  revokeUserRefreshTokens,
  verifyRefreshToken,
} from '../services/TokenService.js';
import logger from '../utils/logger.js';

/*
Utility function: authenticateUser
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

// ENDPOINT HANDLERS

/*
function: handleRegistration
It checks that the username is unique, hashes the password, and adds the new user to the database.
*/
async function handleRegistration(req: Request, res: Response): Promise<void> {
  const inputs = RegistrationInputSchema.safeParse(req.body);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    return;
  }

  try {
    const result = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const hashed_password: string = await bcrypt.hash(
        inputs.data.password,
        authConfig.bcrypt.saltRounds
      );

      const newUser = await tx.users.create({
        data: {
          username: inputs.data.username,
          password_hash: hashed_password,
        },
      });

      const userId = Number(newUser.id);
      const accessToken = createAccessToken(userId);
      const refreshToken = await createRefreshToken(userId, tx);

      return { accessToken, refreshToken };
    });

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(201).json({});
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      throw error;
    }
  }
}

/*
function: handleLogin
It checks the password's validity. If valid, it shows a success message.
*/
async function handleLogin(req: Request, res: Response): Promise<void> {
  const inputs = LoginInputSchema.safeParse(req.body);
  if (!inputs.success) {
    res.status(400).json({ error: inputs.error.issues });
    return;
  }

  const userId = await authenticateUser(inputs.data.username, inputs.data.password);

  if (typeof userId === 'number') {
    // If the user is authenticated successfully, create tokens
    const accessToken = createAccessToken(userId);

    const refreshToken = await client.$transaction((tx) => createRefreshToken(userId, tx));

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({});
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
}

/*
function: handleLogout
This function clears the refresh token cookie and sends a success message.
*/
async function handleLogout(req: Request, res: Response): Promise<void> {
  if (typeof req.cookies['refreshToken'] != 'string') {
    res.status(200).json({ message: 'Logout successful (no refresh token found).' });
    return;
  }

  const refreshToken: string = req.cookies['refreshToken']; // Get the refresh token from the cookie

  clearAllAuthCookies(res);

  try {
    // Verify token signature and expiry
    verifyRefreshToken(refreshToken);
  } catch {
    res.status(200).json({
      message: 'Logout successful (invalid or expired refresh token).',
    });
    return;
  }

  try {
    await client.$transaction(async (tx: Prisma.TransactionClient) => {
      await revokeSpecificRefreshToken(refreshToken, tx);
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
async function handleExpiredAccessToken(req: Request, res: Response): Promise<boolean> {
  if (typeof req.cookies['refreshToken'] != 'string') {
    res.status(200).json({ message: 'Logout successful (no refresh token found).' });
    return false;
  }

  const refreshToken: string = req.cookies['refreshToken']; // Get the refresh token from the cookie

  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(403).json({ error: 'Invalid or expired refresh token.' });
    return false;
  }

  req.userId = parseInt(payload.sub as string, 10);
  if (isNaN(req.userId)) {
    throw Error('User ID isNaN');
  }

  try {
    const refreshSuccess = await client.$transaction(async (tx: Prisma.TransactionClient) => {
      const tokenFound = await revokeSpecificRefreshToken(refreshToken, tx);

      if (!tokenFound) {
        await revokeUserRefreshTokens(req.userId, tx);
        logger.error(`User with user ID: ${req.userId.toString()} potentially compromised.`);
        return false;
      }

      const newAccessToken = createAccessToken(req.userId);
      const newRefreshToken = await createRefreshToken(req.userId, tx);

      setAuthCookies(res, newAccessToken, newRefreshToken);
      return true;
    });

    if (!refreshSuccess) {
      res.status(400).json({ error: 'Invalid refresh token' });
      return false;
    }

    return true; // Token refresh successful
  } catch (error) {
    logger.error('Token refresh transaction failed:', error);
    return false;
  }
}

export { handleExpiredAccessToken, handleLogin, handleLogout, handleRegistration };
