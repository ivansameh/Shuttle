import { Socket, Server } from 'socket.io';
import { SocketData } from '../auth.middleware';

/**
 * The single global room that all Admin sockets join immediately upon connection.
 * Every driver's location_ping is broadcast here so the Admin Dispatch view
 * receives real-time fleet movement without subscribing to individual trips.
 */
export const ADMIN_DISPATCH_ROOM = 'admin_dispatch';

/**
 * Task 7.1 — Admin socket handler.
 *
 * On connection, automatically places the admin into the admin_dispatch room.
 * No client-initiated subscription event is needed — Admins see everything.
 */
export const registerAdminHandlers = (io: Server, socket: Socket): void => {
  const { userId } = socket.data as SocketData;

  // Auto-join the global dispatch room immediately
  socket.join(ADMIN_DISPATCH_ROOM);
  console.log(`[Admin] userId=${userId} joined room '${ADMIN_DISPATCH_ROOM}'`);

  // Notify the admin their connection was acknowledged
  socket.emit('connected', {
    message: 'Admin connected to dispatch feed.',
    room: ADMIN_DISPATCH_ROOM,
  });

  // --- Disconnection ---
  socket.on('disconnect', (reason) => {
    // socket.io automatically removes the socket from all rooms on disconnect,
    // but we log it explicitly for observability.
    console.log(
      `[Admin] userId=${userId} disconnected (reason: ${reason}). Removed from '${ADMIN_DISPATCH_ROOM}'.`,
    );
  });
};
