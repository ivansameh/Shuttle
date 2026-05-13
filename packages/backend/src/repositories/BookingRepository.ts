import { prisma } from '../lib/prisma';
import { BookingStatus } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class BookingRepository extends BaseRepository<'booking'> {
  constructor() {
    super('booking');
  }

  async findByTrip(tripId: string) {
    return this.model.findMany({
      where: {
        tripInstanceId: tripId,
      },
      select: {
        id: true,
        seatsBooked: true,
        status: true,
        user: { select: { name: true } },
        pickupStop: { select: { name: true } },
        dropoffStop: { select: { name: true } }
      },
    });
  }

  async updateStatus(bookingId: string, status: BookingStatus) {
    return this.model.update({
      where: { id: bookingId },
      data: { status },
      select: {
        id: true,
        status: true,
        seatsBooked: true,
        user: { select: { name: true } },
      },
    });
  }
}

export const bookingRepository = new BookingRepository();
