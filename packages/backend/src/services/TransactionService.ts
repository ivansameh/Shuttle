import { prisma } from '../lib/prisma';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class TransactionService {
  /**
   * Processes a completed trip to calculate driver earnings and platform commissions.
   */
  static async processCompletedTrip(tripId: string) {
    try {
      const trip = await prisma.tripInstance.findUnique({
        where: { id: tripId },
        include: { 
          line: true,
          bookings: {
            where: { status: { in: ['CONFIRMED', 'BOARDED'] } }
          }
        }
      });

      if (!trip || !trip.driverId || trip.status !== 'COMPLETED') return;

      // Check if transactions already exist for this trip to avoid double-processing
      const existing = await prisma.transaction.findFirst({
        where: { tripInstanceId: trip.id }
      });
      if (existing) return;

      const totalRevenue = trip.bookings.reduce((sum, b) => sum + Number(b.pricePaid), 0);
      const commissionRate = Number(trip.line.commissionRate || 0.10);
      const platformCommission = totalRevenue * commissionRate;
      const driverEarnings = totalRevenue - platformCommission;

      await prisma.$transaction([
        // 1. Record Driver Earning
        prisma.transaction.create({
          data: {
            amount: driverEarnings,
            type: TransactionType.DRIVER_EARNING,
            status: TransactionStatus.COMPLETED,
            driverId: trip.driverId,
            tripInstanceId: trip.id,
            description: `Earnings for trip ${trip.line.name} on ${trip.departureTime.toLocaleDateString()}`
          }
        }),
        // 2. Record Platform Commission
        prisma.transaction.create({
          data: {
            amount: platformCommission,
            type: TransactionType.PLATFORM_COMMISSION,
            status: TransactionStatus.COMPLETED,
            tripInstanceId: trip.id,
            description: `Commission for trip ${trip.line.name} (${(commissionRate * 100).toFixed(0)}%)`
          }
        })
      ]);

      console.log(`[TransactionService] Processed financials for trip=${tripId}. Driver: +${driverEarnings}, Platform: +${platformCommission}`);
    } catch (error) {
      console.error('[TransactionService] Failed to process trip financials:', error);
    }
  }
}
