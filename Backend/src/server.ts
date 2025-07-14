import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from './utils/logger.js';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import envCheck from './utils/envCheck.js';

try {
  envCheck();
} catch (err) {
  console.error(err);
  process.exit(1);
}

const app = express();

const client = new PrismaClient();

// CORS configuration
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing (ESSENTIAL for your auth system)
app.use(cookieParser());

// Request logging middleware
app.use(morgan('dev'));

// API routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use('/*path', (_req, res) => {
  res.status(404).json({ error: 'Route not found LOL' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await client.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await client.$disconnect();
  process.exit(0);
});

const PORT = process.env['PORT'] || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { client };
