import { prisma } from '../lib/prisma';

export class UserAdminService {
  /**
   * List all users
   */
  static async getUsers(tripId?: string) {
    const where: any = {};
    if (tripId) {
      where.OR = [
        { bookings: { some: { tripInstanceId: tripId } } },
        { tripInstances: { some: { id: tripId } } }
      ];
    }

    return await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all bookings for a user
   */
  static async getUserBookings(userId: string) {
    return await prisma.booking.findMany({
      where: { userId },
      include: {
        tripInstance: {
          include: {
            line: true,
            driver: { select: { name: true } },
          },
        },
      },
      orderBy: { tripInstance: { departureTime: 'desc' } },
    });
  }
}
