import { prisma } from '../lib/prisma';

export class UserAdminService {
  /**
   * List all users (Paginated)
   */
  static async getUsers(options: { tripId?: string; skip?: number; take?: number }) {
    const { tripId, skip, take } = options;
    const where: any = {};
    if (tripId) {
      where.OR = [
        { bookings: { some: { tripInstanceId: tripId } } },
        { tripInstances: { some: { id: tripId } } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
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
      }),
      prisma.user.count({ where })
    ]);

    return { users, total };
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
