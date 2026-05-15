import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import adminRoutes from './routes/admin.routes';
import riderRoutes from './routes/rider.routes';
import driverRoutes from './routes/driver.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';

import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { authRateLimiter, userRateLimiter, adminRateLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();

// Security Middleware
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*';

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request ID & Logging
app.use(requestIdMiddleware);
app.use(pinoHttp({
  logger,
  genReqId: (req: any) => req.id,
  // Custom success/error messages
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed ${res.statusCode}: ${err.message}`,
}));

// Routes
// Tier 1: Auth (Strict)
app.use('/api/auth', authRateLimiter, authRoutes);

// Tier 3: Admin (High capacity)
app.use('/api/admin', adminRateLimiter, adminRoutes);

// Tier 2: Riders/Drivers/General (Standard capacity)
app.use('/api/rider', userRateLimiter, riderRoutes);
app.use('/api/driver', userRateLimiter, driverRoutes);
app.use('/api/notifications', userRateLimiter, notificationRoutes);
app.use('/api', userRateLimiter, chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: 'OK', error: null });
});

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
