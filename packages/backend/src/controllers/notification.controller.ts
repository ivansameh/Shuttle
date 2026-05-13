import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export class NotificationController {
  /**
   * Get notifications for the logged-in user
   */
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      }

      const { unreadOnly } = req.query;

      const where: any = { userId };
      if (unreadOnly === 'true') {
        where.isRead = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: notifications, error: null });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const id = req.params.id as string;

      if (!userId) {
        return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      }

      // Check if notification belongs to user
      const notification = await prisma.notification.findFirst({
        where: { id, userId },
      });

      if (!notification) {
        return res.status(404).json({ success: false, data: null, error: 'Notification not found' });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return res.status(200).json({ success: true, data: updated, error: null });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ success: false, data: null, error: 'Failed to mark notification as read' });
    }
  }
}
