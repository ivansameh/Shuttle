import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MapPin, Navigation, Wifi, WifiOff, AlertCircle, 
  CheckCircle, Play, ClipboardList, UserCheck, UserX, 
  Clipboard, ArrowRight, Search, MessageSquare 
} from 'lucide-react';
import ShuttleMap from '../../components/ShuttleMap';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface Booking {
  id: string;
  seatsBooked: number;
  status: 'PENDING' | 'CONFIRMED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  user: { name: string };
  pickupStop: { name: string } | null;
  dropoffStop: { name: string } | null;
}

export default function DriverTracking() {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch the active or next trip
  useEffect(() => {
    const fetchActiveTrip = async () => {
      try {
        const { data } = await api.get('/driver/schedule');
        const running = data.find((t: any) => t.status === 'IN_PROGRESS');
        const upcoming = data.find((t: any) => t.status === 'SCHEDULED');
        
        if (running) {
          setActiveTrip(running);
          setCompletedStopIds(running.completedStopIds || []);
        } else if (upcoming) {
          setActiveTrip(upcoming);
          setCompletedStopIds(upcoming.completedStopIds || []);
        } else {
          setError('No active or upcoming trips found.');
        }
      } catch (err) {
        setError('Failed to load trip information.');
      }
    };
    fetchActiveTrip();
  }, []);

  // 1b. Fetch manifest for the active trip
  const { data: manifestData } = useQuery({
    queryKey: ['trip-manifest', activeTrip?.id],
    queryFn: async () => {
      const res = await api.get(`/driver/trips/${activeTrip.id}/manifest`);
      return res.data;
    },
    enabled: !!activeTrip?.id,
  });

  const bookings = manifestData?.bookings || [];

  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: 'BOARDED' | 'NO_SHOW' }) => {
      await api.patch(`/driver/trips/${activeTrip.id}/bookings/${bookingId}`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-manifest', activeTrip?.id] }),
  });

  const tripStatusMutation = useMutation({
    mutationFn: async (status: 'IN_PROGRESS' | 'COMPLETED') => {
      await api.patch(`/driver/trips/${activeTrip.id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-manifest', activeTrip?.id] });
      // Refresh active trip after status change
      window.location.reload(); 
    },
  });

  // 2. Socket Connection & Broadcasting logic
  useEffect(() => {
    if (!token || !activeTrip || !user) return;

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
      setError(null);
      // Join the trip room
      socket.emit('start_driving', { tripId: activeTrip.id });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('error', (err) => setError(err.message));

    // 3. Forced 1-second High Frequency Update Interval
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          
          // Update local map
          setPosition(newPos);

          // Broadcast to server (Passengers & Admin)
          if (socket.connected) {
            socket.emit('location_ping', {
              tripId: activeTrip.id,
              lat: newPos.lat,
              lng: newPos.lng,
              timestamp: new Date().toISOString()
            });
            setPingCount(prev => prev + 1);
            setLastPingTime(new Date().toLocaleTimeString());
          }
        },
        (err) => console.error('Geolocation Error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }, 7000); // 7000ms = 7 seconds

    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, [token, activeTrip, user]);

  const mapStops = useMemo(() => {
    const rawStops = activeTrip?.line.stops?.map((s: any) => ({ 
      id: s.id, 
      name: s.name, 
      lat: s.lat, 
      lng: s.lng 
    })) || [];
    
    const remaining = rawStops.filter((s: any) => !completedStopIds.includes(s.id));
    
    // Feature Fix: Skip stops with no passengers (neglect irrelevant points)
    const relevant = remaining.filter((s: any) => {
      return bookings.some((b: any) => b.pickupStopId === s.id || b.dropoffStopId === s.id);
    });

    if (relevant.length <= 1) return relevant;

    // Geographic Greedy Sort (Greedy TSP logic)
    // Start from current vehicle position or line start
    const sorted: any[] = [];
    const pool = [...relevant];
    let refLat = position?.lat || activeTrip.line.startLat;
    let refLng = position?.lng || activeTrip.line.startLng;

    while (pool.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const dist = Math.sqrt(Math.pow(pool[i].lat - refLat, 2) + Math.pow(pool[i].lng - refLng, 2));
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      const next = pool.splice(nearestIdx, 1)[0];
      sorted.push(next);
      refLat = next.lat;
      refLng = next.lng;
    }
    return sorted;
  }, [activeTrip?.line.stops, completedStopIds, position, activeTrip?.line.startLat, activeTrip?.line.startLng, bookings]);

  return (
    <div className="animate-slide-up space-y-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3 tracking-tight">
            <Navigation className="w-8 h-8 text-primary-600 animate-pulse" />
            Live Dispatch
          </h1>
          <p className="text-muted text-sm mt-1 font-medium">
            {activeTrip ? `Broadcasting: ${activeTrip.line.name}` : 'Ready to start tracking.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTrip?.line.stops && activeTrip.line.stops.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Navigation className="w-3.5 h-3.5" />}
              onClick={() => {
                const nextStop = mapStops[0];
                if (nextStop) {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${nextStop.lat},${nextStop.lng}&travelmode=driving`, '_blank');
                }
              }}
            >
              Google Maps
            </Button>
          )}

          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black uppercase tracking-widest ${
            connected ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
          }`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/30 p-4 rounded-2xl flex items-center gap-3 text-error animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Control Panel (Start/Stop) */}
      <div className="flex gap-3">
        {activeTrip?.status === 'SCHEDULED' ? (
          <Button 
            onClick={() => tripStatusMutation.mutate('IN_PROGRESS')}
            isLoading={tripStatusMutation.isPending}
            fullWidth
            size="lg"
            leftIcon={<Play className="w-5 h-5" />}
          >
            Start Trip
          </Button>
        ) : activeTrip?.status === 'IN_PROGRESS' ? (
          <Button 
            variant="danger"
            onClick={() => tripStatusMutation.mutate('COMPLETED')}
            isLoading={tripStatusMutation.isPending}
            fullWidth
            size="lg"
            leftIcon={<CheckCircle className="w-5 h-5" />}
          >
            Finish Trip
          </Button>
        ) : null}
      </div>

      {/* ── MAP CONTAINER ────────────────────────────────── */}
      <Card padding="none" className="overflow-hidden relative border-gray-200 shadow-xl shrink-0" style={{ height: '350px' }}>
        <ShuttleMap 
          mode="tracker" 
          isDriverView={true}
          vehiclePosition={position} 
          initialStops={mapStops}
        />
        
        {/* Status overlay */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md border border-gray-200 p-4 rounded-2xl flex flex-col gap-1 min-w-[180px] shadow-lg">
           <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${position ? 'bg-success' : 'bg-warning animate-pulse'}`}></div>
              <span className="text-[11px] font-black text-foreground uppercase tracking-wider">
                {position ? 'Live Broadcast' : 'Locating...'}
              </span>
           </div>
           {lastPingTime && <p className="text-[10px] text-primary-600 font-bold">Last Sent: {lastPingTime}</p>}
        </div>
      </Card>

      {/* ── MANIFEST SECTION ─────────────────────────────── */}
      <div className="space-y-4 flex flex-col pt-2">
        {mapStops.length > 0 && (
          <div className="bg-accent/10 border border-accent/20 p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-accent/5">
            <div>
              <p className="text-[10px] font-black uppercase text-accent tracking-widest mb-1">Upcoming Point</p>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" /> {mapStops[0]?.name}
              </h4>
            </div>
            <button 
              onClick={async () => {
                const finishedId = mapStops[0].id;
                setCompletedStopIds(prev => [...prev, finishedId]);
                
                // Persistence Fix: Save to DB so refreshed/restarted sessions resume here
                try {
                  await api.patch(`/driver/trips/${activeTrip.id}/stops`, { stopId: finishedId });
                } catch (err) {
                  console.error("Failed to persist stop progress", err);
                }

                // Root Fix: Trigger backend reorder to sync DB for all sections
                try {
                  await api.post(`/admin/lines/${activeTrip.line.id}/reorder`);
                } catch (err) {
                  console.error("Backend reorder failed", err);
                }
              }}
              className="px-4 py-2 bg-success/20 text-success border border-success/30 rounded-xl text-[10px] font-black uppercase hover:bg-success hover:text-white transition-all transition-duration-300"
            >
              Arrived
            </button>
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Search passenger list..." 
            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-2.5">
          {bookings
            .filter((b: any) => {
              const isMatch = b.user.name.toLowerCase().includes(searchTerm.toLowerCase());
              if (!isMatch) return false;
              
              const nextStopId = mapStops[0]?.id;
              if (!nextStopId) return true; // Show all if no stops left

              const isNextPickup = b.pickupStopId === nextStopId;
              const isNextDropoff = b.dropoffStopId === nextStopId;
              return isNextPickup || isNextDropoff;
            })
            .map((booking: any) => (
            <Card key={booking.id} padding="md" className="group flex items-center justify-between gap-4 border-gray-100 bg-white hover:bg-gray-50 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gray-200 group-hover:bg-primary-600 transition-all"></div>
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                  booking.status === 'BOARDED' ? 'bg-success/10 text-success' : 'bg-gray-100 text-muted'
                }`}>
                  {booking.user.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base leading-tight mb-0.5">{booking.user.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      booking.pickupStopId === mapStops[0]?.id ? 'bg-primary-100 text-primary-600' : 'bg-warning/10 text-warning'
                    }`}>
                      {booking.pickupStopId === mapStops[0]?.id ? 'BOARDING' : 'DROPPING OFF'}
                    </span>
                    <span className="text-[9px] text-muted font-bold uppercase">{booking.seatsBooked} SEATS</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/driver/chat/${booking.id}`)}
                  className="w-10 h-10 p-0 rounded-xl"
                  leftIcon={<MessageSquare className="w-5 h-5 ml-2.5" />}
                />

                {booking.status !== 'BOARDED' && (
                  <Button 
                    variant="success"
                    size="sm"
                    onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: 'BOARDED' })}
                    className="w-10 h-10 p-0 rounded-xl"
                    leftIcon={<UserCheck className="w-5 h-5 ml-2.5" />}
                  />
                )}
                {booking.status !== 'BOARDED' && booking.status !== 'NO_SHOW' && (
                  <Button 
                    variant="danger"
                    size="sm"
                    onClick={() => updateBookingMutation.mutate({ bookingId: booking.id, status: 'NO_SHOW' })}
                    className="w-10 h-10 p-0 rounded-xl"
                    leftIcon={<UserX className="w-5 h-5 ml-2.5" />}
                  />
                )}
                {booking.status === 'BOARDED' && mapStops[0] && booking.dropoffStopId !== mapStops[0].id && (
                  <div className="px-3 flex items-center justify-center text-success font-black text-[10px] uppercase bg-success/5 rounded-lg border border-success/10">
                    On Board
                  </div>
                )}
              </div>
            </Card>
          ))}
          
          {bookings.length > 0 && mapStops[0] && bookings.filter((b: any) => {
             const nextStopId = mapStops[0]?.id;
             return (b.pickupStopId === nextStopId || b.dropoffStopId === nextStopId);
          }).length === 0 && (
            <div className="py-10 text-center text-muted italic text-xs rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
              No passengers for this stop.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
