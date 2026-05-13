import { prisma } from '../lib/prisma';
import { Prisma, TripStatus } from '@prisma/client';
import { getIO } from '../socket/socket.server';
import { AppError } from '../utils/AppError';

export interface ScheduleTripDto {
  lineId: string;
  driverId?: string;
  vehicleId?: string;
  departureTime: string | Date;
}

export interface UpdateTripDto {
  driverId?: string | null;
  vehicleId?: string | null;
  departureTime?: string | Date;
}

export class TripAdminService {
  /**
   * Schedule a new TripInstance
   */
  static async scheduleTrip(dto: ScheduleTripDto) {
    const { lineId, driverId, vehicleId, departureTime } = dto;

    // Default capacity
    let capacity = 14;

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId }
      });
      if (vehicle) {
        capacity = vehicle.capacity;
      }
    }

    return await prisma.tripInstance.create({
      data: {
        lineId,
        driverId,
        vehicleId,
        departureTime: new Date(departureTime),
        totalSeats: capacity,
        remainingSeats: capacity,
      },
    });
  }

  /**
   * Re-assign a driver to a trip
   */
  static async reassignDriver(tripId: string, driverId: string) {
    return await prisma.tripInstance.update({
      where: { id: tripId },
      data: { driverId },
    });
  }

  /**
   * Update an existing TripInstance
   */
  static async updateTrip(tripId: string, dto: UpdateTripDto) {
    const { driverId, vehicleId, departureTime } = dto;
    const data: any = {};
    
    if (departureTime) data.departureTime = new Date(departureTime);
    
    if (dto.hasOwnProperty('driverId')) data.driverId = driverId;
    if (dto.hasOwnProperty('vehicleId')) {
      data.vehicleId = vehicleId;
      
      if (vehicleId) {
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle) {
          data.totalSeats = vehicle.capacity;
          
          const agg = await prisma.booking.aggregate({
            where: { 
              tripInstanceId: tripId, 
              status: { in: ['CONFIRMED', 'BOARDED', 'PENDING'] }
            },
            _sum: { seatsBooked: true }
          });
          const booked = agg?._sum?.seatsBooked || 0;
          data.remainingSeats = Math.max(0, vehicle.capacity - booked);
        }
      }
    }

    return await prisma.tripInstance.update({
      where: { id: tripId },
      data,
      include: {
        line: true,
        driver: { select: { id: true, name: true } },
        vehicle: { select: { id: true, licensePlate: true, capacity: true } }
      }
    });
  }

  /**
   * List all trips
   */
  static async getTrips() {
    return await prisma.tripInstance.findMany({
      include: {
        line: true,
        driver: { select: { id: true, name: true } },
        vehicle: { select: { id: true, licensePlate: true, capacity: true } }
      },
      orderBy: { departureTime: 'desc' }
    });
  }

  /**
   * Fetch passenger manifest for a trip
   */
  static async getTripManifest(tripId: string) {
    return await prisma.booking.findMany({
      where: { tripInstanceId: tripId },
      select: {
        id: true,
        seatsBooked: true,
        status: true,
        user: { select: { name: true, phone: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Cancel a TripInstance
   */
  static async cancelTrip(tripId: string) {
    const trip = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cancelledTrip = await tx.tripInstance.update({
        where: { id: tripId },
        data: { status: 'CANCELLED' },
      });

      await tx.booking.updateMany({
        where: { 
          tripInstanceId: tripId,
          status: { not: 'CANCELLED' }
        },
        data: { status: 'CANCELLED' },
      });

      return cancelledTrip;
    });

    // Notify via socket
    try {
      const io = getIO();
      io.to(`trip_${tripId}`).emit('trip_status_update', {
        tripId,
        status: 'CANCELLED',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[Socket] Failed to broadcast admin cancel:', err);
    }

    return trip;
  }

  /**
   * Generate TripInstances from schedules
   */
  static async generateTrips(startDate: string, endDate?: string) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    const schedules = await prisma.lineSchedule.findMany({
      include: { line: true }
    });
    
    let createdCount = 0;
    const current = new Date(start);

    while (current <= end) {
      const dateIso = current.toISOString().split('T')[0];
      const dayOfWeek = current.getUTCDay(); 
      const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

      for (const schedule of schedules) {
        if (schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(mappedDay)) {
          continue;
        }

        const departureTime = new Date(`${dateIso}T${schedule.time}:00.000Z`);
        const exists = await prisma.tripInstance.findFirst({
          where: { lineId: schedule.lineId, departureTime }
        });

        if (!exists) {
          await prisma.$transaction(async (tx) => {
            const newTrip = await tx.tripInstance.create({
              data: {
                lineId: schedule.lineId,
                departureTime,
                status: 'SCHEDULED',
                totalSeats: 14,
                remainingSeats: 14
              }
            });

            const subs = await tx.subscription.findMany({
              where: {
                lineId: schedule.lineId,
                time: schedule.time,
                isActive: true,
                daysOfWeek: { has: mappedDay }
              }
            });

            if (subs.length > 0) {
              for (const sub of subs) {
                await tx.booking.create({
                  data: {
                    userId: sub.userId,
                    tripInstanceId: newTrip.id,
                    seatsBooked: 1,
                    pricePaid: schedule.line.fixedPrice,
                    status: 'CONFIRMED',
                    qrPayload: `PASS_${sub.id}_${newTrip.id}`,
                    paymentMethod: 'CASH'
                  }
                });
              }

              await tx.tripInstance.update({
                where: { id: newTrip.id },
                data: { remainingSeats: { decrement: subs.length } }
              });
            }
            createdCount++;
          });
        }
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return { count: createdCount };
  }

  /**
   * Cancel trips in range
   */
  static async cancelTripsInRange(lineId: string, startDate: string, endDate: string, times?: string[]) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError('Invalid date format', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const where: any = {
        lineId,
        departureTime: { gte: start, lte: end },
        status: 'SCHEDULED'
      };

      const tripsToCancel = await tx.tripInstance.findMany({
        where,
        select: { id: true, departureTime: true }
      });

      let tripIds = tripsToCancel.map(t => t.id);
      
      if (times && Array.isArray(times) && times.length > 0) {
        tripIds = tripsToCancel
          .filter(t => {
            const timeStr = t.departureTime.toISOString().split('T')[1].substring(0, 5);
            return times.includes(timeStr);
          })
          .map(t => t.id);
      }

      if (tripIds.length === 0) return { count: 0, cancelledIds: [] };

      await tx.tripInstance.updateMany({
        where: { id: { in: tripIds } },
        data: { status: 'CANCELLED' }
      });

      await tx.booking.updateMany({
        where: { 
          tripInstanceId: { in: tripIds },
          status: { not: 'CANCELLED' }
        },
        data: { status: 'CANCELLED' }
      });

      return { count: tripIds.length, cancelledIds: tripIds };
    });

    // Notify via socket
    if (result.count > 0) {
      try {
        const io = getIO();
        for (const tid of (result as any).cancelledIds) {
          io.to(`trip_${tid}`).emit('trip_status_update', {
            tripId: tid,
            status: 'CANCELLED',
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('[Socket] Failed to broadcast admin batch cancel:', err);
      }
    }

    return { count: result.count };
  }
}
