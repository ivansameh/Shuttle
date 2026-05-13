import { Router } from 'express';
import { AdminDriverController } from '../controllers/admin-driver.controller';
import { AdminController } from '../controllers/admin.controller';
import { StopController } from '../controllers/stop.controller';
import { VehicleController } from '../controllers/vehicle.controller';
import { getDispatchFeed } from '../controllers/dispatch.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { requireAdmin } from '../middleware/auth.middleware';
import { cacheAnalytics } from '../middleware/cache.middleware';

const router = Router();

// All routes here require admin privileges
router.use(requireAdmin);

// Financial Analytics
router.get('/analytics/kpis', cacheAnalytics, AnalyticsController.getKpis);
router.get('/analytics/time-series', cacheAnalytics, AnalyticsController.getTimeSeriesData);
router.get('/analytics/transactions', AnalyticsController.getRecentTransactions);

// Dashboard / Live Dispatch
router.get('/dispatch', getDispatchFeed);

// Lines & Trips (Internal to AdminController)
router.post('/lines', AdminController.createLine);
router.get('/lines', AdminController.getLines);
router.patch('/lines/:id', AdminController.updateLineDetails);
router.delete('/lines/:id', AdminController.deleteLine);
router.post('/trips', AdminController.scheduleTrip);
router.get('/trips', AdminController.getTrips);
router.get('/trips/:id/manifest', AdminController.getTripManifest);
router.patch('/trips/:id/driver', AdminController.reassignDriver);
router.patch('/trips/:id', AdminController.updateTrip);
router.patch('/trips/:id/cancel', AdminController.cancelTrip);
router.post('/schedules', AdminController.addSchedule);
router.post('/trips/generate', AdminController.generateTrips);
router.post('/trips/cancel-range', AdminController.cancelTripsInRange);

// Drivers (Phase 3.3 Admin Driver CRUD)
router.post('/drivers', AdminDriverController.createDriver);
router.get('/drivers', AdminDriverController.getDrivers);
router.patch('/drivers/:id/approve', AdminDriverController.approveDriver);
router.patch('/drivers/:id/decline', AdminDriverController.declineDriver);
router.get('/drivers/:id/profile', AdminDriverController.getDriverProfile);
router.delete('/drivers/:id', AdminDriverController.deleteDriver);

// Users (Riders + Management)
router.get('/users', AdminController.getUsers);
router.get('/users/:id/bookings', AdminController.getUserBookings);

// Notifications
router.post('/notifications/broadcast', AdminController.broadcastNotification);


// Vehicles
router.post('/vehicles', VehicleController.createVehicle);
router.get('/vehicles', VehicleController.getVehicles);
router.patch('/vehicles/:id', VehicleController.updateVehicle);
router.delete('/vehicles/:id', VehicleController.deleteVehicle);

// Stops
router.post('/stops', StopController.createStop);
router.get('/lines/:lineId/stops', StopController.getStopsByLine);
router.patch('/stops/:id', StopController.updateStop);
router.delete('/stops/:id', StopController.deleteStop);
router.post('/lines/:lineId/reorder', StopController.reorderStopsGeographically);

export default router;
