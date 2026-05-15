import { Socket } from 'socket.io';
import { AuthService } from '../lib/auth.service';
import { logger } from '../lib/logger';

/**
 * Valid roles that can connect to the WebSocket server.
 */
export type SocketRole = 'ADMIN' | 'RIDER' | 'DRIVER';

/**
 * Shape of the data we attach to each authenticated socket.
 * Accessible inside any handler via `socket.data`.
 */
export interface SocketData {
  userId: string;
  role: SocketRole;
  /** The tripId the socket is currently active in (set after joining a room). */
  activeTripId?: string;
}

/**
 * Socket.IO auth middleware.
 * Verifies the JWT from `handshake.auth.token`.
 * Called via: `io.use(socketAuthMiddleware)`.
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  const { token } = socket.handshake.auth as { token?: string };

  if (!token) {
    return next(new Error('Authentication failed. No token provided in handshake.auth.token'));
  }

  try {
    const decoded = AuthService.verifyToken(token);
    
    const validRoles: SocketRole[] = ['ADMIN', 'RIDER', 'DRIVER'];
    if (!validRoles.includes(decoded.role as SocketRole)) {
      return next(new Error(`Authentication failed. Invalid role: ${decoded.role}`));
    }

    // Attach identity to the socket so handlers can read it without re-parsing
    socket.data = {
      userId: decoded.id,
      role: decoded.role as SocketRole,
    } satisfies SocketData;

    logger.info({ userId: decoded.id, role: decoded.role, socketId: socket.id }, '[Socket Auth] ✅ Connected');
    next();
  } catch (error) {
    logger.warn({ socketId: socket.id, error: (error as Error).message }, '[Socket Auth] ❌ Forbidden');
    next(new Error('Authentication failed. Invalid or expired token.'));
  }
};
