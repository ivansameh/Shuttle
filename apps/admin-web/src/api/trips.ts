import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

// --- Types ---
export interface TripInstance {
  id: string;
  lineId: string;
  driverId: string | null;
  vehicleId: string | null;
  departureTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalSeats: number;
  remainingSeats: number;
  line?: { name: string };
  driver?: { name: string } | null;
  vehicle?: { licensePlate: string; capacity: number } | null;
}

// --- Hooks ---
export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: async (): Promise<TripInstance[]> => {
      const res: any = await api.get('/admin/trips');
      return res.data;
    },
  });
}

export function useScheduleTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { lineId: string; departureTime: string; driverId?: string; vehicleId?: string }) => {
      const res: any = await api.post('/admin/trips', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; departureTime?: string; driverId?: string | null; vehicleId?: string | null }) => {
      const res: any = await api.patch(`/admin/trips/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useReassignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string }) => {
      const res: any = await api.patch(`/admin/trips/${id}/driver`, { driverId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      // Might want to invalidate dispatch and tracking too if they were polling/caching
    },
  });
}

export function useCancelTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.patch(`/admin/trips/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

// --- Manifest Hook ---
export interface ManifestEntry {
  id: string;
  seatsBooked: number;
  status: 'PENDING' | 'CONFIRMED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  user: { name: string; phone: string | null };
}

export function useTripManifest(tripId: string | null) {
  return useQuery({
    queryKey: ['manifest', tripId],
    queryFn: async (): Promise<ManifestEntry[]> => {
      if (!tripId) return [];
      const res: any = await api.get(`/admin/trips/${tripId}/manifest`);
      return res.data;
    },
    enabled: !!tripId,
  });
}

export function useGenerateTrips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { startDate: string; endDate?: string }) => {
      const res: any = await api.post('/admin/trips/generate', data);
      return res.data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useCancelTripsInRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { lineId: string; startDate: string; endDate: string; times?: string[] }) => {
      const res: any = await api.post('/admin/trips/cancel-range', data);
      return res.data;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}


