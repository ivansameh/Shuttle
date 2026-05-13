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
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?geometries=geojson&overview=full`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (currentReq === activeReq.current) {
          if (data.routes && data.routes[0]) {
            const path = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRoute(path);
          }
        }
      } catch (err) {
        if (currentReq === activeReq.current) {
          setRoute(stops.map(s => [s.lat, s.lng]));
        }
      }
    };

    fetchRoute();
  }, [stops, map]);

  if (route.length === 0) return null;
  return <Polyline positions={route} color="#6366f1" weight={6} opacity={0.85} lineJoin="round" />;
}

export interface ShuttleMapProps {
  mode?: 'builder' | 'tracker' | 'dispatch' | 'picker';
  vehiclePosition?: { lat: number; lng: number } | null;
  vehiclePositions?: { id: string; lat: number; lng: number; label?: string }[];
  initialStops?: { lat: number; lng: number }[];
  startPoint?: { lat: number; lng: number } | null;
  endPoint?: { lat: number; lng: number } | null;
  onStopsChange?: (stops: { lat: number; lng: number }[]) => void;
  onPointPick?: (point: { lat: number; lng: number }) => void;
  isDriverView?: boolean;
  riderPosition?: { lat: number; lng: number } | null;
}

export default function ShuttleMap({ 
  mode = 'builder', 
  vehiclePosition, 
  vehiclePositions = [],
  initialStops = [],
  startPoint = null,
  endPoint = null,
  onStopsChange,
  onPointPick,
  riderPosition = null
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
    if (riderPosition)   return [riderPosition.lat, riderPosition.lng];
    if (startPoint)      return [startPoint.lat, startPoint.lng];
    if (initialStops.length > 0) return [initialStops[0].lat, initialStops[0].lng];
    if (deviceLocation)  return deviceLocation;
    return defaultCenter;
  }, [vehiclePosition?.lat, vehiclePosition?.lng, riderPosition?.lat, riderPosition?.lng, startPoint?.lat, startPoint?.lng, initialStops[0]?.lat, initialStops[0]?.lng, deviceLocation]);

  const uniqueStops = useMemo(() => {
    const seen = new Set();
    const distinctList = initialStops.filter(s => {
      const key = `${s.lat.toFixed(5)}-${s.lng.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const root = startPoint || distinctList[0];
    if (!root && !endPoint) return [];

    const sorted: {lat: number, lng: number}[] = startPoint ? [startPoint] : (distinctList.length > 0 ? [distinctList[0]] : []);
    const remaining = distinctList.filter(s => {
       if (!startPoint) return s !== distinctList[0];
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

    if (endPoint) {
      const isDuplicate = sorted.some(s => Math.abs(s.lat - endPoint.lat) < 0.0001 && Math.abs(s.lng - endPoint.lng) < 0.0001);
      if (!isDuplicate) sorted.push(endPoint);
    }

    return sorted;
  }, [initialStops, startPoint, endPoint]);

  // Geocoding Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localCenter, setLocalCenter] = useState<[number, number]>(center);

  useEffect(() => {
    // Only force center if NOT in picker mode or if it's the very first load
    if (mode !== 'picker') {
       setLocalCenter(center);
    }
  }, [center, mode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLocalCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  function MapEvents() {
    const map = useMap();
    useEffect(() => {
      if (mode === 'picker') {
        const onClick = (e: L.LeafletMouseEvent) => {
          if (onPointPick) onPointPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        };
        map.on('click', onClick);
        return () => { map.off('click', onClick); };
      }
    }, [map]);
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      {/* Address Search Overlay */}
      {mode === 'picker' && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 1000 }}>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for an address..."
                className="w-full bg-surface/90 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-white text-sm focus:ring-2 focus:ring-primary-500 transition-all shadow-2xl"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              className="bg-primary-500 hover:bg-primary-600 text-white px-5 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
            </button>
          </form>
        </div>
      )}

      <MapContainer 
        center={localCenter} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', borderRadius: '1.5rem', zIndex: 1 }}
      >
        <ResizeFixer />
        <ChangeView center={localCenter} zoom={13} />
        <MapEvents />
        
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MultiStopRoute stops={uniqueStops} />

        {uniqueStops.map((stop, idx) => {
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

        {vehiclePosition && (
          <Marker position={[vehiclePosition.lat, vehiclePosition.lng]} icon={busIcon}>
            <Popup>Shuttle Location</Popup>
          </Marker>
        )}

        {riderPosition && (
          <Marker position={[riderPosition.lat, riderPosition.lng]}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
