import { Socket } from 'socket.io';

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
 * Task 7.1 — Mock Socket.IO auth middleware.
 *
 * In production this would verify a JWT from `handshake.auth.token`.
 * For the MVP, we read `handshake.auth.role` and `handshake.auth.userId`
 * directly — the same pattern as our HTTP mock middleware (x-*-secret headers).
 *
 * Called via: `io.use(socketAuthMiddleware)`.
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
): void => {
  const { role, userId } = socket.handshake.auth as {
    role?: string;
    userId?: string;
  };

  const validRoles: SocketRole[] = ['ADMIN', 'RIDER', 'DRIVER'];

  if (!userId || !role || !validRoles.includes(role as SocketRole)) {
    return next(
      new Error(
        'Authentication failed. Provide handshake.auth = { userId, role: "ADMIN"|"RIDER"|"DRIVER" }',
      ),
    );
  }

  // Attach identity to the socket so handlers can read it without re-parsing
  socket.data = {
    userId,
    role: role as SocketRole,
  } satisfies SocketData;

  console.log(`[Socket Auth] ✅ Connected: userId=${userId}, role=${role}, socketId=${socket.id}`);
  next();
};
