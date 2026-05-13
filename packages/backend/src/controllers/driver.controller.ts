import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TripService } from '../services/TripService';
import { BookingService } from '../services/BookingService';
import { VehicleService } from '../services/VehicleService';
import { FleetOrchestrator } from '../services/FleetOrchestrator';
import { AppError } from '../utils/AppError';

// Centralized error handler to maintain consistent API contract
const handleError = (res: Response, error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, data: null, error: error.message });
  }
  return res.status(500).json({ success: false, data: null, error: defaultMessage });
};

export const getSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const schedule = await TripService.getSchedule(driverId);
    return res.status(200).json({ success: true, data: schedule, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch schedule.');
  }
};

export const getTripManifest = async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const data = await TripService.getTripManifest(tripId, driverId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch trip manifest.');
  }
};

export const updateTripStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const tripId = req.params.tripId as string;
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const data = await TripService.updateTripStatus(tripId, status, driverId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to update trip status.');
  }
};

export const markStopAsReached = async (req: AuthRequest, res: Response) => {
  try {
    const { stopId } = req.body;
    const tripId = req.params.tripId as string;
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const data = await TripService.markStopAsReached(tripId, stopId, driverId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to mark stop reached.');
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const { tripId, bookingId } = req.params as { tripId: string; bookingId: string };
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const data = await BookingService.updateBookingStatus(tripId, bookingId, status, driverId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to update booking status.');
  }
};

export const registerVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    // Let the Service handle required fields validation and DB insertion
    const data = await VehicleService.registerVehicle(driverId, req.body);
    return res.status(201).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to register vehicle.');
  }
};

export const getAvailableTrips = async (req: AuthRequest, res: Response) => {
  try {
    const trips = await TripService.getAvailableTrips();
    return res.status(200).json({ success: true, data: trips, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to fetch available trips');
  }
};

export const claimTrip = async (req: AuthRequest, res: Response) => {
  try {
    const tripId = req.params.tripId as string;
    const driverId = req.user?.id;
    if (!driverId) return res.status(401).json({ success: false, data: null, error: 'Driver context missing.' });

    const data = await FleetOrchestrator.claimTrip(tripId, driverId);
    return res.status(200).json({ success: true, data, error: null });
  } catch (error: any) {
    return handleError(res, error, 'Failed to claim trip');
  }
};
