import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Rider registers for a weekly recurring shuttle pass
 */
export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { lineId, time, daysOfWeek } = req.body;

    if (!userId) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });

    if (!lineId || !time || !daysOfWeek || !Array.isArray(daysOfWeek)) {
      return res.status(400).json({ success: false, data: null, error: 'Missing lineId, time, or daysOfWeek array' });
    }

    // Check if line and time exists
    const schedule = await prisma.lineSchedule.findFirst({
      where: { lineId, time }
    });

    if (!schedule) {
      return res.status(404).json({ success: false, data: null, error: 'The requested schedule pattern does not exist for this line.' });
    }

    const subscription = await prisma.subscription.upsert({
      where: {
        userId_lineId_time: { userId, lineId, time }
      },
      update: {
        daysOfWeek,
        isActive: true
      },
      create: {
        userId,
        lineId,
        time,
        daysOfWeek,
        isActive: true
      }
    });

    return res.status(201).json({ success: true, data: subscription, error: null });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ success: false, data: null, error: 'Failed to create weekly pass.' });
  }
};

/**
 * Get active subscriptions for the current user
 */
export const getUserSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, data: null, error: 'Unauthorized' });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true },
      include: {
        line: {
          select: { name: true, fixedPrice: true }
        }
      }
    });

    return res.status(200).json({ success: true, data: subscriptions, error: null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, data: null, error: 'Failed to fetch subscriptions.' });
  }
};

/**
 * Cancel a recurring pass
 */
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const sub = await prisma.subscription.findUnique({ where: { id } });
    if (!sub || sub.userId !== userId) {
      return res.status(403).json({ success: false, data: null, error: 'Forbidden' });
    }

    await prisma.subscription.update({
      where: { id },
      data: { isActive: false }
    });

    return res.status(200).json({ success: true, data: { status: 'Cancelled' }, error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, error: 'Failed to cancel pass.' });
  }
};
