import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { handleExpiredAccessToken } from '../controllers/authController.js';
import { verifyAccessToken } from '../services/TokenService.js';

const authenticateAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (typeof req.cookies['accessToken'] != 'string') {
      res.status(401).json({ error: 'No access token provided' });
      return;
    }
    const accessToken: string = req.cookies['accessToken'];

    const payload = verifyAccessToken(accessToken);
    req.userId = parseInt(payload.sub as string, 10);
    if (isNaN(req.userId)) {
      throw Error('User ID isNaN');
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      const tokenRefreshSuccessful = await handleExpiredAccessToken(req, res);
      if (tokenRefreshSuccessful) {
        next();
      } else {
        res.status(401).json({ message: 'Expired access token and invalid refresh token.' });
      }
    } else {
      throw error;
    }
  }
};

export default authenticateAccessToken;
