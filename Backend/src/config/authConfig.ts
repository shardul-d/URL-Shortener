const authConfig = {
  bcrypt: { saltRounds: 12 },
  jwt: {
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
  },
  cookies: {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
} as const;

export default authConfig;
