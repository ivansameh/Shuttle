import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export class StopController {
  /**
   * Create a new stop for a line
   */
  static async createStop(req: Request, res: Response) {
    try {
      const { lineId, name, lat, lng, orderIndex } = req.body;

      if (!lineId || !name || lat === undefined || lng === undefined || orderIndex === undefined) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields: lineId, name, lat, lng, orderIndex',
        });
      }

      const stop = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Create the stop record
        const newStop = await tx.stop.create({
          data: {
            lineId,
            name,
            lat,
            lng,
            orderIndex: Number(orderIndex),
          },
        });

        // 2. Update the geography point field using raw SQL
        // PostgreSQL PostGIS: lon (lng) comes first in Point constructor
        await tx.$executeRawUnsafe(
          `UPDATE "Stop" SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3::uuid`,
          lng,
          lat,
          newStop.id
        );

        return newStop;
      });

      return res.status(201).json({
        success: true,
        data: stop,
        error: null,
      });
    } catch (error: any) {
      console.error('Error creating stop:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create stop',
      });
    }
  }

  /**
   * List all stops for a line
   */
  static async getStopsByLine(req: Request, res: Response) {
    try {
      const lineId = req.params.lineId as string;

      const stops = await prisma.stop.findMany({
        where: { lineId },
        orderBy: { orderIndex: 'asc' },
      });

      return res.status(200).json({
        success: true,
        data: stops,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching stops:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to fetch stops',
      });
    }
  }

  /**
   * Update stop details
   */
  static async updateStop(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { name, lat, lng, orderIndex } = req.body;

      const stop = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updatedStop = await tx.stop.update({
          where: { id },
          data: {
            name,
            lat,
            lng,
            orderIndex: orderIndex !== undefined ? Number(orderIndex) : undefined,
          },
        });

        // If coords changed, update the geography point
        if (lat !== undefined || lng !== undefined) {
          await tx.$executeRawUnsafe(
            `UPDATE "Stop" SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3::uuid`,
            updatedStop.lng,
            updatedStop.lat,
            updatedStop.id
          );
        }

        return updatedStop;
      });

      return res.status(200).json({
        success: true,
        data: stop,
        error: null,
      });
    } catch (error: any) {
      console.error('Error updating stop:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update stop',
      });
    }
  }

  /**
   * Delete stop
   */
  static async deleteStop(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      await prisma.stop.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        data: { message: 'Stop deleted successfully' },
        error: null,
      });
    } catch (error: any) {
      console.error('Error deleting stop:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to delete stop',
      });
    }
  }
  /**
   * Task: Reorder stops geographically (Greedy nearest neighbor)
   * This is the "Root Fix" to ensure stops follow the actual path of the line.
   */
  static async reorderStopsGeographically(req: Request, res: Response) {
    try {
      const lineId = req.params.lineId as string;

      const line = await prisma.line.findUnique({
        where: { id: lineId },
        include: { stops: true }
      }) as any;

      if (!line) {
        return res.status(404).json({ success: false, error: 'Line not found' });
      }

      const stops = line.stops;
      if (stops.length === 0) {
        return res.status(200).json({ success: true, data: [] });
      }

      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
      };

      const sortedStops: any[] = [];
      const remainingStops = [...stops];
      let currentLat = line.startLat;
      let currentLng = line.startLng;

      while (remainingStops.length > 0) {
        let nearestIndex = 0;
        let minDistance = Infinity;

        for (let i = 0; i < remainingStops.length; i++) {
          const dist = getDistance(currentLat, currentLng, remainingStops[i].lat, remainingStops[i].lng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestIndex = i;
          }
        }

        const nextStop = remainingStops.splice(nearestIndex, 1)[0];
        sortedStops.push(nextStop);
        currentLat = nextStop.lat;
        currentLng = nextStop.lng;
      }

      // Update database with new order
      await prisma.$transaction(
        sortedStops.map((stop, index) => 
          prisma.stop.update({
            where: { id: stop.id },
            data: { orderIndex: index }
          })
        )
      );

      return res.status(200).json({
        success: true,
        data: sortedStops.map((s, i) => ({ ...s, orderIndex: i })),
        error: null
      });

    } catch (error: any) {
      console.error('Error reordering stops:', error);
      return res.status(500).json({ success: false, error: 'Failed to reorder stops' });
    }
  }
}
