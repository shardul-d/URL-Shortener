import express from 'express';
// import type { Request, Response } from 'express';
// import type { QueryResult, PoolClient } from 'pg';
// import pool from './database/index.js';
// import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import cookieParser from 'cookie-parser';
// import type { SignOptions } from 'jsonwebtoken';

function validateEnvironmentVariables(): void {
  const requiredVariables = [
    'CONNECTIONSTRING',
    'PORT',
    'NODE_ENV',
    'ACCESS_TOKEN_SECRET',
    'REFRESH_TOKEN_SECRET',
  ];

  const missing = requiredVariables.filter((variable) => !process.env[variable]);

  if (missing.length > 0) {
    console.error('Missing environment variables:', missing.join(', '));
    process.exit(1); // Exit the process with an error code
  }
}

validateEnvironmentVariables();

const app = express();

app.use(express.json());
