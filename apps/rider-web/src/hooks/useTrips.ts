import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface Trip {
  id: string;
  departureTime: string;
  status: string;
  remainingSeats: number;
  totalSeats: number;
  line: { 
    id: string; 
    name: string; 
    fixedPrice: number; 
    currency: string;
    startPointName?: string;
    endPointName?: string;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
    stops?: { id: string, name: string, lat: number, lng: number, orderIndex: number }[];
  };
  driver?: { name: string };
  vehicle?: { licensePlate: string; capacity?: number };
}

export const useTrips = (params: { lineId?: string; date?: string; userLat?: number; userLng?: number }) => {
  return useQuery<Trip[]>({
    queryKey: ['trips', params],
    queryFn: async () => {
      const res = await api.get('/rider/trips', { params }) as any;
      return res.data ?? res;
    },
    enabled: !!(params.lineId || params.date || (params.userLat && params.userLng))
  });
};

export const useTripDetail = (lineId: string) => {
  return useQuery({
    queryKey: ['line', lineId],
    queryFn: async () => {
      const res = await api.get(`/rider/lines/${lineId}`) as any;
      return res.data ?? res;
    },
    enabled: !!lineId,
  });
};
