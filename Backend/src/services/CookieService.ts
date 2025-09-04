import type { Response } from 'express';
import authConfig from '../config/authConfig.js';

const COOKIE_OPTIONS = {
  httpOnly: authConfig.cookies.httpOnly,
  secure: authConfig.cookies.secure,
  sameSite: authConfig.cookies.sameSite as 'strict' | 'lax' | 'none',
};

const ACCESS_TOKEN_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: authConfig.cookies.AccessCookieMaxAge, // 15 minutes
};

const REFRESH_TOKEN_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: authConfig.cookies.RefreshCookieMaxAge, // 7 days
};

export function setAccessToken(res: Response, token: string): void {
  res.cookie('accessToken', token, ACCESS_TOKEN_OPTIONS);
}

export function setRefreshToken(res: Response, token: string): void {
  res.cookie('refreshToken', token, REFRESH_TOKEN_OPTIONS);
}

export function clearAccessToken(res: Response): void {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
}

export function clearRefreshToken(res: Response): void {
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
}

export function clearAllAuthCookies(res: Response): void {
  clearAccessToken(res);
  clearRefreshToken(res);
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  setAccessToken(res, accessToken);
  setRefreshToken(res, refreshToken);
}
