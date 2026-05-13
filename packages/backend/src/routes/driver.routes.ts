import { Router } from 'express';
import { 
  getSchedule, getTripManifest, updateTripStatus, 
  updateBookingStatus, registerVehicle, getAvailableTrips, 
  claimTrip, markStopAsReached 
} from '../controllers/driver.controller';
import { requireDriver, requireDriverOwnedTrip } from '../middleware/auth.middleware';

const router = Router();

// Publicly available to any driver
router.get('/available-trips', requireDriver, getAvailableTrips);
router.post('/vehicle', requireDriver, registerVehicle);

// Trip-specific operations requiring ownership check
router.get('/schedule', requireDriver, getSchedule);
router.get('/trips/:tripId/manifest', requireDriverOwnedTrip, getTripManifest);
router.patch('/trips/:tripId/reserve', requireDriver, claimTrip); // Only requireDriver because claim happens before assignment is verified
router.patch('/trips/:tripId/status', requireDriverOwnedTrip, updateTripStatus);
router.patch('/trips/:tripId/stops', requireDriverOwnedTrip, markStopAsReached);
router.patch('/trips/:tripId/bookings/:bookingId', requireDriverOwnedTrip, updateBookingStatus);

export default router;

