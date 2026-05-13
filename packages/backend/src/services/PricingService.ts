import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';

export class PricingService {
  /**
   * Fetches the current fixed price for a specific line.
   * This is used to create an immutable price snapshot at the time of booking.
   * severs the direct coupling between Booking domain and Line/Route DB tables.
   */
  static async getLinePriceSnapshot(lineId: string): Promise<number> {
    const line = await prisma.line.findUnique({
      where: { id: lineId },
      select: { fixedPrice: true }
    });

    if (!line) {
      throw new AppError('Line not found for pricing', 404);
    }

    return Number(line.fixedPrice);
  }
}
