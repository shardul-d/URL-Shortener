function validateEnvironmentVariables(): void{
  const requiredVariables = [
    'DATABASE_URL',
    'PORT',
    'NODE_ENV',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
    'LOG_LEVEL',
  ];

  const missing = requiredVariables.filter((variable) => !process.env[variable]);

  if (missing.length > 0) {
    const missingVars: string = 'Missing environment variables:' + missing.join(', ');
    throw Error(missingVars);
  }
}

export default validateEnvironmentVariables;
