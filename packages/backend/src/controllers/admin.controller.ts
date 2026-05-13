import { Request, Response } from 'express';
import { LineService } from '../services/LineService';
import { TripAdminService } from '../services/TripAdminService';
import { UserAdminService } from '../services/UserAdminService';
import { NotificationService } from '../services/NotificationService';
import { parsePagination, buildPaginatedResponse } from '../utils/pagination';

export class AdminController {
  /**
   * Create a new shuttle line
   */
  static async createLine(req: Request, res: Response) {
    try {
      const { name, startLat, startLng, fixedPrice } = req.body;
      if (!name || startLat === undefined || startLng === undefined || !fixedPrice) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields: name, startLat, startLng, fixedPrice',
        });
      }

      const line = await LineService.createLine(req.body);
      return res.status(201).json({ success: true, data: line, error: null });
    } catch (error: any) {
      console.error('Error creating line:', error);
      return res.status(500).json({ success: false, data: null, error: error.message || 'Failed to create line' });
    }
  }

  /**
   * List all lines (Paginated)
   */
  static async getLines(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const { lines, total } = await LineService.getLines(pagination.skip, pagination.take);
      res.setHeader('X-Total-Count', total.toString());
      return res.status(200).json(buildPaginatedResponse(lines, total, pagination));
    } catch (error: any) {
      console.error('Error fetching lines:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch lines' });
    }
  }

  /**
   * Update an existing Shuttle Line
   */
  static async updateLineDetails(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const updated = await LineService.updateLine(id, req.body);
      return res.status(200).json({ success: true, data: updated, error: null });
    } catch (error: any) {
      console.error('Error updating line:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to update line' });
    }
  }

  /**
   * Schedule a new TripInstance
   */
  static async scheduleTrip(req: Request, res: Response) {
    try {
      const { lineId, departureTime } = req.body;
      if (!lineId || !departureTime) {
        return res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      }

      const trip = await TripAdminService.scheduleTrip(req.body);
      return res.status(201).json({ success: true, data: trip, error: null });
    } catch (error: any) {
      console.error('Error scheduling trip:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to schedule trip' });
    }
  }

  /**
   * Re-assign a driver to a trip
   */
  static async reassignDriver(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { driverId } = req.body;
      if (!id || !driverId) {
        return res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      }

      const trip = await TripAdminService.reassignDriver(id, driverId);
      return res.status(200).json({ success: true, data: trip, error: null });
    } catch (error: any) {
      console.error('Error reassigning driver:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to reassign driver' });
    }
  }

  /**
   * Update an existing TripInstance
   */
  static async updateTrip(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const updatedTrip = await TripAdminService.updateTrip(id, req.body);
      return res.status(200).json({ success: true, data: updatedTrip, error: null });
    } catch (error: any) {
      console.error('Error updating trip:', error);
      return res.status(500).json({ success: false, data: null, error: error.message || 'Failed to update trip' });
    }
  }

  /**
   * List all trips (Paginated)
   */
  static async getTrips(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const { trips, total } = await TripAdminService.getTrips(pagination.skip, pagination.take);
      res.setHeader('X-Total-Count', total.toString());
      return res.status(200).json(buildPaginatedResponse(trips, total, pagination));
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch trips' });
    }
  }

  /**
   * Fetch passenger manifest for a specific trip
   */
  static async getTripManifest(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const bookings = await TripAdminService.getTripManifest(id);
      return res.status(200).json({ success: true, data: bookings, error: null });
    } catch (error: any) {
      console.error('Error fetching manifest:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch manifest' });
    }
  }

  /**
   * Cancel a TripInstance
   */
  static async cancelTrip(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const trip = await TripAdminService.cancelTrip(id);
      return res.status(200).json({ success: true, data: trip, error: null });
    } catch (error: any) {
      console.error('Error cancelling trip:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to cancel trip' });
    }
  }

  /**
   * Delete a Line (Cascade cancellation)
   */
  static async deleteLine(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await LineService.deleteLine(id);
      return res.status(200).json({ success: true, data: result, error: null });
    } catch (error: any) {
      console.error('Error deleting line:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to delete line' });
    }
  }

  /**
   * List all users (Paginated)
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const { tripId } = req.query;
      const pagination = parsePagination(req);
      const { users, total } = await UserAdminService.getUsers({
        tripId: tripId as string,
        skip: pagination.skip,
        take: pagination.take
      });
      res.setHeader('X-Total-Count', total.toString());
      return res.status(200).json(buildPaginatedResponse(users, total, pagination));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch users' });
    }
  }

  /**
   * Get all bookings for a specific user
   */
  static async getUserBookings(req: Request, res: Response) {
    try {
      const userId = req.params.id as string;
      const bookings = await UserAdminService.getUserBookings(userId);
      return res.status(200).json({ success: true, data: bookings, error: null });
    } catch (error: any) {
      console.error('Error fetching user bookings:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch user history' });
    }
  }

  /**
   * Add recurring schedule times to a line
   */
  static async addSchedule(req: Request, res: Response) {
    try {
      const { lineId, schedules } = req.body;
      if (!lineId || !schedules || !Array.isArray(schedules)) {
        return res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      }

      const result = await LineService.addSchedule(lineId, schedules);
      return res.status(201).json({ success: true, data: result, error: null });
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to add schedule' });
    }
  }

  /**
   * Generate TripInstances from schedules
   */
  static async generateTrips(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.body; 
      if (!startDate) return res.status(400).json({ success: false, data: null, error: 'Missing start date' });

      const result = await TripAdminService.generateTrips(startDate, endDate);
      return res.status(201).json({ success: true, data: result, error: null });
    } catch (error: any) {
      console.error('Error generating trips:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({ success: false, data: null, error: error.message || 'Failed to generate trips' });
    }
  }

  /**
   * Cancel all trips for a specific line in a date range
   */
  static async cancelTripsInRange(req: Request, res: Response) {
    try {
      const { lineId, startDate, endDate, times } = req.body;
      if (!lineId || !startDate || !endDate) {
        return res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      }

      const result = await TripAdminService.cancelTripsInRange(lineId, startDate, endDate, times);
      return res.status(200).json({ success: true, data: result, error: null });
    } catch (error: any) {
      console.error('Error cancelling trips range:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({ success: false, data: null, error: error.message || 'Failed to cancel trips in range' });
    }
  }

  /**
   * Broadcast a notification to a target group
   */
  static async broadcastNotification(req: Request, res: Response) {
    try {
      const result = await NotificationService.broadcastNotification(req.body);
      return res.status(201).json({ success: true, data: result, error: null });
    } catch (error: any) {
      console.error('Error broadcasting notification:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({ success: false, data: null, error: error.message || 'Failed to broadcast notification' });
    }
  }
}
