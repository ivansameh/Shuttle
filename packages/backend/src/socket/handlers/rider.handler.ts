import { Socket, Server } from 'socket.io';
import { SocketData } from '../auth.middleware';

/**
 * Task 7.1 — Rider socket handler.
 *
 * Riders are NOT auto-joined to a trip room. They must emit a `subscribe_trip`
 * event with a { tripId } payload to start receiving live location updates.
 * This allows riders to only listen to the one trip they booked.
 */
export const registerRiderHandlers = (io: Server, socket: Socket): void => {
  const { userId } = socket.data as SocketData;

  socket.emit('connected', {
    message: 'Rider connected. Emit subscribe_trip with { tripId } to start tracking.',
  });

  /**
   * subscribe_trip
   * Payload: { tripId: string }
   *
   * Joins the rider to the room `trip_{tripId}` so they receive `trip_update`
   * events emitted by the driver's GPS heartbeat.
   */
  socket.on('subscribe_trip', (payload: { tripId?: string }) => {
    const { tripId } = payload ?? {};

    if (!tripId || typeof tripId !== 'string') {
      socket.emit('error', {
        event: 'subscribe_trip',
        message: 'Invalid payload. Expected { tripId: string }.',
      });
      return;
    }

    const room = `trip_${tripId}`;

    // Leave any previously subscribed trip room first (a rider can only track
    // one trip at a time — avoids stale room memberships on re-subscribe).
    if ((socket.data as SocketData).activeTripId) {
      const prevRoom = `trip_${(socket.data as SocketData).activeTripId}`;
      socket.leave(prevRoom);
      console.log(`[Rider] userId=${userId} left previous room '${prevRoom}'`);
    }

    socket.join(room);
    (socket.data as SocketData).activeTripId = tripId;

    console.log(`[Rider] userId=${userId} subscribed to room '${room}'`);
    socket.emit('subscribed', { room, tripId });
  });

  // --- Disconnection ---
  socket.on('disconnect', (reason) => {
    const activeTripId = (socket.data as SocketData).activeTripId;
    // socket.io auto-cleans rooms, we just log for observability
    console.log(
      `[Rider] userId=${userId} disconnected (reason: ${reason}).` +
        (activeTripId ? ` Was subscribed to trip '${activeTripId}'.` : ''),
    );
  });
};
