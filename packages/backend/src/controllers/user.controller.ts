import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Update current user profile (name, mobile)
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { 
      name, phone, email, 
      homeLat, homeLng, homeAddress, 
      workLat, workLng, workAddress 
    } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      return;
    }

    // Check if email is already taken if changing email
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } }
      });
      if (existing) {
        res.status(400).json({ success: false, data: null, error: 'Email already in use' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        email: email || undefined,
        homeLat: homeLat !== undefined ? homeLat : undefined,
        homeLng: homeLng !== undefined ? homeLng : undefined,
        homeAddress: homeAddress || undefined,
        workLat: workLat !== undefined ? workLat : undefined,
        workLng: workLng !== undefined ? workLng : undefined,
        workAddress: workAddress || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        homeLat: true,
        homeLng: true,
        homeAddress: true,
        workLat: true,
        workLng: true,
        workAddress: true
      }
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
      error: null
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, data: null, error: 'Failed to update profile' });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, data: null, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        homeLat: true,
        homeLng: true,
        homeAddress: true,
        workLat: true,
        workLng: true,
        workAddress: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, data: null, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
      error: null
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, data: null, error: 'Failed to fetch profile' });
  }
};
