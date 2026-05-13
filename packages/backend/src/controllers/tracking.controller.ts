import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getLivePosition } from '../socket/live-state.store';

/**
 * Task 7.3 — Rider Trip Tracking Endpoint
 *
 * GET /api/rider/trips/:tripId/tracking
 *
 * Provides the initial state payload a Rider needs to render the tracking screen
 * the moment it loads — before the WebSocket stream delivers the first ping.
 *
 * Response shape:
 * {
 *   trip: { id, status, departureTime, line: { name }, driver: { name } },
 *   livePosition: { lat, lng, timestamp, driverId } | null,
 *   socketInstructions: { ... }   ← tells the client how to subscribe
 * }
 *
 * Data sources:
 *   - `trip` metadata → PostgreSQL (authoritative, cached by the app layer)
 *   - `livePosition`  → In-memory live-state store (zero DB cost, written by
 *                        the driver WebSocket handler on each location_ping)
 *
 * Security: Only the rider who owns a booking for this trip should call this.
 * For the MVP mock auth we verify the trip exists and is accessible; full
 * ownership validation will be added with real JWT auth in Phase 2.
 */
export const getTripTracking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tripId } = req.params as { tripId: string };

    // --- 1. Fetch trip metadata from the DB ---
    const trip = await prisma.tripInstance.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        departureTime: true,
        remainingSeats: true,
        totalSeats: true,
        line: {
          select: {
            id: true,
            name: true,
            fixedPrice: true,
            currency: true,
            stops: {
              orderBy: { orderIndex: 'asc' }
            }
          },
        },
        driver: {
          select: {
            // Only expose the driver's name — never their password hash or email
            name: true,
          },
        },
      },
    });

    if (!trip) {
      res.status(404).json({
        success: false,
        data: null,
        error: 'Trip not found.',
      });
      return;
    }

    // --- 2. Read the last known driver position from the in-memory store ---
    // Returns undefined if the driver hasn't started broadcasting yet
    // (e.g., trip is SCHEDULED and the driver hasn't connected).
    const livePosition = getLivePosition(tripId) ?? null;

    // --- 3. Build response ---
    res.status(200).json({
      success: true,
      data: {
        trip,
        livePosition,
        /**
         * socketInstructions tells the Rider App exactly how to connect to the
         * WebSocket and which event to emit so it can self-bootstrap without
         * hardcoding event names in the mobile app.
         */
        socketInstructions: {
          connectWith: {
            auth: { role: 'RIDER', userId: '<your-user-id>' },
          },
          thenEmit: {
            event: 'subscribe_trip',
            payload: { tripId },
          },
          listenFor: 'trip_update',
        },
      },
      error: null,
    });
  } catch (error: any) {
    console.error('[Tracking] Error fetching trip tracking data:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to fetch tracking data.',
    });
  }
};
