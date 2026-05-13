import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';

/**
 * Service responsible for enforcing strict business logic
 * to prevent overlapping trips for both Riders and Drivers.
 */
export class ScheduleValidationService {
  /**
   * Checks if a driver is available for a given time window.
   * 
   * @param driverId - The driver's UUID.
   * @param newTripStartTime - Start time of the newly proposed trip.
   * @param newTripEndTime - End time of the newly proposed trip.
   * @param tx - Optional transaction client to run this check inside a Prisma transaction.
   */
  static async checkDriverOverlap(
    driverId: string,
    newTripStartTime: Date,
    newTripEndTime: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    // Overlap Algorithm: 
    // The new trip overlaps with an existing trip IF 
    // (NewTrip.StartTime < ExistingTrip.EndTime) AND (NewTrip.EndTime > ExistingTrip.StartTime)
    const overlappingTrip = await tx.tripInstance.findFirst({
      where: {
        driverId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        // Prisma handles the overlap logic by mapping:
        // ExistingTrip.EndTime > NewTrip.StartTime  => estimatedEndTime: { gt: newTripStartTime }
        // ExistingTrip.StartTime < NewTrip.EndTime => departureTime: { lt: newTripEndTime }
        departureTime: { lt: newTripEndTime },
        ...({ estimatedEndTime: { gt: newTripStartTime } } as any), // Bypass TS error until prisma generate succeeds
      },
      select: { id: true }, // Optimization: Only return the ID to check existence
    });

    if (overlappingTrip) {
      throw new AppError(
        'Conflict: Driver is already assigned to an overlapping trip during this time window.',
        409
      );
    }
  }

  /**
   * Checks if a rider has any other trips that overlap with the proposed times.
   * 
   * @param userId - The rider's UUID.
   * @param newTripStartTime - Start time of the newly proposed trip.
   * @param newTripEndTime - End time of the newly proposed trip.
   * @param tx - Optional transaction client to run this check inside a Prisma transaction.
   */
  static async checkRiderOverlap(
    userId: string,
    newTripStartTime: Date,
    newTripEndTime: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    // Overlap Algorithm applied to the rider's bookings 
    const overlappingBooking = await tx.booking.findFirst({
      where: {
        userId,
        status: { in: ['CONFIRMED', 'BOARDED'] },
        tripInstance: {
          // ExistingTrip.StartTime < NewTrip.EndTime
          departureTime: { lt: newTripEndTime },
          // ExistingTrip.EndTime > NewTrip.StartTime
          ...({ estimatedEndTime: { gt: newTripStartTime } } as any), // Bypass TS error until prisma generate succeeds
        },
      },
      select: { id: true }, // Optimization: Only return the ID
    });

    if (overlappingBooking) {
      throw new AppError(
        'Conflict: Rider is already confirmed on an overlapping trip during this time window.',
        409
      );
    }
  }
}

/* =========================================================================
 * EXAMPLES OF INTEGRATION (As requested by the Initialization Task)
 * =========================================================================
 *
 * ---> BookingService (Injecting the validation before creating a booking)
 * 
 *  import { ScheduleValidationService } from './ScheduleValidationService';
 * 
 *  public async createBooking(userId: string, tripInstanceId: string) {
 *    return prisma.$transaction(async (tx) => {
 *      const trip = await tx.tripInstance.findUnique({ where: { id: tripInstanceId } });
 *      if (!trip) throw new AppError('Trip not found', 404);
 *      
 *      // Call validation layer - will throw 409 if overlap exists!
 *      await ScheduleValidationService.checkRiderOverlap(
 *        userId,
 *        trip.departureTime,
 *        trip.estimatedEndTime!,
 *        tx
 *      );
 *      
 *      // Proceed with booking creation...
 *      // ...
 *    });
 *  }
 * 
 * ---> TripAdminService (Injecting the validation before assigning a driver)
 * 
 *  import { ScheduleValidationService } from './ScheduleValidationService';
 * 
 *  public async scheduleTrip(driverId: string, lineId: string, startTime: Date, endTime: Date) {
 *    // Validation layer across driver's existing trips
 *    await ScheduleValidationService.checkDriverOverlap(
 *      driverId,
 *      startTime,
 *      endTime
 *    );
 * 
 *    // Once clear, create the TripInstance
 *    const trip = await prisma.tripInstance.create({
 *      data: { driverId, lineId, departureTime: startTime, estimatedEndTime: endTime }
 *    });
 *    return trip;
 *  }
 *
 * ========================================================================= */
