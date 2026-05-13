import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware, SocketData } from './auth.middleware';
import { registerAdminHandlers } from './handlers/admin.handler';
import { registerDriverHandlers } from './handlers/driver.handler';
import { registerRiderHandlers } from './handlers/rider.handler';
import { registerChatHandlers } from './handlers/chat.handler';

/**
 * Task 7.1 — Initializes and attaches the Socket.IO server to the Node.js
 * HTTP server created in index.ts.
 *
 * Design rationale:
 * - A factory function (not a singleton) keeps this testable and avoids
 *   circular import issues.
 * - CORS is configured to match the Express app's policy. In production,
 *   replace the wildcard origin with the specific frontend domain.
 * - All event handler registration is delegated to role-specific handler
 *   modules so this file stays clean and easy to extend (Task 7.3, 7.4).
 *
 * @param httpServer - The native Node.js http.Server instance.
 * @returns The configured Socket.IO Server instance (exported for testing).
 */
export let ioInstance: Server | null = null;

export const getIO = (): Server => {
  if (!ioInstance) {
    throw new Error('Socket.io server is not initialized yet.');
  }
  return ioInstance;
};

export const initSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // TODO: Lock down to specific origins in production
      methods: ['GET', 'POST'],
    },
    // Reconnect transports: WebSocket first, fall back to long-polling.
    // This ensures the Driver App's offline sync reconnects quickly.
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // --- Auth middleware (runs before connection event) ---
  io.use(socketAuthMiddleware);

  // --- Role-based connection routing ---
  io.on('connection', (socket: Socket) => {
    const { role, userId } = socket.data as SocketData;

    // Join a personal room for targeted events like notifications
    socket.join(`user_${userId}`);

    // Register cross-role chat handlers
    registerChatHandlers(io, socket);

    switch (role) {
      case 'ADMIN':
        registerAdminHandlers(io, socket);
        break;

      case 'DRIVER':
        registerDriverHandlers(io, socket);
        break;

      case 'RIDER':
        registerRiderHandlers(io, socket);
        break;

      default:
        // Unreachable — auth middleware already validated role.
        // Defensive close in case the middleware is bypassed in tests.
        console.warn(`[Socket] Unknown role '${role}'. Disconnecting socketId=${socket.id}`);
        socket.disconnect(true);
    }
  });

  console.log('[Socket.IO] Server initialized and attached to HTTP server.');
  return io;
};
