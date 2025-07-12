import 'dotenv/config';
import type { Secret } from 'jsonwebtoken';

if (!process.env['ACCESS_TOKEN_SECRET'] || !process.env['REFRESH_TOKEN_SECRET']) {
  console.error(
    'FATAL ERROR: Missing access token secret and/or refresh token secret in environment variables.'
  );
  process.exit(1);
}

const jwtConfig = {
  accessTokenSecret: process.env['ACCESS_TOKEN_SECRET'] as Secret,
  refreshTokenSecret: process.env['REFRESH_TOKEN_SECRET'] as Secret,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  refreshTokenExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  verifyOptions: {
    clockTolerance: 15,
  },
} as const;

export default jwtConfig;