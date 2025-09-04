import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { handleRedirect } from './controllers/redirectController.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import linkRoutes from './routes/linkRoutes.js';
import GeoService from './services/GeolocationService.js';
import envCheck from './utils/envCheck.js';
import logger from './utils/logger.js';

try {
  envCheck();
} catch (err) {
  logger.error(err);
  process.exit(1);
}

const app = express();

const client = new PrismaClient();

const geoService = new GeoService();
await geoService.initialize();

// CORS configuration
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(morgan('dev')); 

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/:short_url', handleRedirect);

// 404 handler
app.use('/*path', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

function handleGracefulShutdown() {
  client
    .$disconnect()
    .then(() => {
      console.log('Database disconnected gracefully');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error('Error disconnecting from database:', error);
      process.exit(1);
    });
}

process.on('SIGTERM', () => handleGracefulShutdown());
process.on('SIGINT', () => handleGracefulShutdown());

const PORT = process.env['PORT'] || '3000';
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { client, geoService };
