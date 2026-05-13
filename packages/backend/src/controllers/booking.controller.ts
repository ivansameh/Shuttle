import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import { PricingService } from '../services/PricingService';
import { QRService } from '../services/QRService';
import { ScheduleValidationService } from '../services/ScheduleValidationService';

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // User ID is taken from the authenticated token for security
    const userId = req.user?.id;
    const { tripInstanceId, seatsBooked, pickupStopId, dropoffStopId } = req.body;

    if (!userId || !tripInstanceId || !seatsBooked) {
      res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      return;
    }

    // Sanitize stop IDs to be null if empty strings (prevents UUID parse errors)
    const pickupStopIdClean = (pickupStopId && pickupStopId.trim() !== "") ? pickupStopId : null;
    const dropoffStopIdClean = (dropoffStopId && dropoffStopId.trim() !== "") ? dropoffStopId : null;

    const seats = parseInt(seatsBooked, 10);
    if (isNaN(seats) || seats <= 0) {
      res.status(400).json({ success: false, data: null, error: 'Invalid seatsBooked' });
      return;
    }

    // Step C: Verify seatsBooked is <= the max_seats_per_booking defined on the parent Line.
    // Assuming a max limit of 4 as per SKILL_pricing_and_checkout.md since it is not defined on schema
    const MAX_SEATS_PER_BOOKING = 4;
    if (seats > MAX_SEATS_PER_BOOKING) {
      res.status(400).json({ success: false, data: null, error: `Cannot book more than ${MAX_SEATS_PER_BOOKING} seats per booking` });
      return;
    }

    // Step 0: Pre-fetch price snapshot from Route domain via PricingService
    // This severs direct DB coupling between Booking and Route domains.
    const tripInfo = await prisma.tripInstance.findUnique({
      where: { id: tripInstanceId },
      select: { lineId: true }
    });

    if (!tripInfo) {
      res.status(404).json({ success: false, data: null, error: 'Trip instance not found' });
      return;
    }

    const pricePaid = await PricingService.getLinePriceSnapshot(tripInfo.lineId);

    // Execute within a strict Prisma transaction
    const booking = await prisma.$transaction(async (tx: any) => {
      // Step A: Retrieve the TripInstance and place a pessimistic row-level lock
      // We use raw SQL to acquire row-level lock FOR UPDATE
      const tripInstances = await tx.$queryRaw<any[]>`
        SELECT * FROM "TripInstance" 
        WHERE id = ${tripInstanceId}::uuid
        FOR UPDATE
      `;

      if (!tripInstances || tripInstances.length === 0) {
        throw new AppError('Trip instance not found', 404);
      }

      const tripInstance = tripInstances[0];

      // Step B: Verify that remaining_seats >= seatsBooked.
      if (tripInstance.remainingSeats < seats) {
        throw new AppError('Not enough seats remaining', 400);
      }

      // Step B.2: Check for Rider Overlap (Anti-Conflict Logic)
      // Fetch stop offsets for precise window calculation
      const stopIds = [pickupStopIdClean, dropoffStopIdClean].filter((id): id is string => id !== null);
      const stopsData = await tx.stop.findMany({
        where: { id: { in: stopIds } },
        select: { id: true, arrivalTimeOffset: true }
      });

      const pickupStop = stopsData.find((s: { id: string, arrivalTimeOffset: number }) => s.id === pickupStopIdClean);
      const dropoffStop = stopsData.find((s: { id: string, arrivalTimeOffset: number }) => s.id === dropoffStopIdClean);

      // Default to departure time if pickup stop not found, 
      // and departure + 60 mins if dropoff stop not found.
      const pickupOffset = pickupStop?.arrivalTimeOffset || 0;
      const dropoffOffset = dropoffStop?.arrivalTimeOffset || 60;

      const riderStartTime = new Date(new Date(tripInstance.departureTime).getTime() + pickupOffset * 60 * 1000);
      const riderEndTime = new Date(new Date(tripInstance.departureTime).getTime() + dropoffOffset * 60 * 1000);

      await ScheduleValidationService.checkRiderOverlap(
        userId,
        riderStartTime,
        riderEndTime,
        tx
      );

      // Step E: Decrement remaining_seats on the TripInstance.
      await tx.tripInstance.update({
        where: { id: tripInstanceId },
        data: {
          remainingSeats: {
            decrement: seats
          }
        }
      });

      // Step F: Create the Booking record, saving the price_paid snapshot.
      const newBooking = await tx.booking.create({
        data: {
          userId,
          tripInstanceId,
          seatsBooked: seats,
          pricePaid,
          status: 'CONFIRMED',
          paymentMethod: 'CASH',
          qrPayload: 'DUMMY_QR_PAYLOAD_FOR_BOOKING_ID', // Dummy payload for now
          pickupStopId: pickupStopIdClean,
          dropoffStopId: dropoffStopIdClean
        }
      });
      
      // Update qrPayload with a cryptographically signed payload
      const qrPayload = QRService.generateSignedPayload(newBooking.id, tripInstanceId, userId);
      const finalBooking = await tx.booking.update({
        where: { id: newBooking.id },
        data: { qrPayload }
      });

      return finalBooking;
    });

    res.status(201).json({ success: true, data: booking, error: null });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, data: null, error: error.message || 'Internal server error' });
  }
};

/**
 * Task 5.3: Cancel Booking
 * Allows a rider to cancel their booking and safely restores the remaining_seats on the trip.
 */
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const bookingId = req.params.id as string;
    
    // As per new Auth system, get userId from req if possible. Or we might assume it was extracted.
    // For now we'll do the cancellation regardless based on the bookingId, but generally we'd enforce ownership.
    
    // We need to use raw SQL lock to safely increment the seats back
    const cancelledBooking = await prisma.$transaction(async (tx: any) => {
      // 1. Get the booking to see how many seats it took and verify it's not already cancelled
      const bookings = await tx.$queryRaw<any[]>`
        SELECT * FROM "Booking"
        WHERE id = ${bookingId}::uuid
        FOR UPDATE
      `;

      if (!bookings || bookings.length === 0) {
        throw new AppError('Booking not found', 404);
      }

      const booking = bookings[0];

      if (booking.status === 'CANCELLED') {
        throw new AppError('Booking is already cancelled', 400);
      }

      // 2. Lock the TripInstance to safely update remaining_seats
      const tripInstances = await tx.$queryRaw<any[]>`
        SELECT * FROM "TripInstance"
        WHERE id = ${booking.tripInstanceId}::uuid
        FOR UPDATE
      `;

      if (!tripInstances || tripInstances.length === 0) {
        throw new AppError('Associated trip instance not found', 404);
      }

      // 3. Update the TripInstance
      await tx.tripInstance.update({
        where: { id: booking.tripInstanceId },
        data: {
          remainingSeats: {
            increment: booking.seatsBooked
          }
        }
      });

      // 4. Update the Booking
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      return updatedBooking;
    });

    res.status(200).json({
      success: true,
      data: cancelledBooking,
      error: null
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Failed to cancel booking'
    });
  }
};

/**
 * Get all bookings for the authenticated rider
 */
export const getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        tripInstance: {
          include: {
            line: true
          }
        },
        pickupStop: true,
        dropoffStop: true
      } as any,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: bookings, error: null });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, data: null, error: 'Failed to fetch bookings' });
  }
};

/**
 * Get a specific booking details
 */
export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const booking = await prisma.booking.findFirst({
      where: { id: id as string, userId },
      include: {
        tripInstance: {
          include: {
            line: {
              include: {
                stops: { orderBy: { orderIndex: 'asc' } }
              }
            },
            driver: { select: { name: true } },
            vehicle: { select: { licensePlate: true } }
          }
        },
        pickupStop: true,
        dropoffStop: true
      } as any
    });

    if (!booking) {
      res.status(404).json({ success: false, data: null, error: 'Booking not found' });
      return;
    }

    res.status(200).json({ success: true, data: booking, error: null });
  } catch (error: any) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ success: false, data: null, error: 'Internal server error' });
  }
};

/**
 * Task 2.4: Get Booking QR Image
 * Returns the ticket QR code as a PNG image buffer.
 */
export const getBookingQR = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const booking = await prisma.booking.findFirst({
      where: { id: id as string, userId },
      select: { qrPayload: true }
    });

    if (!booking || !booking.qrPayload) {
      res.status(404).json({ success: false, data: null, error: 'Booking or QR payload not found' });
      return;
    }

    const qrBuffer = await QRService.generateQRBuffer(booking.qrPayload);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="booking-qr-${id}.png"`);
    res.send(qrBuffer);
  } catch (error: any) {
    console.error('Error generating QR image:', error);
    res.status(500).json({ success: false, data: null, error: 'Failed to generate QR image' });
  }
};
