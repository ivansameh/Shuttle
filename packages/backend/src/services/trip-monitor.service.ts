import { prisma } from '../lib/prisma';
import { TripStatus } from '@prisma/client';
import { getIO } from '../socket/socket.server';

import { EventBus, EventType, DriverLocationUpdatedEventPayload } from '../events/EventBus';
import { setLivePosition } from '../socket/live-state.store';
import { ADMIN_DISPATCH_ROOM } from '../socket/handlers/admin.handler';

/**
 * Trip Monitor Service
 * 
 * Automatically ends trips that have been active for too long but were never 
 * closed by the driver. This ensures the dispatch dashboard stays clean and 
 * riders aren't left tracked on ghost trips.
 */
export const startTripMonitor = () => {
  console.log('✅ Trip Monitor Service started (Interval: 15 mins)');

  EventBus.subscribe(EventType.DRIVER_LOCATION_UPDATED, async (payload: DriverLocationUpdatedEventPayload) => {
    const { tripId, driverId, lat, lng, timestamp } = payload;
    
    // Persist to distributed store (Redis)
    await setLivePosition({ driverId, tripId, lat, lng, timestamp });

    try {
      const io = getIO();
      const tripRoom = `trip_${tripId}`;
      const updatePayload = { tripId, driverId, lat, lng, timestamp };

      // Broadcast to the trip room (Riders tracking this trip)
      io.to(tripRoom).emit('trip_update', updatePayload);

      // Broadcast to the admin dispatch room (all Admin dashboards)
      io.to(ADMIN_DISPATCH_ROOM).emit('trip_update', updatePayload);
    } catch (err) {
      console.warn('[TripMonitor] Failed to broadcast location update:', err);
    }
  });

  EventBus.subscribe(EventType.TRIP_STATUS_UPDATED, (payload: any) => {
    try {
      const io = getIO();
      io.to(`trip_${payload.tripId}`).emit('trip_status_update', payload);
      console.log(`[TripMonitor] Broadcasted trip_status_update for trip=${payload.tripId} to ${payload.status}`);
    } catch (err) {
      console.warn('[TripMonitor] Failed to broadcast status update:', err);
    }
  });

  EventBus.subscribe(EventType.STOP_REACHED, (payload: any) => {
    try {
      const io = getIO();
      io.to(`trip_${payload.tripId}`).emit('trip_progress_update', payload);
      console.log(`[TripMonitor] Broadcasted trip_progress_update for trip=${payload.tripId}`);
    } catch (err) {
      console.warn('[TripMonitor] Failed to broadcast stop progress:', err);
    }
  });
  
  const performCleanup = async () => {
    try {
      const now = new Date();
      
      // We consider a trip "abandoned" if it's been more than 5 hours since departure
      // and is still in SCHEDULED or IN_PROGRESS state.
      const STALE_THRESHOLD_MS = 5 * 60 * 60 * 1000; 
      const staleTime = new Date(now.getTime() - STALE_THRESHOLD_MS);

      const staleTrips = await prisma.tripInstance.findMany({
        where: {
          status: { in: [TripStatus.IN_PROGRESS, TripStatus.SCHEDULED] },
          departureTime: { lt: staleTime }
        }
      });

      if (staleTrips.length === 0) return;

      console.log(`[TripMonitor] Found ${staleTrips.length} stale trips. Cleaning up...`);

      for (const trip of staleTrips) {
        await prisma.tripInstance.update({
          where: { id: trip.id },
          data: { status: TripStatus.COMPLETED }
        });

        // Broadcast the status change
        try {
          const io = getIO();
          io.to(`trip_${trip.id}`).emit('trip_status_update', {
            tripId: trip.id,
            status: TripStatus.COMPLETED,
            note: 'Automatically ended by system timeout'
          });
        } catch {}

        console.log(`[TripMonitor] ✅ Trip ${trip.id} (${trip.departureTime}) marked as COMPLETED.`);
      }
    } catch (err) {
      console.error('[TripMonitor] Critical internal error:', err);
    }
  };

  // Run immediately once on startup
  performCleanup();
  
  // Then setup the interval
  setInterval(performCleanup, 15 * 60 * 1000); 
};
