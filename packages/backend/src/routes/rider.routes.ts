import { Router } from 'express';
import { createBooking, cancelBooking, getMyBookings, getBookingById, getBookingQR } from '../controllers/booking.controller';
import { getLines, getLineById, getTrips, getTripById } from '../controllers/search.controller';
import { getTripTracking } from '../controllers/tracking.controller';
import { updateProfile, getProfile } from '../controllers/user.controller';
import { createSubscription, getUserSubscriptions, cancelSubscription } from '../controllers/subscription.controller';
import { requireRider, requireRiderOwnedBooking } from '../middleware/auth.middleware';

const router = Router();

// Endpoints for bookings
router.post('/bookings', requireRider, createBooking);
router.get('/bookings', requireRider, getMyBookings);
router.get('/bookings/:id', requireRiderOwnedBooking, getBookingById);
router.get('/bookings/:id/qr', requireRiderOwnedBooking, getBookingQR);
router.delete('/bookings/:id', requireRiderOwnedBooking, cancelBooking);

// Endpoints for searching lines and available trips (Rider role only)
router.get('/lines', requireRider, getLines);
router.get('/lines/:id', requireRider, getLineById);
router.get('/trips', requireRider, getTrips);
router.get('/trips/:id', requireRider, getTripById);

// Endpoint for tracking a specific trip
router.get('/trips/:tripId/tracking', getTripTracking);

// Profile management
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

// Subscriptions (Weekly Pass)
router.post('/subscriptions', createSubscription);
router.get('/subscriptions', getUserSubscriptions);
router.delete('/subscriptions/:id', cancelSubscription);

export default router;
