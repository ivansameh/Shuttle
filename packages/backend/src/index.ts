import http from 'http';
import app from './app';
import { initSocketServer } from './socket/socket.server';

const PORT = process.env.PORT || 3001;

/**
 * We use a native http.Server (instead of app.listen) so that
 * Socket.IO can share the same port as Express — both handle
 * requests on the same TCP listener. Socket.IO upgrades HTTP
 * connections to WebSocket internally.
 */
const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server (Task 7.1)
initSocketServer(httpServer);

// Start background services
import { startTripMonitor } from './services/trip-monitor.service';
startTripMonitor();

httpServer.listen(PORT, () => {
  console.log(`🚀 Shuttle Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO WebSocket server ready on ws://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});
