import type { Secret } from 'jsonwebtoken';
import logger from '../utils/logger.js';
if (!process.env['ACCESS_TOKEN_SECRET'] || !process.env['REFRESH_TOKEN_SECRET']) {
  logger.error(
    'FATAL ERROR: Missing access token secret and/or refresh token secret in environment variables.'
  );
  process.exit(1);
}

const authConfig = {
  bcrypt: { saltRounds: 12 }, // Takes ~150ms
  jwt: {
    accessTokenSecret: process.env['ACCESS_TOKEN_SECRET'] as Secret,
    refreshTokenSecret: process.env['REFRESH_TOKEN_SECRET'] as Secret,
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    refreshTokenExpiresInMs: 7 * 24 * 60 * 60 * 1000,
    verifyOptions: {
      clockTolerance: 15,
    },
  },
  cookies: {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    RefreshCookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    AccessCookieMaxAge: 15 * 60 * 1000, // 15 minutes
  },
} as const;

export default authConfig;
