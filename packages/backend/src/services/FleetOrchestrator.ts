import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { EventBus, EventType } from '../events/EventBus';
import { ScheduleValidationService } from './ScheduleValidationService';

export class FleetOrchestrator {
  /**
   * Orchestrates a trip claim by a driver.
   * Ensures the driver is ACTIVE (Identity domain) and uses a pessimistic lock
   * to prevent concurrent claims (TOCTOU race).
   */
  static async claimTrip(tripId: string, driverId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Driver is ACTIVE (Identity Domain check)
      const driver = await tx.user.findUnique({
        where: { id: driverId },
        select: { status: true, isActive: true, role: true }
      });

      if (!driver || driver.role !== 'DRIVER') {
        throw new AppError('Only drivers can claim trips', 403);
      }

      if (!driver.isActive || driver.status !== 'ACTIVE') {
        throw new AppError('Your account is not active or is restricted. Cannot claim trips.', 403);
      }

      // 2. Acquire a FOR UPDATE lock on the TripInstance (Fleet Domain)
      // This prevents another driver from claiming the same trip simultaneously.
      const trips = await tx.$queryRaw<any[]>`
        SELECT id, "driverId", status, "departureTime", "estimatedEndTime"
        FROM "TripInstance" 
        WHERE id = ${tripId}::uuid 
        FOR UPDATE
      `;

      if (!trips || trips.length === 0) {
        throw new AppError('Trip instance not found', 404);
      }

      const trip = trips[0];

      if (trip.driverId) {
        throw new AppError('This trip has already been claimed by another driver', 409);
      }

      if (trip.status !== 'SCHEDULED') {
        throw new AppError('Only scheduled trips can be claimed', 400);
      }

      // 2.2 Validate Driver schedule (Anti-Conflict)
      const depTime = new Date(trip.departureTime);
      const estEndTime = trip.estimatedEndTime ? new Date(trip.estimatedEndTime) : new Date(depTime.getTime() + 60 * 60 * 1000);
      await ScheduleValidationService.checkDriverOverlap(driverId, depTime, estEndTime, tx);

      // 3. Update the TripInstance
      const updatedTrip = await tx.tripInstance.update({
        where: { id: tripId },
        data: { driverId },
        include: { line: true }
      });

      // 4. Emit DRIVER_ASSIGNED event for downstream consumers (e.g., NotificationService)
      await EventBus.publish(EventType.DRIVER_ASSIGNED, {
        tripId,
        driverId,
        lineName: updatedTrip.line.name,
        timestamp: new Date().toISOString()
      });

      return updatedTrip;
    });
  }
}
