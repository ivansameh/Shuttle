import { prisma } from '../lib/prisma';
import { getIO } from '../socket/socket.server';
import { AppError } from '../utils/AppError';
import { NotificationType } from '@prisma/client';

export type TargetGroup = 'ALL_RIDERS' | 'ALL_DRIVERS' | 'SPECIFIC_LINE';

export interface BroadcastDto {
  targetGroup: TargetGroup;
  title: string;
  body: string;
  type?: NotificationType;
  lineId?: string;
}

export class NotificationService {
  /**
   * Broadcast a notification to a target group
   */
  static async broadcastNotification(dto: BroadcastDto) {
    const { targetGroup, title, body, type, lineId } = dto;

    let users = [];

    if (targetGroup === 'ALL_RIDERS') {
      users = await prisma.user.findMany({ where: { role: 'RIDER', isActive: true }, select: { id: true } });
    } else if (targetGroup === 'ALL_DRIVERS') {
      users = await prisma.user.findMany({ where: { role: 'DRIVER', isActive: true }, select: { id: true } });
    } else if (targetGroup === 'SPECIFIC_LINE' && lineId) {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { subscriptions: { some: { lineId, isActive: true } } },
            { bookings: { some: { tripInstance: { lineId } } } }
          ]
        },
        select: { id: true }
      });
    } else {
      throw new AppError('Invalid targetGroup or missing lineId', 400);
    }

    if (users.length === 0) {
      return { count: 0 };
    }

    const notifications = users.map(u => ({
      userId: u.id,
      title,
      body,
      type: type || NotificationType.SYSTEM
    }));

    await prisma.notification.createMany({ data: notifications });

    // Emit via Socket.IO
    try {
      const io = getIO();
      for (const u of users) {
        io.to(`user_${u.id}`).emit('new_notification', {
          title,
          body,
          type: type || NotificationType.SYSTEM,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn('[Socket] Failed to broadcast notification:', err);
    }

    return { count: users.length };
  }
}
