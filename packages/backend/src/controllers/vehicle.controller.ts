import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class VehicleController {
  /**
   * Create a new vehicle
   */
  static async createVehicle(req: Request, res: Response) {
    try {
      const { licensePlate, make, model, year, capacity } = req.body;

      if (!licensePlate || !make || !model || !capacity) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing required fields: licensePlate, make, model, capacity',
        });
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          licensePlate,
          make,
          model,
          year: year ? Number(year) : null,
          capacity: Number(capacity),
        },
      });

      return res.status(201).json({
        success: true,
        data: vehicle,
        error: null,
      });
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          data: null,
          error: 'License plate already exists',
        });
      }
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create vehicle',
      });
    }
  }

  /**
   * List all vehicles
   */
  static async getVehicles(req: Request, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: vehicles,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to fetch vehicles',
      });
    }
  }

  /**
   * Update vehicle details
   */
  static async updateVehicle(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { licensePlate, make, model, year, capacity, isActive } = req.body;

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: {
          licensePlate,
          make,
          model,
          year: year ? Number(year) : undefined,
          capacity: capacity ? Number(capacity) : undefined,
          isActive,
        },
      });

      return res.status(200).json({
        success: true,
        data: vehicle,
        error: null,
      });
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update vehicle',
      });
    }
  }

  /**
   * Delete vehicle (soft delete)
   */
  static async deleteVehicle(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      await prisma.vehicle.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(200).json({
        success: true,
        data: { message: 'Vehicle deactivated successfully' },
        error: null,
      });
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to deactivate vehicle',
      });
    }
  }
}
