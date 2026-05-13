import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * GET /api/bookings/:bookingId/messages
 * Fetches chat history for a specific booking.
 */
export const getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      return;
    }

    // Step 1: Security/Validation Check
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId as string },
      include: {
        tripInstance: true,
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, data: null, error: 'Booking not found' });
      return;
    }

    // Role-based Access Logic
    if (user.role === 'RIDER') {
      // Riders can only see messages for their own bookings
      if (booking.userId !== user.id) {
        res.status(403).json({ success: false, data: null, error: 'Forbidden: You do not own this booking' });
        return;
      }
    } else if (user.role === 'DRIVER') {
      // Drivers can only see messages for trips they are assigned to
      if (booking.tripInstance.driverId !== user.id) {
        res.status(403).json({ success: false, data: null, error: 'Forbidden: You are not assigned to this trip' });
        return;
      }
    } else if (user.role === 'ADMIN') {
      // Admins have automatic read-only access (Requirement Step 2.3)
      // No extra checks needed
    } else {
      res.status(403).json({ success: false, data: null, error: 'Forbidden: Invalid role' });
      return;
    }

    // Step 2: Fetch Messages
    const messages = await prisma.message.findMany({
      where: { bookingId: bookingId as string },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: messages,
      error: null,
    });
  } catch (error: any) {
    console.error('Fetch chat history error:', error);
    res.status(500).json({ success: false, data: null, error: 'Internal server error while fetching messages' });
  }
};
