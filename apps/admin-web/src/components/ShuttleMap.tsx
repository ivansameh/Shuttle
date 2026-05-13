import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2 } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const stopIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1483/1483336.png',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

function ResizeFixer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => { map.invalidateSize(); }, 250); }, [map]);
  return null;
}

/**
 * Universal Routing Component
 * - Robust fallback logic
 * - Single line rendering
 */
function MultiStopRoute({ stops }: { stops: { lat: number, lng: number }[] }) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const activeReq = useRef(0);
  const map = useMap();

  useEffect(() => {
    if (stops.length < 2) {
      setRoute([]);
      return;
    }

    const currentReq = ++activeReq.current;

    const fetchRoute = async () => {
      try {
        const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
        
        // Use standard Route service (no loop-inducing restrictions)
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (currentReq === activeReq.current) {
          if (data.routes && data.routes[0]) {
            const path = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRoute(path);
            
            // Auto-fit to route
            if (path.length > 0) {
              const bounds = L.latLngBounds(path);
              map.fitBounds(bounds, { padding: [40, 40] });
            }
          } else {
            throw new Error("No route found");
          }
        }
      } catch (err) {
        if (currentReq === activeReq.current) {
          console.error("Routing error:", err);
          // Ultimate fallback: Simple direct lines
          setRoute(stops.map(s => [s.lat, s.lng]));
        }
      }
    };

    fetchRoute();
  }, [stops, map]);

  if (route.length === 0) return null;
  
  return (
    <Polyline 
      positions={route} 
      color="#6366f1" 
      weight={6} 
      opacity={0.85} 
      lineJoin="round" 
    />
  );
}

function MapSearch({ onLocationPick }: { onLocationPick: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const map = useMap();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        map.flyTo([newLat, newLng], 15);
        onLocationPick(newLat, newLng);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
      <form onSubmit={handleSearch} className="relative group">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search locations..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {loading ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" /> : <div className="text-slate-400">🔍</div>}
        </div>
      </form>
    </div>
  );
}

export interface ShuttleMapProps {
  mode?: 'builder' | 'tracker' | 'dispatch';
  vehiclePosition?: { lat: number; lng: number } | null;
  vehiclePositions?: { id: string; lat: number; lng: number; label?: string }[];
  initialStops?: { lat: number; lng: number }[];
  startPoint?: { lat: number; lng: number } | null;
  endPoint?: { lat: number; lng: number } | null;
  onStopsChange?: (stops: { lat: number; lng: number }[]) => void;
}

export default function ShuttleMap({ 
  mode = 'builder', 
  vehiclePosition, 
  vehiclePositions = [],
  initialStops = [],
  startPoint = null,
  endPoint = null,
  onStopsChange 
}: ShuttleMapProps) {
  const defaultCenter: [number, number] = [30.0444, 31.2357];
  const [deviceLocation, setDeviceLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeviceLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Geolocation permission denied or error:", error);
        }
      );
    }
  }, []);

  const center: [number, number] = useMemo(() => {
    if (vehiclePosition) return [vehiclePosition.lat, vehiclePosition.lng];
    if (startPoint)      return [startPoint.lat, startPoint.lng];
    if (initialStops.length > 0) return [initialStops[0].lat, initialStops[0].lng];
    if (deviceLocation)  return deviceLocation;
    return defaultCenter;
  }, [vehiclePosition?.lat, vehiclePosition?.lng, startPoint?.lat, startPoint?.lng, initialStops[0]?.lat, initialStops[0]?.lng, deviceLocation]);

  const uniqueStops = useMemo(() => {
    const seen = new Set();
    const distinctList = initialStops.filter(s => {
      const key = `${s.lat.toFixed(5)}-${s.lng.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Start with the user-defined Start Point if available, otherwise the first stop
    const root = startPoint || distinctList[0];
    if (!root && !endPoint) return [];

    const sorted: {lat: number, lng: number}[] = startPoint ? [startPoint] : (distinctList.length > 0 ? [distinctList[0]] : []);
    const remaining = distinctList.filter(s => {
       if (!startPoint) return s !== distinctList[0];
       // Don't add startPoint to the stops list twice if it's already there
       return Math.abs(s.lat - startPoint.lat) > 0.0001 || Math.abs(s.lng - startPoint.lng) > 0.0001;
    });

    while (remaining.length > 0) {
      const current = sorted[sorted.length - 1];
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const dist = Math.pow(current.lat - candidate.lat, 2) + Math.pow(current.lng - candidate.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      sorted.push(remaining[nearestIdx]);
      remaining.splice(nearestIdx, 1);
    }

    // Finally append the End Point if available
    if (endPoint) {
      const isDuplicate = sorted.some(s => Math.abs(s.lat - endPoint.lat) < 0.0001 && Math.abs(s.lng - endPoint.lng) < 0.0001);
      if (!isDuplicate) sorted.push(endPoint);
    }

    return sorted;
  }, [initialStops, startPoint, endPoint]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative', backgroundColor: '#f8fafc' }}>
      <MapContainer 
        center={center} 

        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%', borderRadius: '1.5rem', zIndex: 1 }}
      >

        <ResizeFixer />
        <ChangeView center={center} zoom={13} />
        
        {/* Clean Voyager Layer - NO BUILT-IN BUS LINES */}
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* ROAD ROUTE */}
        <MultiStopRoute stops={uniqueStops} />

        {/* STOP MARKERS */}
        {uniqueStops.map((stop, idx) => {
          // Identify if it's start or end for custom icons
          let icon = stopIcon;
          let label = `Stop ${idx + 1}`;
          
          if (startPoint && Math.abs(stop.lat - startPoint.lat) < 0.0001 && Math.abs(stop.lng - startPoint.lng) < 0.0001) {
            icon = startIcon;
            label = "START POINT";
          } else if (endPoint && Math.abs(stop.lat - endPoint.lat) < 0.0001 && Math.abs(stop.lng - endPoint.lng) < 0.0001) {
            icon = endIcon;
            label = "END POINT";
          }

          return (
            <Marker key={`stop-${idx}-${stop.lat}`} position={[stop.lat, stop.lng]} icon={icon}>
              <Popup><div className="font-bold text-xs uppercase">{label}</div></Popup>
            </Marker>
          );
        })}

        {/* VEHICLE MARKERS */}
        {mode === 'dispatch' && vehiclePositions.map((vp, i) => (
          <Marker key={`bus-${i}`} position={[vp.lat, vp.lng]} icon={busIcon}>
            <Popup><div className="font-bold">{vp.label || 'Shuttle'}</div></Popup>
          </Marker>
        ))}

        {mode === 'tracker' && vehiclePosition && (
          <Marker position={[vehiclePosition.lat, vehiclePosition.lng]} icon={busIcon}>
            <Popup>Current Location</Popup>
          </Marker>
        )}

        {/* BUILDER PLUGIN */}
        {mode === 'builder' && (
          <>
            <MapSearch onLocationPick={() => {}} />
            <MapEventsHandler onStopsChange={onStopsChange} initialStops={uniqueStops} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

function MapEventsHandler({ onStopsChange, initialStops }: any) {
  const map = useMap();
  useEffect(() => {
    if (!onStopsChange) return;
    const handleClick = (e: any) => {
      const { lat, lng } = e.latlng;
      if (initialStops.length > 0) {
        const last = initialStops[initialStops.length-1];
        if (Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001) return;
      }
      onStopsChange([...initialStops, { lat, lng }]);
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [map, onStopsChange, initialStops]);
  return null;
}
