import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class AnalyticsController {
  /**
   * High-Level KPIs
   */
  static async getKpis(req: Request, res: Response) {
    try {
      // Total Gross Volume
      const totalGrossVolumeAggr = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: 'TRIP_PAYMENT',
          status: 'COMPLETED',
        },
      });

      // Total Platform Revenue (Commissions)
      const totalPlatformRevenueAggr = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: 'PLATFORM_COMMISSION',
          status: 'COMPLETED',
        },
      });

      // Total Pending Driver Payouts
      const totalPendingPayoutsAggr = await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: 'PAYOUT',
          status: 'PENDING',
        },
      });

      res.json({
        success: true,
        data: {
          totalGrossVolume: totalGrossVolumeAggr._sum.amount || 0,
          totalPlatformRevenue: totalPlatformRevenueAggr._sum.amount || 0,
          totalPendingPayouts: totalPendingPayoutsAggr._sum.amount || 0,
        },
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching KPIs:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to fetch KPIs' });
    }
  }

  /**
   * Time-Series Data for the last 30 days
   */
  static async getTimeSeriesData(req: Request, res: Response) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // We use queryRaw for DATE_TRUNC grouping
      const timeSeries: any[] = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', "createdAt") as date,
          SUM(CASE WHEN type = 'TRIP_PAYMENT' THEN amount ELSE 0 END) as "grossVolume",
          SUM(CASE WHEN type = 'PLATFORM_COMMISSION' THEN amount ELSE 0 END) as "netRevenue"
        FROM "Transaction"
        WHERE "createdAt" >= ${thirtyDaysAgo} AND status = 'COMPLETED'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC;
      `;

      // Format date to string and convert Decimal (returned as object/string by Prisma raw) to float/int
      const formattedSeries = timeSeries.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        grossVolume: Number(row.grossVolume) || 0,
        netRevenue: Number(row.netRevenue) || 0,
      }));

      res.json({
        success: true,
        data: formattedSeries,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching time-series data:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to fetch time-series data' });
    }
  }

  /**
   * Recent Transactions
   */
  static async getRecentTransactions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const transactions = await prisma.transaction.findMany({
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          driver: { select: { id: true, name: true, email: true } },
          rider: { select: { id: true, name: true, email: true } },
        },
      });

      const total = await prisma.transaction.count();

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({ success: false, data: null, error: 'Failed to fetch recent transactions' });
    }
  }
}
