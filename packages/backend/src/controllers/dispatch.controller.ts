import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getAllLivePositions, LivePosition } from '../socket/live-state.store';
import { TripStatus } from '@prisma/client';

/**
 * Task 7.4 — Admin Dispatch Feed Endpoint
 *
 * GET /api/admin/dispatch
 *
 * Returns a unified fleet snapshot for the Admin Dispatch map view.
 * This is the HTTP "seed" payload — it populates the map on first load.
 * After that, the WebSocket `trip_update` stream keeps it live.
 *
 * Response shape (per trip in the `fleet` array):
 * {
 *   tripId, status, departureTime,
 *   line:   { name },
 *   driver: { name },
 *   vehicle: { licensePlate, make, model } | null,
 *   livePosition: { lat, lng, timestamp, driverId } | null,
 *   isLive: boolean   ← true if driver is actively broadcasting
 * }
 *
 * Data sources:
 *   - Active trips (IN_PROGRESS)  → PostgreSQL
 *   - Live GPS positions           → In-memory live-state store
 *
 * The join between DB trips and in-memory positions is done in JS, not SQL,
 * to avoid any risk of stale GPS coordinates being persisted to the database.
 *
 * Query params:
 *   ?includeScheduled=true   → also return SCHEDULED trips (default: false)
 *     Useful for the Admin to see upcoming trips on the map even before they start.
 */
export const getDispatchFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const includeScheduled = req.query.includeScheduled === 'true';

    // --- 1. Determine which Trip statuses to query ---
    const statusFilter: TripStatus[] = [TripStatus.IN_PROGRESS];
    if (includeScheduled) {
      statusFilter.push(TripStatus.SCHEDULED);
    }

    // --- 2. Fetch matching trips from PostgreSQL ---
    const activeTrips = await prisma.tripInstance.findMany({
      where: {
        status: { in: statusFilter },
      },
      select: {
        id: true,
        status: true,
        departureTime: true,
        totalSeats: true,
        remainingSeats: true,
        line: {
          select: {
            name: true,
            fixedPrice: true,
            currency: true,
          },
        },
        driver: {
          select: {
            // Strict data boundary: never expose driver credentials to admin feed
            id: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            licensePlate: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: { departureTime: 'asc' },
    });

    // --- 3. Build a lookup map from the distributed store ---
    // getAllLivePositions() reads all trip_live keys from Redis.
    const livePositions = await getAllLivePositions();
    const livePositionByTripId = new Map<string, LivePosition>(
      livePositions.map((pos) => [pos.tripId, pos]),
    );

    // --- 4. Enrich each DB trip with its live position ---
    const fleet = activeTrips.map((trip) => {
      const livePosition = livePositionByTripId.get(trip.id) ?? null;

      return {
        tripId: trip.id,
        status: trip.status,
        departureTime: trip.departureTime,
        totalSeats: trip.totalSeats,
        remainingSeats: trip.remainingSeats,
        line: trip.line,
        driver: trip.driver,
        vehicle: trip.vehicle,
        livePosition,
        /**
         * isLive: true if the driver's WebSocket is connected AND has sent at
         * least one GPS ping. False means the trip is active in the DB but the
         * driver's app isn't broadcasting yet (e.g., driver just logged in).
         */
        isLive: livePosition !== null,
      };
    });

    // --- 5. Summary stats for the Admin dashboard header ---
    const summary = {
      totalActiveTrips: activeTrips.length,
      currentlyBroadcasting: fleet.filter((t) => t.isLive).length,
      silent: fleet.filter((t) => !t.isLive).length,
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        fleet,
        /**
         * socketInstructions tells the Admin UI how to bootstrap the real-time
         * layer after the initial HTTP fetch, without hardcoding event names.
         */
        socketInstructions: {
          connectWith: {
            auth: { role: 'ADMIN', userId: '<your-admin-user-id>' },
          },
          autoJoins: 'admin_dispatch',
          listenFor: 'trip_update',
          note: 'trip_update payloads contain { driverId, tripId, lat, lng, timestamp }',
        },
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[Dispatch] Error fetching dispatch feed:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to fetch dispatch feed.',
    });
  }
};
