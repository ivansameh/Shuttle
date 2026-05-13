import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';

export const getLines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userLat, userLng } = req.query;
    const pagination = parsePagination(req);

    const where = { 
      isActive: true,
      tripInstances: {
        some: {
          status: 'SCHEDULED' as any
        }
      }
    };

    let lines = await prisma.line.findMany({
      where,
      include: {
        stops: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    // If user location is provided, sort by distance to Start Point
    if (userLat && userLng) {
      const lat = parseFloat(userLat as string);
      const lng = parseFloat(userLng as string);
      
      lines = lines.sort((a, b) => {
        const distA = Math.pow(a.startLat - lat, 2) + Math.pow(a.startLng - lng, 2);
        const distB = Math.pow(b.startLat - lat, 2) + Math.pow(b.startLng - lng, 2);
        return distA - distB;
      });
    }

    // Apply pagination after sorting if distance sort was requested, 
    // otherwise we could have done it at the DB level.
    const total = lines.length;
    const paginatedLines = lines.slice(pagination.skip, pagination.skip + pagination.take);

    res.setHeader('X-Total-Count', total.toString());
    res.status(200).json(buildPaginatedResponse(paginatedLines, total, pagination));
  } catch (error: any) {
    console.error('Error fetching lines:', error);
    res.status(500).json({ success: false, data: null, error: error.message || 'Internal server error' });
  }
};

export const getTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lineId, date, userLat, userLng } = req.query;
    const pagination = parsePagination(req);

    const whereClause: any = {
      status: 'SCHEDULED', // Only show available trips that haven't started/completed/cancelled
    };

    if (lineId && typeof lineId === 'string') {
      whereClause.lineId = lineId;
    }

    if (date && typeof date === 'string') {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      
      whereClause.departureTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Fetch all matching trips to allow for distance-based sorting
    // For very large datasets, we would need PostGIS to do this at DB level
    let trips = await prisma.tripInstance.findMany({
      where: whereClause,
      include: {
        driver: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true, capacity: true } },
        line: true
      },
      orderBy: { departureTime: 'asc' }
    });

    // Distance sorting for trips (based on line start)
    if (userLat && userLng) {
      const lat = parseFloat(userLat as string);
      const lng = parseFloat(userLng as string);
      trips = trips.sort((a, b) => {
        const distA = Math.pow(a.line.startLat - lat, 2) + Math.pow(a.line.startLng - lng, 2);
        const distB = Math.pow(b.line.startLat - lat, 2) + Math.pow(b.line.startLng - lng, 2);
        return distA - distB;
      });
    }

    const total = trips.length;
    const paginatedTrips = trips.slice(pagination.skip, pagination.skip + pagination.take);

    res.setHeader('X-Total-Count', total.toString());
    res.status(200).json(buildPaginatedResponse(paginatedTrips, total, pagination));
  } catch (error: any) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, data: null, error: error.message || 'Internal server error' });
  }
};

export const getTripById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const trip = await prisma.tripInstance.findUnique({
      where: { id: id as string },
      include: {
        line: { include: { stops: { orderBy: { orderIndex: 'asc' } } } },
        driver: { select: { name: true } },
        vehicle: { select: { licensePlate: true, capacity: true } }
      }
    });

    if (!trip) {
      res.status(404).json({ success: false, data: null, error: 'Trip not found' });
      return;
    }

    res.status(200).json({ success: true, data: trip, error: null });
  } catch (error: any) {
    console.error('Error fetching trip by ID:', error);
    res.status(500).json({ success: false, data: null, error: 'Internal server error' });
  }
};

export const getLineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const line = await prisma.line.findUnique({
      where: { id: id as string, isActive: true },
      include: { 
        stops: { orderBy: { orderIndex: 'asc' } },
        schedules: true
      }
    });

    if (!line) {
      res.status(404).json({ success: false, data: null, error: 'Line not found' });
      return;
    }

    res.status(200).json({ success: true, data: line, error: null });
  } catch (error: any) {
    console.error('Error fetching line by ID:', error);
    res.status(500).json({ success: false, data: null, error: 'Internal server error' });
  }
};
