import { bookingRepository } from '../repositories/BookingRepository';
import { tripRepository } from '../repositories/TripRepository';
import { BookingStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';

export class BookingService {
  static async updateBookingStatus(tripId: string, bookingId: string, status: string, driverId: string) {
    const allowedStatuses: BookingStatus[] = [BookingStatus.BOARDED, BookingStatus.NO_SHOW];
    if (!allowedStatuses.includes(status as BookingStatus)) {
      throw new AppError(`Invalid status. Allowed values for this endpoint: ${allowedStatuses.join(', ')}`, 400);
    }

    const booking = await bookingRepository.findById(bookingId);
    if (!booking || booking.tripInstanceId !== tripId) {
      throw new AppError('Booking not found or does not belong to this trip.', 404);
    }

    if (booking.status === (status as BookingStatus)) {
      return { bookingId: booking.id, status: booking.status };
    }

    return bookingRepository.updateStatus(bookingId, status as BookingStatus);
  }
}
