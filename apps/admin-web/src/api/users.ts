import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'RIDER' | 'DRIVER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  isActive: boolean;
  createdAt: string;
}

export interface UserBooking {
  id: string;
  seatsBooked: number;
  status: string;
  tripInstance: {
    id: string;
    departureTime: string;
    status: string;
    line: {
      name: string;
    };
    driver?: {
      name: string;
    };
  };
}

export function useUsers(tripId?: string) {
  return useQuery({
    queryKey: ['users', tripId],
    queryFn: async (): Promise<User[]> => {
      const res: any = await api.get('/admin/users', { params: { tripId } });
      return res.data;
    },
  });
}

export function useUserBookings(userId: string | null) {
  return useQuery({
    queryKey: ['user-bookings', userId],
    queryFn: async (): Promise<UserBooking[]> => {
      if (!userId) return [];
      const res: any = await api.get(`/admin/users/${userId}/bookings`);
      return res.data;
    },
    enabled: !!userId,
  });
}
