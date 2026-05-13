import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../lib/auth.service';
import { tripRepository } from '../repositories/TripRepository';
import { vehicleRepository } from '../repositories/VehicleRepository';
import { bookingRepository } from '../repositories/BookingRepository';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Parses JWT from Authorization header and attaches user to request
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = AuthService.verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Invalid or expired token.',
    });
  }
};

/**
 * Checks if the authenticated user has the required role
 */
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Access denied. User not authenticated.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

/**
 * Resource Ownership: Ensures the driver owns the trip specified in params
 */
export const checkTripOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const tripId = req.params.tripId as string;
  const driverId = req.user?.id;

  if (!tripId || !driverId) return res.status(400).json({ success: false, data: null, error: 'Trip ID or Driver context missing.' });

  try {
    const trip = await tripRepository.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, data: null, error: 'Trip not found.' });
    }

    if (trip.driverId !== driverId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied. You are not assigned to this trip.' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: 'Ownership verification failed.' });
  }
};

/**
 * Resource Ownership: Ensures the driver owns the vehicle specified in params
 */
export const checkVehicleOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const vehicleId = req.params.vehicleId as string;
  const driverId = req.user?.id;

  if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

  try {
    const vehicle = await vehicleRepository.findById(vehicleId || '');
    if (!vehicle) {
      return res.status(404).json({ success: false, data: null, error: 'Vehicle not found.' });
    }

    if (vehicle.ownerId !== driverId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied. You do not own this vehicle.' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: 'Ownership verification failed.' });
  }
};

/**
 * Resource Ownership: Ensures the rider owns the booking specified in params
 */
export const checkBookingOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const id = req.params.id as string;
  const userId = req.user?.id;

  if (!id || !userId) return res.status(400).json({ success: false, data: null, error: 'Booking ID or User context missing.' });

  try {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, data: null, error: 'Booking not found.' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ success: false, data: null, error: 'Access denied. You do not own this booking.' });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: 'Ownership verification failed.' });
  }
};

// Common aliases for role-based protection
export const requireAdmin = [authenticate, authorize(['ADMIN'])];
export const requireRider = [authenticate, authorize(['RIDER'])];
export const requireDriver = [authenticate, authorize(['DRIVER'])];
export const requireDriverOwnedTrip = [authenticate, authorize(['DRIVER']), checkTripOwnership];
export const requireRiderOwnedBooking = [authenticate, authorize(['RIDER']), checkBookingOwnership];
