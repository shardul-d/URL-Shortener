import jwt from 'jsonwebtoken';
import type { SignOptions, JwtPayload } from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { randomBytes } from 'crypto';
import jwtConfig from '../config/jwtConfig.js';
class TokenService {
  async createRefreshToken(userId: number, client: PoolClient): Promise<string> {
    const jti = randomBytes(32).toString('hex');
    const payload = {
      sub: userId,
      jti: jti,
    };
    const options: SignOptions = {
      expiresIn: jwtConfig.refreshTokenExpiresIn,
    };
    const refreshToken = jwt.sign(payload, jwtConfig.refreshTokenSecret, options);

    const expiresAt = new Date(Date.now() + jwtConfig.refreshTokenExpiresInMs); // 7 days from now

    await client.query('INSERT INTO refresh_tokens(jti, user_id, expires_at) VALUES ($1, $2, $3)', [
      jti,
      userId,
      expiresAt,
    ]);

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
    return jwt.verify(accessToken, jwtConfig.accessTokenSecret, jwtConfig.verifyOptions) as JwtPayload;
  }

  verifyRefreshToken(refreshToken: string): JwtPayload {
    return jwt.verify(refreshToken, jwtConfig.refreshTokenSecret, jwtConfig.verifyOptions) as JwtPayload;
  }

  /**
   * Revokes all refresh tokens for a specific user
   */
  async revokeUserRefreshTokens(userId: number, client: PoolClient): Promise<boolean> {
    const result = await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    return result.rowCount != null && result.rowCount > 0;
  }

  async revokeSpecificRefreshToken(refreshToken: string, client: PoolClient): Promise<boolean> {
    const payload = jwt.decode(refreshToken) as JwtPayload | null;

    if (!payload || !payload.jti) return false;

    const jti = payload.jti;

    const result = await client.query('DELETE FROM refresh_tokens WHERE jti = $1', [jti]);
    return result.rowCount != null && result.rowCount > 0;
  }
}

export default new TokenService();
