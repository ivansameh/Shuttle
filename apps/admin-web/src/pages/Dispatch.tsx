import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { Map as MapIcon, Navigation, Wifi, WifiOff } from 'lucide-react';
import { api } from '../lib/axios';
import ShuttleMap from '../components/ShuttleMap';

interface LocationData {
  lat: number;
  lng: number;
  timestamp: string;
}

interface ActiveTrip {
  id: string;
  status: string;
  departureTime: string;
  driverId: string;
  driverName: string;
  lineId: string;
  lineName: string;
  location?: LocationData;
}

export default function Dispatch() {
  const { token } = useAuthStore();
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Fetch initial state
    const fetchInitialState = async () => {
      try {
        const response: any = await api.get('/admin/dispatch?includeScheduled=true');
        
        // Map backend "fleet" to frontend "activeTrips" with proper field mapping
        const mappedTrips = response.data.fleet.map((item: any) => ({
          id: item.tripId,
          status: item.status,
          departureTime: item.departureTime,
          driverId: item.driver?.id || '',
          driverName: item.driver?.name || 'Unassigned',
          lineId: item.line?.id || '',
          lineName: item.line?.name || 'Unknown Line',
          location: item.livePosition
        }));
        
        setActiveTrips(mappedTrips);
        
        // 2. Initialize Socket.IO connection
        const socketUrl = 'http://localhost:3001';
        
        socketRef.current = io(socketUrl, {
          auth: { token },
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
        });

        socketRef.current.on('trip_update', (data: { tripId: string, lat: number, lng: number, timestamp: string, status: string }) => {
          setActiveTrips(prev => prev.map(trip => {
            if (trip.id === data.tripId) {
              return {
                ...trip,
                location: data.lat && data.lng ? {
                  lat: data.lat,
                  lng: data.lng,
                  timestamp: data.timestamp
                } : trip.location,
                status: data.status || trip.status,
              };
            }
            return trip;
          }));
        });

        // Lifecycle updates (Trip Start/End/Cancel)
        socketRef.current.on('trip_status_update', (data: { tripId: string, status: string }) => {
          console.log(`[Socket] Admin received status update for trip ${data.tripId}: ${data.status}`);
          setActiveTrips(prev => prev.map(trip => 
            trip.id === data.tripId ? { ...trip, status: data.status } : trip
          ));
        });

      } catch (err) {
        console.error('Failed to initialize dispatch feed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialState();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Derive "Map" coordinates for UI representation safely
  // Min Lat/Lng to Max Lat/Lng to create an SVG bounding box if we had real paths.
  // Instead, we will render a sophisticated abstract radar grid.

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <MapIcon className="w-6 h-6 text-emerald-600" />
            Live Dispatch
          </h2>
          <p className="text-slate-500 text-sm mt-1">Real-time GPS tracking of active shuttles.</p>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold shadow-sm ${isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {isConnected ? <><Wifi className="w-4 h-4 animate-pulse" /> Live Streaming</> : <><WifiOff className="w-4 h-4" /> Reconnecting...</>}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: Active Trip Feed */}
        <div className="w-[350px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Active Fleet ({activeTrips.length})</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
               <div className="p-8 text-center text-slate-400">Connecting to radar...</div>
            ) : activeTrips.length === 0 ? (
               <div className="p-8 text-center text-slate-400">No active trips right now.</div>
            ) : (
              activeTrips.map(trip => (
                <div key={trip.id} className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">{trip.status}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {trip.location ? new Date(trip.location.timestamp).toLocaleTimeString() : 'Awaiting GPS...'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{trip.lineName}</h4>
                  <p className="text-xs text-slate-500 mt-1">{trip.driverName}</p>
                  
                  {trip.location && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs font-mono text-slate-500">
                      <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                      {trip.location.lat.toFixed(4)}, {trip.location.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Google Map View */}
        <div className="flex-1 rounded-2xl shadow-inner relative overflow-hidden border border-slate-200">
           <ShuttleMap 
             mode="dispatch"
             vehiclePositions={
               activeTrips
                 .filter(t => t.location)
                 .map(t => ({
                   id: t.id,
                   lat: t.location!.lat,
                   lng: t.location!.lng,
                   label: t.lineName.substring(0, 3).toUpperCase()
                 }))
             }
           />
        </div>
      </div>

    </div>
  );
}
