import { prisma } from '../lib/prisma';
import { TripStatus } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class TripRepository extends BaseRepository<'tripInstance'> {
  constructor() {
    super('tripInstance');
  }

  // Abstracted into BaseRepository: getById -> findById, update -> update
  
  async getSchedule(driverId: string, startOfRange: Date, endOfRange: Date) {
    return this.model.findMany({
      where: {
        driverId,
        departureTime: {
          gte: startOfRange,
          lte: endOfRange,
        },
      },
      include: {
        line: {
          include: {
            stops: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });
  }

  async getAvailableTrips() {
    return this.model.findMany({
      where: {
        driverId: null,
        departureTime: { gte: new Date() },
        status: TripStatus.SCHEDULED
      },
      include: { line: true },
      orderBy: { departureTime: 'asc' }
    });
  }

  async updateStatus(tripId: string, status: TripStatus) {
    return prisma.$transaction(async (tx) => {
      return (tx as any).tripInstance.update({
        where: { id: tripId },
        data: { status },
        include: { line: true },
      });
    });
  }

  async appendCompletedStop(tripId: string, stopId: string) {
    return this.model.update({
      where: { id: tripId },
      data: {
        completedStopIds: {
          push: stopId
        }
      } as any
    });
  }

  async claim(tripId: string, driverId: string) {
    return this.model.update({
      where: { id: tripId },
      data: { driverId },
      include: { line: true }
    });
  }

  async getTripManifestDetails(tripId: string) {
    return this.model.findUnique({
      where: { id: tripId },
      include: {
        line: {
          select: { 
            name: true,
            startLat: true,
            startLng: true
          }
        }
      }
    });
  }
}

// Export a singleton instance for backwards compatibility with static calls (or for direct injection)
export const tripRepository = new TripRepository();
