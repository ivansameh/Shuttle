import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthService } from '../lib/auth.service';
import { UserStatus, Role } from '@prisma/client';

export class AdminDriverController {
  static async getDrivers(req: Request, res: Response) {
    try {
      const drivers = await prisma.user.findMany({
        where: { role: Role.DRIVER },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({ success: true, data: drivers, error: null });
    } catch (error: any) {
      console.error('Error fetching drivers:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to fetch drivers' });
    }
  }

  static async createDriver(req: Request, res: Response) {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, data: null, error: 'Missing required fields' });
      }

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone: phone || undefined }] },
      });

      if (existingUser) {
        return res.status(409).json({ success: false, data: null, error: 'Driver with this email or phone already exists' });
      }

      const passwordHash = await AuthService.hashPassword(password);

      const driver = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          role: Role.DRIVER,
          status: UserStatus.ACTIVE, // Admin creation bypasses approval
        },
        select: { id: true, name: true, email: true, phone: true, status: true },
      });

      res.status(201).json({ success: true, data: driver, error: null });
    } catch (error: any) {
      console.error('Error creating driver:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to create driver' });
    }
  }

  /**
   * Approve a pending driver
   */
  static async approveDriver(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const driver = await prisma.user.update({
        where: { id, role: Role.DRIVER },
        data: { status: UserStatus.ACTIVE },
      });

      return res.status(200).json({
        success: true,
        data: driver,
        error: null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to approve driver',
      });
    }
  }

  /**
   * Decline a pending driver
   */
  static async declineDriver(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const driver = await prisma.user.update({
        where: { id, role: Role.DRIVER },
        data: { status: UserStatus.REJECTED },
      });

      return res.status(200).json({
        success: true,
        data: driver,
        error: null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to decline driver',
      });
    }
  }

  /**
   * Delete/Deactivate a driver
   */
  static async deleteDriver(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const updated = await prisma.user.update({
        where: { id, role: Role.DRIVER },
        data: { isActive: false },
      });
      res.status(200).json({ success: true, data: updated, error: null });
    } catch (error: any) {
      console.error('Error deactivating driver:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to deactivate driver' });
    }
  }

  /**
   * Fetch a full profile for a driver including financial stats
   */
  static async getDriverProfile(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      const driver = await prisma.user.findUnique({
        where: { id, role: Role.DRIVER },
        include: {
          tripInstances: {
            include: { 
              line: true,
              _count: { select: { bookings: true } }
            },
            orderBy: { departureTime: 'desc' },
            take: 20
          },
          driverTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });

      if (!driver) {
        return res.status(404).json({ success: false, data: null, error: 'Driver not found' });
      }

      // Calculate totals using aggregate
      const earningsAggr = await prisma.transaction.aggregate({
        where: { driverId: id, type: 'DRIVER_EARNING', status: 'COMPLETED' },
        _sum: { amount: true }
      });

      const payoutsAggr = await prisma.transaction.aggregate({
        where: { driverId: id, type: 'PAYOUT', status: 'COMPLETED' },
        _sum: { amount: true }
      });

      const pendingPayoutsAggr = await prisma.transaction.aggregate({
        where: { driverId: id, type: 'PAYOUT', status: 'PENDING' },
        _sum: { amount: true }
      });

      const totalEarned = earningsAggr._sum.amount || 0;
      const totalPaid = payoutsAggr._sum.amount || 0;
      const pendingPayout = pendingPayoutsAggr._sum.amount || 0;
      const balance = Number(totalEarned) - Number(totalPaid);

      res.status(200).json({
        success: true,
        data: {
          profile: {
            id: driver.id,
            name: driver.name,
            email: driver.email,
            phone: driver.phone,
            status: driver.status,
            createdAt: driver.createdAt
          },
          stats: {
            totalEarned,
            totalPaid,
            pendingPayout,
            balance
          },
          trips: driver.tripInstances,
          transactions: driver.driverTransactions
        },
        error: null
      });
    } catch (error: any) {
      console.error('Error fetching driver profile:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to fetch driver profile' });
    }
  }
}
