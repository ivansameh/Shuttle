import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

// --- Types ---
export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  isActive: boolean;
  createdAt: string;
  vehicles?: {
    id: string;
    licensePlate: string;
    make: string;
    model: string;
  }[];
}

export function useApproveDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.patch(`/admin/drivers/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeclineDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.patch(`/admin/drivers/${id}/decline`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number | null;
  capacity: number;
  isActive: boolean;
}

// --- Hooks for Drivers ---
export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async (): Promise<Driver[]> => {
      const res: any = await api.get('/admin/drivers');
      return res.data;
    },
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Driver> & { password?: string }) => {
      const res: any = await api.post('/admin/drivers', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

// --- Hooks for Vehicles ---
export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async (): Promise<Vehicle[]> => {
      const res: any = await api.get('/admin/vehicles');
      return res.data;
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const res: any = await api.post('/admin/vehicles', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDriverProfile(id: string | null) {
  return useQuery({
    queryKey: ['driverProfile', id],
    queryFn: async () => {
      if (!id) return null;
      const res: any = await api.get(`/admin/drivers/${id}/profile`);
      return res.data;
    },
    enabled: !!id,
  });
}

