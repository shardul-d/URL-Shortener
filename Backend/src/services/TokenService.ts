import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import authConfig from '../config/authConfig.js';
import logger from '../utils/logger.js';

async function createRefreshToken(userId: number, tx: Prisma.TransactionClient): Promise<string> {
  const random_jti = randomUUID();
  const payload = {
    sub: userId,
    jti: random_jti,
  };
  const options: SignOptions = {
    expiresIn: authConfig.jwt.refreshTokenExpiresIn,
  };
  const refreshToken = jwt.sign(payload, authConfig.jwt.refreshTokenSecret, options);

  const expiresAt = new Date(Date.now() + authConfig.jwt.refreshTokenExpiresInMs); // 7 days from now

  await tx.refresh_tokens.create({
    data: {
      jti: random_jti,
      user_id: BigInt(userId),
      expires_at: expiresAt,
    },
  });

  return refreshToken;
}

function createAccessToken(userId: number): string {
  const payload = {
    sub: userId,
  };
  const options: SignOptions = { expiresIn: authConfig.jwt.accessTokenExpiresIn };
  return jwt.sign(payload, authConfig.jwt.accessTokenSecret, options);
}

function verifyAccessToken(accessToken: string): JwtPayload {
  return jwt.verify(
    accessToken,
    authConfig.jwt.accessTokenSecret,
    authConfig.jwt.verifyOptions
  ) as JwtPayload;
}

function verifyRefreshToken(refreshToken: string): JwtPayload {
  return jwt.verify(
    refreshToken,
    authConfig.jwt.refreshTokenSecret,
    authConfig.jwt.verifyOptions
  ) as JwtPayload;
}

/**
 * Revokes all refresh tokens for a specific user
 */
async function revokeUserRefreshTokens(
  userId: number,
  tx: Prisma.TransactionClient
): Promise<void> {
  await tx.refresh_tokens.deleteMany({
    where: { user_id: BigInt(userId) },
  });
}

async function revokeSpecificRefreshToken(
  refreshToken: string,
  tx: Prisma.TransactionClient
): Promise<boolean> {
  const payload = jwt.verify(refreshToken, authConfig.jwt.refreshTokenSecret, {
    ignoreExpiration: true,
  }) as JwtPayload;

  if (typeof payload.jti != 'string') {
    logger.error('Cannot delete token as jti is undefined.');
    return false;
  }

  try {
    await tx.refresh_tokens.delete({
      where: {
        jti: payload.jti,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code !== 'P2025')
        //Getting P2025 would mean record not found, which is a sign of refresh token reuse.
        logger.error(error);
    }
    return false;
  }
}

export {
  createAccessToken,
  createRefreshToken,
  revokeSpecificRefreshToken,
  revokeUserRefreshTokens,
  verifyAccessToken,
  verifyRefreshToken,
};
