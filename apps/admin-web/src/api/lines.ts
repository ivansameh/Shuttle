import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

// --- Types ---
export interface LineSchedule {
  id: string;
  time: string;
  daysOfWeek: number[];
}

export interface Line {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  startPointName?: string;
  endLat: number;
  endLng: number;
  endPointName?: string;
  fixedPrice: number;
  commissionRate: number;
  currency: string;
  isActive: boolean;
  schedules?: LineSchedule[];
}

export interface Stop {
  id: string;
  lineId: string;
  name: string;
  lat: number;
  lng: number;
  orderIndex: number;
}

// --- Hooks ---
export function useLines() {
  return useQuery({
    queryKey: ['lines'],
    queryFn: async (): Promise<Line[]> => {
      const res: any = await api.get('/admin/lines');
      return res.data;
    },
  });
}

export function useCreateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res: any = await api.post('/admin/lines', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
    },
  });
}

export function useUpdateLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<Line> }) => {
      const res: any = await api.patch(`/admin/lines/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
    },
  });
}

export function useDeleteLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/lines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
    },
  });
}

export function useStops(lineId: string | null) {
  return useQuery({
    queryKey: ['stops', lineId],
    queryFn: async (): Promise<Stop[]> => {
      if (!lineId) return [];
      const res: any = await api.get(`/admin/lines/${lineId}/stops`);
      return res.data;
    },
    enabled: !!lineId,
  });
}

export function useCreateStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Stop>) => {
      const res: any = await api.post('/admin/stops', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stops', variables.lineId] });
    },
  });
}

export function useDeleteStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string, lineId: string }) => {
      await api.delete(`/admin/stops/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stops', variables.lineId] });
    },
  });
}

export function useUpdateStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, lineId: string, data: Partial<Stop> }) => {
      const res: any = await api.patch(`/admin/stops/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stops', variables.lineId] });
    },
  });
}

export function useAddSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, schedules }: { lineId: string, schedules: any[] }) => {
      const res: any = await api.post('/admin/schedules', { lineId, schedules });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lines'] });
    },
  });
}

