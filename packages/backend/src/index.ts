import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import app from './app';
import { initSocketServer } from './socket/socket.server';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * mTLS Configuration (Task 3.10)
 * In production, we require client certificates for zero-trust security.
 * In development, we use standard HTTP for convenience.
 */
let httpServer: http.Server | https.Server;

if (IS_PROD) {
  try {
    const certsDir = path.join(__dirname, '../certs');
    const options = {
      key: fs.readFileSync(path.join(certsDir, 'server.key')),
      cert: fs.readFileSync(path.join(certsDir, 'server.crt')),
      ca: fs.readFileSync(path.join(certsDir, 'ca.crt')),
      requestCert: true,
      rejectUnauthorized: true, // Enforce client certificate verification
    };
    httpServer = https.createServer(options, app);
    logger.info('🔒 mTLS HTTPS server configured for production.');
  } catch (err) {
    logger.error({ err }, '❌ Failed to load mTLS certificates. Falling back to HTTP.');
    httpServer = http.createServer(app);
  }
} else {
  httpServer = http.createServer(app);
}

// Attach Socket.IO to the server (shares the same TCP port)
initSocketServer(httpServer);

// Start background services
import { startTripMonitor } from './services/trip-monitor.service';
startTripMonitor();

httpServer.listen(PORT, () => {
  const protocol = httpServer instanceof https.Server ? 'https' : 'http';
  const wsProtocol = httpServer instanceof https.Server ? 'wss' : 'ws';
  logger.info(`🚀 Shuttle Backend running on ${protocol}://localhost:${PORT}`);
  logger.info(`⚡ Socket.IO WebSocket server ready on ${wsProtocol}://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');
  httpServer.close(() => {
    logger.info('Server closed');
  });
});
