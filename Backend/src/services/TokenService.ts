import jwt from 'jsonwebtoken';
import type { SignOptions, JwtPayload } from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import jwtConfig from '../config/jwtConfig.js';
import logger from '../utils/logger.js';

class TokenService {
  async createRefreshToken(userId: number, tx: Prisma.TransactionClient): Promise<string> {
    const random_jti = randomUUID();
    const payload = {
      sub: userId,
      jti: random_jti,
    };
    const options: SignOptions = {
      expiresIn: jwtConfig.refreshTokenExpiresIn,
    };
    const refreshToken = jwt.sign(payload, jwtConfig.refreshTokenSecret, options);

    const expiresAt = new Date(Date.now() + jwtConfig.refreshTokenExpiresInMs); // 7 days from now

    await tx.refresh_tokens.create({
      data: {
        jti: random_jti,
        user_id: BigInt(userId),
        expires_at: expiresAt,
      },
    });

    return refreshToken;
  }

  createAccessToken(userId: number): string {
    const payload = {
      sub: userId,
    };
    const options: SignOptions = { expiresIn: jwtConfig.accessTokenExpiresIn };
    return jwt.sign(payload, jwtConfig.accessTokenSecret, options);
  }

  verifyAccessToken(accessToken: string): JwtPayload {
    return jwt.verify(
      accessToken,
      jwtConfig.accessTokenSecret,
      jwtConfig.verifyOptions
    ) as JwtPayload;
  }

  verifyRefreshToken(refreshToken: string): JwtPayload {
    return jwt.verify(
      refreshToken,
      jwtConfig.refreshTokenSecret,
      jwtConfig.verifyOptions
    ) as JwtPayload;
  }

  /**
   * Revokes all refresh tokens for a specific user
   */
  async revokeUserRefreshTokens(userId: number, tx: Prisma.TransactionClient): Promise<void> {
    await tx.refresh_tokens.deleteMany({
      where: { user_id: BigInt(userId) },
    });
  }

  async revokeSpecificRefreshToken(
    refreshToken: string,
    tx: Prisma.TransactionClient
  ): Promise<boolean> {
    const payload = jwt.verify(refreshToken, jwtConfig.refreshTokenSecret, {
      ignoreExpiration: true,
    }) as JwtPayload;

    if (!payload.jti) {
      console.error('Cannot delete token as jti is undefined.');
    }
    const payload_jti: string = payload.jti!;

    try {
      await tx.refresh_tokens.delete({
        where: {
          jti: payload_jti,
        },
      });
      return true;
    } catch (error){
      if (error instanceof Error && 'code' in error) {
        if (error.code !== 'P2025') //Getting P2025 would mean record not found, which is a sign of refresh token reuse.
          logger.error(error);
      }
      return false;
    }
  }
}

export default new TokenService();
