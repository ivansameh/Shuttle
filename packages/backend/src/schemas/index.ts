import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['RIDER', 'DRIVER', 'ADMIN']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateBookingSchema = z.object({
  tripInstanceId: z.string().uuid('Invalid trip instance ID'),
  seatsBooked: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseInt(val, 10) : val),
  pickupStopId: z.string().uuid('Invalid pickup stop ID').optional().nullable(),
  dropoffStopId: z.string().uuid('Invalid dropoff stop ID').optional().nullable(),
});

export const CreateLineSchema = z.object({
  name: z.string().min(3, 'Line name must be at least 3 characters'),
  startLat: z.number(),
  startLng: z.number(),
  fixedPrice: z.number().positive('Price must be positive'),
});

export const ScheduleTripSchema = z.object({
  lineId: z.string().uuid('Invalid line ID'),
  departureTime: z.string().datetime('Invalid departure time format (ISO 8601)'),
  driverId: z.string().uuid('Invalid driver ID').optional(),
  vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
});
