import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import app from './app';
import { initSocketServer } from './socket/socket.server';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const REQUIRE_HTTPS = process.env.REQUIRE_HTTPS === 'true';

/**
 * mTLS Configuration
 */
let httpServer: http.Server | https.Server;

if (REQUIRE_HTTPS) {
  try {
    const certsDir = path.join(__dirname, '../certs');
    const options = {
      key: fs.readFileSync(path.join(certsDir, 'server.key')),
      cert: fs.readFileSync(path.join(certsDir, 'server.crt')),
      ca: fs.readFileSync(path.join(certsDir, 'ca.crt')),
      requestCert: process.env.ENABLE_MTLS === 'true',
      rejectUnauthorized: process.env.ENABLE_MTLS === 'true', 
    };
    httpServer = https.createServer(options, app);
    logger.info(`🔒 HTTPS server configured (mTLS: ${process.env.ENABLE_MTLS === 'true'}).`);
  } catch (err) {
    logger.error({ err }, '❌ Failed to load certificates. Falling back to HTTP.');
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

// Bind to 0.0.0.0 for Docker compatibility
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  const protocol = httpServer instanceof https.Server ? 'https' : 'http';
  const wsProtocol = httpServer instanceof https.Server ? 'wss' : 'ws';
  logger.info(`🚀 Shuttle Backend running on ${protocol}://0.0.0.0:${PORT}`);
  logger.info(`⚡ Socket.IO WebSocket server ready on ${wsProtocol}://0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing server');
  httpServer.close(() => {
    logger.info('Server closed');
  });
});
