import { tripRepository } from '../repositories/TripRepository';
import { bookingRepository } from '../repositories/BookingRepository';
import { TripStatus } from '@prisma/client';
import { EventBus, EventType } from '../events/EventBus';
import { AppError } from '../utils/AppError';
import { TransactionService } from './TransactionService';

export class TripService {
  static async getSchedule(driverId: string) {
    const startOfRange = new Date();
    startOfRange.setDate(startOfRange.getDate() - 5);
    startOfRange.setHours(0, 0, 0, 0);

    const endOfRange = new Date();
    endOfRange.setDate(endOfRange.getDate() + 5);
    endOfRange.setHours(23, 59, 59, 999);

    return tripRepository.getSchedule(driverId, startOfRange, endOfRange);
  }

  static async getTripManifest(tripId: string, driverId: string) {
    const bookings = await bookingRepository.findByTrip(tripId);
    const tripDetails = await tripRepository.getTripManifestDetails(tripId);

    return { trip: tripDetails, bookings };
  }

  static async updateTripStatus(tripId: string, status: string, driverId: string) {
    if (!Object.values(TripStatus).includes(status as any)) {
      throw new AppError(`Invalid status. Must be one of: ${Object.values(TripStatus).join(', ')}`, 400);
    }

    const updatedTrip = await tripRepository.updateStatus(tripId, status as TripStatus);

    // If trip is completed, process financials
    if (updatedTrip.status === TripStatus.COMPLETED) {
      // Run in background or wait? Wait is safer for consistency here.
      await TransactionService.processCompletedTrip(tripId);
    }

    EventBus.publish(EventType.TRIP_STATUS_UPDATED, {
      tripId,
      status: updatedTrip.status,
      timestamp: new Date().toISOString()
    });

    return updatedTrip;
  }


  static async markStopAsReached(tripId: string, stopId: string, driverId: string) {
    const updated = await tripRepository.appendCompletedStop(tripId, stopId);

    EventBus.publish(EventType.STOP_REACHED, {
      tripId,
      completedStopIds: updated.completedStopIds
    });

    return updated;
  }

  static async getAvailableTrips() {
    return tripRepository.getAvailableTrips();
  }
}
