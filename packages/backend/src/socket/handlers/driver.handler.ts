import { Socket, Server } from 'socket.io';
import { SocketData } from '../auth.middleware';
import { clearLivePosition } from '../live-state.store';
import { EventBus, EventType } from '../../events/EventBus';

/**
 * Shape of the location_ping payload sent by the Driver App.
 * Throttle requirement: The client MUST emit at most once every 3-5 seconds
 * (enforced client-side in the Driver App's Expo background task).
 */
interface LocationPingPayload {
  tripId: string;
  lat: number;
  lng: number;
  /** ISO 8601 timestamp from the client, used for ordering on the receiver side. */
  timestamp: string;
}

/**
 * Shape of the trip_update event broadcast to Riders and Admin.
 */
interface TripUpdatePayload extends LocationPingPayload {
  driverId: string;
}

/**
 * Task 7.1 / 7.2 — Driver socket handler.
 *
 * Event flow:
 * 1. Driver emits `start_driving` → server joins driver to `trip_{tripId}`.
 * 2. Driver emits `location_ping` → server broadcasts `trip_update` to:
 *    - `trip_{tripId}` (subscribed Riders)
 *    - `admin_dispatch`  (Admin Dispatch view)
 *
 * ⚠️  GPS pings are NEVER written to PostgreSQL here.
 *     The WebSocket layer is a pure in-memory relay for real-time perf.
 *     The only DB write for location happens via the REST PATCH
 *     /api/driver/trips/:tripId/status endpoint on lifecycle changes.
 */
export const registerDriverHandlers = (io: Server, socket: Socket): void => {
  const { userId } = socket.data as SocketData;

  socket.emit('connected', {
    message: 'Driver connected. Emit start_driving with { tripId } to begin broadcasting.',
  });

  /**
   * start_driving
   * Payload: { tripId: string }
   *
   * Joins the driver to their trip room so they can both receive and emit
   * within the scope of that trip. The driver also stays in this room so
   * riders who subscribe later immediately start receiving pings.
   */
  socket.on('start_driving', (payload: { tripId?: string }) => {
    const { tripId } = payload ?? {};

    if (!tripId || typeof tripId !== 'string') {
      socket.emit('error', {
        event: 'start_driving',
        message: 'Invalid payload. Expected { tripId: string }.',
      });
      return;
    }

    // Leave previous trip room if the driver switches trips mid-session
    if ((socket.data as SocketData).activeTripId) {
      const prevRoom = `trip_${(socket.data as SocketData).activeTripId}`;
      socket.leave(prevRoom);
      console.log(`[Driver] userId=${userId} left previous room '${prevRoom}'`);
    }

    const room = `trip_${tripId}`;
    socket.join(room);
    (socket.data as SocketData).activeTripId = tripId;

    console.log(`[Driver] userId=${userId} joined trip room '${room}'`);
    socket.emit('driving_started', { room, tripId });
  });

  /**
   * location_ping
   * Payload: { tripId, lat, lng, timestamp }
   *
   * The core GPS relay. Broadcasts trip_update to:
   *   a) trip_{tripId} — so all subscribed Riders see the bus moving.
   *   b) admin_dispatch — so the Admin Dispatch map tracks all fleet vehicles.
   *
   * Uses `io.to()` (server-side emit) rather than `socket.broadcast.to()` so
   * the admin room receives it independently of the trip room membership.
   * The driver's own socket does NOT need to receive their own ping back.
   */
  socket.on('location_ping', (payload: Partial<LocationPingPayload>) => {
    const { tripId, lat, lng, timestamp } = payload;

    // --- Payload validation ---
    if (
      !tripId ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !timestamp
    ) {
      socket.emit('error', {
        event: 'location_ping',
        message: 'Invalid payload. Expected { tripId: string, lat: number, lng: number, timestamp: string }.',
      });
      return;
    }

    // Sanity-check the driver is in the correct room before broadcasting.
    // This prevents a rogue location_ping from a driver who hasn't called start_driving.
    const activeTripId = (socket.data as SocketData).activeTripId;
    if (activeTripId !== tripId) {
      socket.emit('error', {
        event: 'location_ping',
        message: `Trip mismatch. You are driving trip '${activeTripId}', not '${tripId}'. Emit start_driving first.`,
      });
      return;
    }

    const tripRoom = `trip_${tripId}`;

    const updatePayload: TripUpdatePayload = {
      driverId: userId,
      tripId,
      lat,
      lng,
      timestamp,
    };

    // Trigger the EventBus. The TripMonitor will handle updating the live-state
    // store and broadcasting via Socket.IO to the relevant rooms.
    EventBus.publish(EventType.DRIVER_LOCATION_UPDATED, {
      driverId: updatePayload.driverId,
      tripId: updatePayload.tripId,
      lat: updatePayload.lat,
      lng: updatePayload.lng,
      timestamp: updatePayload.timestamp
    });

    console.log(
      `[Driver GPS] userId=${userId} → trip='${tripId}' lat=${lat} lng=${lng}`,
    );
  });

  // --- Disconnection ---
  socket.on('disconnect', (reason) => {
    const activeTripId = (socket.data as SocketData).activeTripId;

    // Remove the stale live position from the in-memory store so that
    // the /tracking and /dispatch REST endpoints don't return ghost positions
    // for a bus that is no longer actively broadcasting.
    if (activeTripId) {
      clearLivePosition(activeTripId);
    }

    // socket.io automatically handles room cleanup. We log for observability
    // and so that future alerting/monitoring can hook into this event.
    console.log(
      `[Driver] userId=${userId} disconnected (reason: ${reason}).` +
        (activeTripId
          ? ` Was broadcasting trip '${activeTripId}'. Live position cleared.`
          : ''),
    );

    // Note: No explicit socket.leave() needed — socket.io performs this
    // atomically during the disconnect lifecycle, preventing memory leaks.
  });
};
