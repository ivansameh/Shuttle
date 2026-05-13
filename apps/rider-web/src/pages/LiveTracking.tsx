import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { io, Socket } from 'socket.io-client';
import {
  ArrowLeft, Bus, MapPin, Clock, Users,
  Wifi, WifiOff, Navigation
} from 'lucide-react';
import ShuttleMap from '../components/ShuttleMap';
import { sortStopsGreedy } from '../lib/routing';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { formatTime, formatDate } from '../utils/formatters';

interface BusLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

interface TripInfo {
  id: string;
  departureTime: string;
  status: string;
  line: { 
    name: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    stops?: { id: string; name: string; lat: number; lng: number }[];
  };
  completedStopIds?: string[];
  driver?: { name: string };
  vehicle?: { licensePlate: string };
}

export default function LiveTracking() {
  const { tripId }           = useParams<{ tripId: string }>();
  const { token, user }      = useAuthStore();
  const navigate             = useNavigate();
  const queryClient          = useQueryClient();
  const socketRef            = useRef<Socket | null>(null);

  useEffect(() => {
    if (!tripId) navigate('/rider/home');
  }, [tripId, navigate]);

  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [connected, setConnected]     = useState(false);
  const [lastUpdate, setLastUpdate]   = useState<string | null>(null);
  const [pingCount, setPingCount]     = useState(0);
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);

  // Fetch trip info
  const { data: tracking } = useQuery<{ trip: TripInfo; livePosition: BusLocation | null }>({
    queryKey: ['trip-track', tripId],
    queryFn: async () => {
      const res = await api.get(`/rider/trips/${tripId}/tracking`) as any;
      return res.data ?? res;
    },
    enabled: !!tripId,
  });

  const trip = tracking?.trip;

  // Initialize bus location from REST snapshot
  useEffect(() => {
    if (tracking?.livePosition && !busLocation) {
      setBusLocation(tracking.livePosition);
    }
    if (tracking?.trip?.completedStopIds) {
      setCompletedStopIds(tracking.trip.completedStopIds);
    }
  }, [tracking]);

  // Connect to Socket.IO for live location updates
  useEffect(() => {
    if (!tripId || !token || !user) return;

    const socket = io('http://localhost:3001', {
      auth: { 
        token,
        userId: user.id,
        role: user.role
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Subscribe to this specific trip's tracking room
      socket.emit('subscribe_trip', { tripId });
    });

    socket.on('disconnect', () => setConnected(false));

    // Listen for GPS pings emitted by the driver
    socket.on('trip_update', (data: BusLocation) => {
      setBusLocation(data);
      setLastUpdate(new Date().toLocaleTimeString());
      setPingCount(prev => prev + 1);
    });

    // Listen for lifecycle changes (Trip Start/End/Cancel)
    socket.on('trip_status_update', (data: { status: string }) => {
      console.log(`[Socket] Trip status updated to: ${data.status}`);
      // Refresh current page data to show new status or redirect if ended
      queryClient.invalidateQueries({ queryKey: ['trip-track', tripId] });
      
      if (data.status === 'COMPLETED') {
        alert('This trip has reached its destination. Thank you for riding with Shuttle!');
        navigate('/rider/bookings');
      }
      if (data.status === 'CANCELLED') {
        alert('This trip has been cancelled by the driver.');
        navigate('/rider/home');
      }
    });


    // Listen for stop-by-stop progress
    socket.on('trip_progress_update', (data: { completedStopIds: string[] }) => {
      console.log('[Socket] Trip progress updated:', data.completedStopIds);
      setCompletedStopIds(data.completedStopIds);
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId, token, user]);

  const sortedStops = useMemo(() => {
    if (!trip?.line?.stops) return [];
    return sortStopsGreedy(trip.line.stops);
  }, [trip?.line?.stops]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Back to my trips</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">{trip?.line?.name ?? 'Loading…'}</h1>
          <p className="text-muted text-sm mt-0.5">Live bus tracking</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border ${
          connected
            ? 'bg-success/10 text-success border-success/30'
            : 'bg-error/10 text-error border-error/30'
        }`}>
          {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-surface border border-border" style={{ height: '360px' }}>
        <ShuttleMap 
          mode="tracker" 
          vehiclePosition={busLocation ? { lat: busLocation.lat, lng: busLocation.lng } : null}
          startPoint={trip?.line ? { lat: trip.line.startLat, lng: trip.line.startLng } : null}
          endPoint={trip?.line ? { lat: trip.line.endLat, lng: trip.line.endLng } : null}
          initialStops={trip?.line?.stops || []}
        />

        {/* Last update badge */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          {lastUpdate && (
            <div className="bg-surface/90 backdrop-blur rounded-xl px-3 py-1.5 text-xs text-foreground border border-border shadow-sm">
              <Clock className="w-3 h-3 inline mr-1 text-muted" />
              Updated {lastUpdate}
            </div>
          )}
          {pingCount > 0 && (
            <div className="bg-accent/90 backdrop-blur rounded-xl px-3 py-1.5 text-[10px] text-white border border-accent/20 font-black uppercase tracking-widest text-right shadow-sm">
              {pingCount} Live Pings
            </div>
          )}
        </div>
      </div>

      {/* Trip info cards */}
      <div className="grid grid-cols-2 gap-4">
        {trip && (
          <>
            <Card padding="md">
              <div className="flex items-center gap-2 text-muted text-xs mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Departure</span>
              </div>
              <p className="text-foreground font-bold">
                {formatTime(trip.departureTime)}
              </p>
              <p className="text-muted text-xs">
                {formatDate(trip.departureTime, { weekday: 'short' })}
              </p>
            </Card>

            <Card padding="md">
              <div className="flex items-center gap-2 text-muted text-xs mb-2">
                <Bus className="w-3.5 h-3.5" />
                <span>Status</span>
              </div>
              <p className={`font-bold ${
                trip.status === 'IN_PROGRESS' ? 'text-success' :
                trip.status === 'SCHEDULED'   ? 'text-primary-600' : 'text-muted'
              }`}>
                {(trip.status || '').replace('_', ' ')}
              </p>
              {trip.driver && <p className="text-muted text-xs">{trip.driver.name}</p>}
            </Card>
          </>
        )}
      </div>

      {/* Stops list */}
      {sortedStops.length > 0 && (
        <Card padding="md">
          <h3 className="text-foreground font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-500" />
            Route Stops
          </h3>
          <div className="space-y-0">
            {sortedStops.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                    completedStopIds.includes(s.id) ? 'bg-success border-success scale-75 opacity-50' :
                    i === 0 ? 'bg-primary-500 border-primary-500' :
                    i === sortedStops.length - 1 ? 'bg-accent border-accent' :
                    'bg-transparent border-border'
                  }`} />
                  {i < sortedStops.length - 1 && <div className={`w-px h-6 mt-0.5 transition-colors duration-500 ${
                    completedStopIds.includes(s.id) ? 'bg-success/40' : 'bg-border'
                  }`} />}
                </div>
                <span className={`text-sm transition-all ${
                  completedStopIds.includes(s.id) ? 'text-muted line-through opacity-50' :
                  i === 0 || i === sortedStops.length - 1 ? 'text-foreground font-semibold' : 'text-muted'
                }`}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
