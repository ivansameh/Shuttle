import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';

export interface CreateLineDto {
  name: string;
  startLat: number;
  startLng: number;
  startPointName?: string;
  endLat: number;
  endLng: number;
  endPointName?: string;
  fixedPrice: number;
  commissionRate?: number;
  schedules?: any[];
}

export interface UpdateLineDto {
  name?: string;
  fixedPrice?: number;
  commissionRate?: number;
  isActive?: boolean;
  startLat?: number;
  startLng?: number;
  startPointName?: string;
  endLat?: number;
  endLng?: number;
  endPointName?: string;
}

export class LineService {
  /**
   * Create a new shuttle line
   */
  static async createLine(dto: CreateLineDto) {
    const { name, startLat, startLng, startPointName, endLat, endLng, endPointName, fixedPrice, commissionRate, schedules } = dto;

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newLine = await tx.line.create({
        data: {
          name,
          startLat,
          startLng,
          startPointName,
          endLat,
          endLng,
          endPointName,
          fixedPrice: Number(fixedPrice),
          commissionRate: commissionRate !== undefined ? Number(commissionRate) : 0.10,
        },
      });

      // Update geography points
      await tx.$executeRawUnsafe(
        `UPDATE "Line" SET 
          "startLocation" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          "endLocation" = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography 
         WHERE id = $5::uuid`,
        startLng,
        startLat,
        endLng,
        endLat,
        newLine.id
      );

      if (schedules && Array.isArray(schedules)) {
        await tx.lineSchedule.createMany({
          data: schedules.map((s: any) => ({
            lineId: newLine.id,
            time: typeof s === 'string' ? s : s.time,
            daysOfWeek: s.daysOfWeek || [1, 2, 3, 4, 7]
          }))
        });
      }

      return newLine;
    });
  }

  /**
   * List all lines
   */
  static async getLines() {
    return await prisma.line.findMany({
      where: { isActive: true },
      include: { schedules: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update an existing Shuttle Line
   */
  static async updateLine(id: string, dto: UpdateLineDto) {
    const { name, fixedPrice, commissionRate, isActive, startLat, startLng, startPointName, endLat, endLng, endPointName } = dto;

    return await prisma.$transaction(async (tx) => {
      const line = await tx.line.update({
        where: { id },
        data: {
          name,
          fixedPrice: fixedPrice !== undefined ? Number(fixedPrice) : undefined,
          commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
          isActive,
          startLat,
          startLng,
          startPointName,
          endLat,
          endLng,
          endPointName
        }
      });

      if (startLat !== undefined || startLng !== undefined || endLat !== undefined || endLng !== undefined) {
        await tx.$executeRawUnsafe(
          `UPDATE "Line" SET 
            "startLocation" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            "endLocation" = ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography 
           WHERE id = $5::uuid`,
          startLng ?? line.startLng,
          startLat ?? line.startLat,
          endLng ?? line.endLng,
          endLat ?? line.endLat,
          id
        );
      }
      return line;
    });
  }

  /**
   * Soft delete a line and cancel future trips
   */
  static async deleteLine(id: string) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Soft delete the line by making it inactive
      const deletedLine = await tx.line.update({
        where: { id },
        data: { isActive: false },
      });

      // Cancel all future trips for this line
      const futureTrips = await tx.tripInstance.findMany({
        where: {
          lineId: id,
          status: 'SCHEDULED',
        },
        select: { id: true },
      });

      const futureTripIds = futureTrips.map(t => t.id);

      if (futureTripIds.length > 0) {
        // Cancel the trips
        await tx.tripInstance.updateMany({
          where: { id: { in: futureTripIds } },
          data: { status: 'CANCELLED' },
        });

        // Cancel the associated bookings
        await tx.booking.updateMany({
          where: { 
            tripInstanceId: { in: futureTripIds },
            status: { not: 'CANCELLED' },
          },
          data: { status: 'CANCELLED' },
        });
      }

      return deletedLine;
    });
  }

  /**
   * Add recurring schedule times to a line
   */
  static async addSchedule(lineId: string, schedules: any[]) {
    await prisma.lineSchedule.createMany({
      data: schedules.map(s => ({ 
        lineId, 
        time: typeof s === 'string' ? s : s.time,
        daysOfWeek: s.daysOfWeek || [1, 2, 3, 4, 7]
      }))
    });
    return { status: 'Schedules created' };
  }
}
