import { Router } from 'express';
import { createBooking, cancelBooking, getMyBookings, getBookingById, getBookingQR } from '../controllers/booking.controller';
import { getLines, getLineById, getTrips, getTripById } from '../controllers/search.controller';
import { getTripTracking } from '../controllers/tracking.controller';
import { updateProfile, getProfile } from '../controllers/user.controller';
import { createSubscription, getUserSubscriptions, cancelSubscription } from '../controllers/subscription.controller';
import { requireRider, requireRiderOwnedBooking, requireRiderTrackingAccess } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateBookingSchema } from '../schemas';

const router = Router();

// Endpoints for bookings
router.post('/bookings', requireRider, validate(CreateBookingSchema), createBooking);
router.get('/bookings', requireRider, getMyBookings);
router.get('/bookings/:id', requireRiderOwnedBooking, getBookingById);
router.get('/bookings/:id/qr', requireRiderOwnedBooking, getBookingQR);
router.delete('/bookings/:id', requireRiderOwnedBooking, cancelBooking);

// Endpoints for searching lines and available trips (Rider role only)
router.get('/lines', requireRider, getLines);
router.get('/lines/:id', requireRider, getLineById);
router.get('/trips', requireRider, getTrips);
router.get('/trips/:id', requireRider, getTripById);

// Endpoint for tracking a specific trip (Requires a confirmed booking for that trip)
router.get('/trips/:tripId/tracking', requireRiderTrackingAccess, getTripTracking);

// Profile management
router.get('/profile', requireRider, getProfile);
router.patch('/profile', requireRider, updateProfile);

// Subscriptions (Weekly Pass)
router.post('/subscriptions', requireRider, createSubscription);
router.get('/subscriptions', requireRider, getUserSubscriptions);
router.delete('/subscriptions/:id', requireRider, cancelSubscription);

export default router;
