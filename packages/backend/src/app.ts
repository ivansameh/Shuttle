import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/admin.routes';
import riderRoutes from './routes/rider.routes';
import driverRoutes from './routes/driver.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', chatRoutes);

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

export default app;
