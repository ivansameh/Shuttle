import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api }         from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  Search, MapPin, Calendar, ArrowRight, Bus, Clock,
  Users, Tag, ChevronRight, X, Loader2, Zap, AlertCircle,
  Home as HomeIcon, Briefcase, Navigation, Save, CreditCard
} from 'lucide-react';
import { sortStopsGreedy, fetchRouteInfo } from '../lib/routing';
import ShuttleMap from '../components/ShuttleMap';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import BookingModal from '../components/BookingModal';
import { useTrips, Trip } from '../hooks/useTrips';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';

/* ─── Types ─────────────────────────────────────────── */
interface Stop { id: string; name: string; orderIndex: number; lat: number; lng: number; }
interface Line  { id: string; name: string; fixedPrice: number; currency: string; stops: Stop[]; startLat?: number; startLng?: number; endLat?: number; endLng?: number; }

/* ─── Helpers ────────────────────────────────────────── */
function seatColor(remaining: number, total: number) {
  const pct = remaining / Math.max(total, 1);
  if (pct > 0.5) return 'bg-success';
  if (pct > 0.2) return 'bg-warning';
  return 'bg-error';
}
function seatLabel(remaining: number) {
  if (remaining === 0) return 'Full';
  if (remaining <= 3)  return `Only ${remaining} left!`;
  return `${remaining} seats`;
}
function seatBadgeClass(remaining: number) {
  if (remaining === 0) return 'badge-error';
  if (remaining <= 3)  return 'badge-warning';
  return 'badge-success';
}

/* ─── Skeleton cards ─────────────────────────────────── */
function TripSkeleton() {
  return (
    <div className="card space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="skeleton w-12 h-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>
        <div className="skeleton h-8 w-20 rounded-xl" />
      </div>
      <div className="skeleton h-1.5 w-full rounded-full" />
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function Home() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();

  // Search state
  const [fromStop, setFromStop] = useState('');
  const [toStop,   setToStop]   = useState('');
  const [date,     setDate]     = useState('');
  const [searched, setSearched] = useState(false);

  // Modal state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Geolocation
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location access denied", err)
      );
    }
  }, []);

  /* ── Save Home/Work Locations ── */
  const [showSettings, setShowSettings] = useState(false);
  const { login } = useAuthStore();
  const { mutate: updateProfile, isPending: updating } = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.patch('/rider/profile', data) as any;
      return res.data ?? res;
    },
    onSuccess: (updatedUser) => {
      // Vital: Update the local store so the UI reacts
      if (updatedUser) {
        // We use login to update the user object while keeping the token
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          login(updatedUser, currentToken);
        }
      }
      setShowSettings(false);
    }
  });

  const saveCommute = async (type: 'home' | 'work') => {
    if (!userLocation) return alert("Wait for location to load");
    
    let address = `Location at ${new Date().toLocaleTimeString()}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        address = data.display_name.split(',').slice(0, 2).join(','); // Take first two parts for brevity
      }
    } catch (e) { console.error("Reverse geocode failed", e); }

    updateProfile({
      [`${type}Lat`]: userLocation.lat,
      [`${type}Lng`]: userLocation.lng,
      [`${type}Address`]: address
    });
  };

  /* ── Commute Mode ── */
  const handleCommuteMode = (to: 'home' | 'work') => {
    if (to === 'work') {
      if (!user?.homeLat || !user?.workLat) return setShowSettings(true);
      setFromStop(user?.homeAddress || 'My Home');
      setToStop(user?.workAddress || 'My Work');
    } else {
      if (!user?.homeLat || !user?.workLat) return setShowSettings(true);
      setFromStop(user?.workAddress || 'My Work');
      setToStop(user?.homeAddress || 'My Home');
    }
    setSearched(true);
  };
  
  const [pickingType, setPickingType] = useState<'home' | 'work' | null>(null);
  const handleMapPick = async (point: { lat: number; lng: number }) => {
    if (pickingType) {
      let address = `${pickingType.charAt(0).toUpperCase() + pickingType.slice(1)} set via Map`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          address = data.display_name.split(',').slice(0, 2).join(',');
        }
      } catch (e) { console.error("Reverse geocode failed", e); }

      updateProfile({
        [`${pickingType}Lat`]: point.lat,
        [`${pickingType}Lng`]: point.lng,
        [`${pickingType}Address`]: address
      });
      setPickingType(null);
    }
  };

  /* ── Fetch available lines (with scheduled trips) ── */
  const { data: lines = [], isLoading: linesLoading } = useQuery<Line[]>({
    queryKey: ['lines', userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const params = userLocation ? { userLat: userLocation.lat, userLng: userLocation.lng } : {};
      const res = await api.get('/rider/lines', { params }) as any;
      return res.data ?? res;
    },
  });

  /* ── Derive unique stop names for autocomplete ── */
  const allStops = useMemo(() => Array.from(
    new Set((lines || []).flatMap(l => l?.stops?.map(s => s.name) ?? []))
  ).sort(), [lines]);

  /* ── Fetch trips (using reusable hook) ── */
  const { data: rawTrips = [], isLoading: tripsLoading, refetch } = useTrips({
    date,
    userLat: userLocation?.lat,
    userLng: userLocation?.lng
  });

  const trips = useMemo(() => {
    let result = [...rawTrips];
    // 1. Geographic Proximity Filter (if doing commute search)
    const isCommuteSearch = fromStop.includes('My Home') || fromStop.includes('My Work') || toStop.includes('My Home') || toStop.includes('My Work');
    if (isCommuteSearch) {
      const originCoord = fromStop.includes('Home') ? { lat: user?.homeLat, lng: user?.homeLng } : { lat: user?.workLat, lng: user?.workLng };
      const destCoord   = toStop.includes('Home')   ? { lat: user?.homeLat, lng: user?.homeLng } : { lat: user?.workLat, lng: user?.workLng };
      if (originCoord.lat && destCoord.lat) {
        result = result.filter(t => {
          const lineDef = lines.find(l => l.id === t.line.id);
          if (!lineDef) return false;
          const stops = lineDef.stops ?? [];
          const allPoints = [...stops, { lat: lineDef.startLat, lng: lineDef.startLng }, { lat: lineDef.endLat, lng: lineDef.endLng }].filter(p => p.lat !== undefined && p.lng !== undefined) as {lat: number, lng: number}[];
          const hasNearOrigin = allPoints.some(p => Math.sqrt(Math.pow(p.lat - originCoord.lat!, 2) + Math.pow(p.lng - originCoord.lng!, 2)) < 0.01);
          const hasNearDest   = allPoints.some(p => Math.sqrt(Math.pow(p.lat - destCoord.lat!, 2) + Math.pow(p.lng - destCoord.lng!, 2)) < 0.01);
          return hasNearOrigin && hasNearDest;
        });
      }
    }
    // 2. Client-side filter by stop names
    if ((fromStop || toStop) && !isCommuteSearch) {
      result = result.filter(t => {
        const lineDef = lines.find(l => l.id === t.line.id);
        if (!lineDef) return true;
        const stops = lineDef.stops ?? [];
        const fromIdx = fromStop ? stops.findIndex(s => s.name.toLowerCase().includes(fromStop.toLowerCase())) : 0;
        const toIdxArr = toStop ? stops.map((s, i) => s.name.toLowerCase().includes(toStop.toLowerCase()) ? i : -1).filter(i => i >= 0) : [];
        const toIdx   = toIdxArr.length ? toIdxArr[toIdxArr.length - 1] : stops.length - 1;
        return fromIdx < toIdx;
      });
    }
    return result;
  }, [rawTrips, fromStop, toStop, user, lines]);

  /* ── Quick-browse lines (before search) ── */
  const displayLines = lines.filter(l =>
    !fromStop && !toStop
      ? true
      : l.stops?.some(s => s.name.toLowerCase().includes(fromStop.toLowerCase())) &&
        l.stops?.some(s => s.name.toLowerCase().includes(toStop.toLowerCase()))
  );

  function handleSearch() {
    setSearched(true);
    refetch();
  }

  function handleTripClick(trip: Trip) {
    const fullLine = lines.find(l => l.id === trip.line.id);
    setSelectedTrip({
      ...trip,
      line: {
        ...trip.line,
        startLat: fullLine?.startLat,
        startLng: fullLine?.startLng,
        endLat: fullLine?.endLat,
        endLng: fullLine?.endLng,
      }
    });
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">

        {/* ── Hero Search Card ─────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-primary-900 border border-primary-800 p-6 md:p-8 shadow-xl">
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

          <div className="relative">
            <p className="text-primary-100 text-sm font-medium mb-0.5">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-5">
              {user?.name?.split(' ')[0]} 👋
            </h1>

            {/* From / To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="relative">
                <label className="input-label text-white/70">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300 pointer-events-none" />
                  <input
                    id="search-from"
                    value={fromStop}
                    onChange={e => setFromStop(e.target.value)}
                    list="from-stops"
                    placeholder="Departure stop…"
                    className="w-full bg-primary-800/50 border border-primary-700 rounded-xl px-4 pl-10 py-3.5 text-white placeholder-primary-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px] transition-all"
                  />
                  <datalist id="from-stops">
                    {allStops.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>

              <div className="relative">
                <label className="input-label text-white/70">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300 pointer-events-none" />
                  <input
                    id="search-to"
                    value={toStop}
                    onChange={e => setToStop(e.target.value)}
                    list="to-stops"
                    placeholder="Destination stop…"
                    className="w-full bg-primary-800/50 border border-primary-700 rounded-xl px-4 pl-10 py-3.5 text-white placeholder-primary-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px] transition-all"
                  />
                  <datalist id="to-stops">
                    {allStops.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Date + Search button */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="input-label text-white/70">Date (optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300 pointer-events-none" />
                  <input
                    id="search-date"
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-primary-800/50 border border-primary-700 rounded-xl px-4 pl-10 py-3.5 text-white placeholder-primary-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[48px] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <Button
                  id="search-btn"
                  onClick={handleSearch}
                  leftIcon={<Search className="w-4 h-4" />}
                  className="bg-white text-primary-900 hover:bg-gray-50 shadow-[0_15px_40px_rgba(0,0,0,0.4)] hover:-translate-y-1"
                >
                  <span className="hidden sm:inline">Explore</span>
                </Button>
              </div>
            </div>

            {/* Commute Mode Toggle */}
            <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
               <button 
                onClick={() => handleCommuteMode('work')}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl py-3 px-4 flex items-center gap-3 transition-colors"
               >
                 <Briefcase className="w-5 h-5 text-primary-300" />
                 <div className="text-left">
                   <p className="text-[10px] font-bold text-primary-200 uppercase tracking-wider">To Work</p>
                   <p className="text-sm font-bold text-white truncate">{user?.workAddress || 'Set Work'}</p>
                 </div>
               </button>
               <button 
                onClick={() => handleCommuteMode('home')}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl py-3 px-4 flex items-center gap-3 transition-colors"
               >
                 <HomeIcon className="w-5 h-5 text-primary-300" />
                 <div className="text-left">
                   <p className="text-[10px] font-bold text-primary-200 uppercase tracking-wider">To Home</p>
                   <p className="text-sm font-bold text-white truncate">{user?.homeAddress || 'Set Home'}</p>
                 </div>
               </button>
            </div>
          </div>
        </div>

        {/* ── Home & Work Quick Setup ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Section */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 border border-primary-100">
                  <HomeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Home</h3>
                  <p className="text-xs text-muted truncate max-w-[150px]">{user?.homeAddress || 'Not set'}</p>
                </div>
              </div>
              {user?.homeLat && <div className="w-2 h-2 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" fullWidth onClick={() => saveCommute('home')} leftIcon={<Zap className="w-3 h-3 text-accent" />}>
                Current
              </Button>
              <Button size="sm" variant="secondary" fullWidth onClick={() => setPickingType('home')} leftIcon={<MapPin className="w-3 h-3 text-primary-500" />}>
                Map
              </Button>
            </div>
          </Card>

          {/* Work Section */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent border border-accent/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Work</h3>
                  <p className="text-xs text-muted truncate max-w-[150px]">{user?.workAddress || 'Not set'}</p>
                </div>
              </div>
              {user?.workLat && <div className="w-2 h-2 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" fullWidth onClick={() => saveCommute('work')} leftIcon={<Zap className="w-3 h-3 text-accent" />}>
                Current
              </Button>
              <Button size="sm" variant="secondary" fullWidth onClick={() => setPickingType('work')} leftIcon={<MapPin className="w-3 h-3 text-primary-500" />}>
                Map
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Results / Browse ─────────────────────────── */}
        <div>
          {searched ? (
            /* Search results */
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-foreground">Results</h2>
                <button
                  onClick={() => { setSearched(false); setFromStop(''); setToStop(''); setDate(''); }}
                  className="text-xs text-muted hover:text-error transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              </div>

              {tripsLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <TripSkeleton key={i} />)}
                </div>
              ) : trips.length === 0 ? (
                <Card padding="lg" className="text-center items-center">
                  <Bus className="w-12 h-12 text-muted mb-3 opacity-40" />
                  <p className="text-foreground font-bold mb-1">No trips found</p>
                  <p className="text-muted text-sm">Try different stops or a different date.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {trips.map(trip => <TripCard key={trip.id} trip={trip} onClick={() => handleTripClick(trip)} />)}
                </div>
              )}
            </>
          ) : (
            /* Browse all lines */
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-foreground">Available Routes</h2>
                <span className="text-xs text-muted">{displayLines.length} routes</span>
              </div>

              {linesLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <TripSkeleton key={i} />)}
                </div>
              ) : displayLines.length === 0 ? (
                <Card padding="lg" className="text-center items-center">
                  <Bus className="w-12 h-12 text-muted mb-3 opacity-40" />
                  <p className="text-foreground font-bold mb-1">No routes available</p>
                  <p className="text-muted text-sm">Check back later for upcoming departures.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayLines.map(line => (
                    <LineCard key={line.id} line={line} onClick={() => navigate(`/rider/trips/${line.id}`)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Map Picker Modal ── */}
      {pickingType && (
        <div className="fixed inset-0 z-[110] bg-black animate-fade-in flex flex-col">
          <div className="p-4 flex items-center justify-between bg-surface/80 backdrop-blur-md border-b border-white/5">
            <h2 className="text-lg font-black text-white">Select {pickingType} on map</h2>
            <button onClick={() => setPickingType(null)} className="p-2 text-muted hover:text-white"><X className="w-6 h-6"/></button>
          </div>
          <div className="flex-1 relative">
            <ShuttleMap 
              mode="picker" 
              riderPosition={userLocation}
              onPointPick={handleMapPick}
            />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2000] w-full px-8">
              <div className="bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-white/10 text-center shadow-2xl">
                 <p className="text-white font-black text-lg mb-1">Select location</p>
                 <p className="text-sm text-muted">Tap accurately on your {pickingType} on the map below.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal (Home/Work) ── */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent" />
            
            <div className="flex justify-between items-center mb-6 pt-2">
              <h2 className="text-xl font-black text-white">Route Preferences</h2>
              <button onClick={() => setShowSettings(false)} className="text-muted hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3 mb-4 text-primary-400">
                  <HomeIcon className="w-5 h-5"/>
                  <span className="font-bold">Home Location</span>
                </div>
                <p className="text-xs text-muted mb-4 leading-relaxed italic">
                  Find your home on the map or use your current location to set this as your primary starting point.
                </p>
                <Button 
                  onClick={() => saveCommute('home')}
                  variant="secondary"
                  fullWidth
                  disabled={updating}
                  leftIcon={updating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                >
                  Set Current as Home
                </Button>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3 mb-4 text-accent">
                  <Briefcase className="w-5 h-5"/>
                  <span className="font-bold">Work Location</span>
                </div>
                <p className="text-xs text-muted mb-4 leading-relaxed italic">
                  Set your office or recurring destination to enable one-tap route searching.
                </p>
                <Button 
                  onClick={() => saveCommute('work')}
                  variant="primary"
                  fullWidth
                  disabled={updating}
                  leftIcon={updating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  className="bg-accent text-white hover:bg-accent/90 border-transparent shadow-accent/30"
                >
                  Set Current as Work
                </Button>
                <p className="text-[10px] text-muted text-center mt-6">
                  Your location data is strictly used for route discovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Modal (All-in-One Reservation) ── */}
      {selectedTrip && selectedTrip.line && (
        <BookingModal
          trip={selectedTrip}
          stops={lines.find(l => l.id === selectedTrip.line.id)?.stops ?? selectedTrip.line.stops ?? []}
          initialPickup={(() => {
            const stops = lines.find(l => l.id === selectedTrip.line.id)?.stops ?? [];
            if (fromStop.includes('Home') || fromStop.includes('Work')) {
               const target = fromStop.includes('Home') ? { lat: user?.homeLat, lng: user?.homeLng } : { lat: user?.workLat, lng: user?.workLng };
               if (!target.lat) return '';
               return [...stops].sort((a,b) => (Math.pow(a.lat - target.lat!, 2) + Math.pow(a.lng - target.lng!, 2)) - (Math.pow(b.lat - target.lat!, 2) + Math.pow(b.lng - target.lng!, 2)))[0]?.id;
            }
            return stops.find(s => s.name.toLowerCase().includes(fromStop.toLowerCase()))?.id || '';
          })()}
          initialDropoff={(() => {
            const stops = lines.find(l => l.id === selectedTrip.line.id)?.stops ?? [];
            if (toStop.includes('Home') || toStop.includes('Work')) {
               const target = toStop.includes('Home') ? { lat: user?.homeLat, lng: user?.homeLng } : { lat: user?.workLat, lng: user?.workLng };
               if (!target.lat) return '';
               return [...stops].sort((a,b) => (Math.pow(a.lat - target.lat!, 2) + Math.pow(a.lng - target.lng!, 2)) - (Math.pow(b.lat - target.lat!, 2) + Math.pow(b.lng - target.lng!, 2)))[0]?.id;
            }
            return stops.find(s => s.name.toLowerCase().includes(toStop.toLowerCase()))?.id || '';
          })()}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </>
  );
}

/* ─── Trip result card ───────────────────────────────── */
function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const pct  = trip.remainingSeats / Math.max(trip.totalSeats, 1);
  const full = trip.remainingSeats === 0;

  return (
    <Card
      id={`trip-${trip.id}`}
      onClick={full ? undefined : onClick}
      hoverable={!full}
      padding="md"
      className={`w-full text-left ${full ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-4 mb-3">
        {/* Time block */}
        <div className="text-center min-w-[52px]">
          <p className="text-2xl font-black text-foreground tabular-nums leading-none">
            {formatTime(trip.departureTime)}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {formatDate(trip.departureTime)}
          </p>
        </div>

        <div className="w-px h-10 bg-border" />

        {/* Route name */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground truncate">{trip.line.name}</p>
          {trip.driver && (
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              <Bus className="w-3 h-3" /> {trip.driver.name}
            </p>
          )}
        </div>

        {/* Price + badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-base font-black text-primary-400">{formatCurrency(trip.line.fixedPrice, trip.line.currency)}</span>
          <span className={seatBadgeClass(trip.remainingSeats)}>
            {seatLabel(trip.remainingSeats)}
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-muted shrink-0" />
      </div>

      {/* Seat availability bar */}
      <div className="seat-bar-track">
        <div className={`seat-bar-fill ${seatColor(trip.remainingSeats, trip.totalSeats || 1)}`} style={{ width: `${(pct || 0) * 100}%` }} />
      </div>
    </Card>
  );
}

/* ─── Line browse card ───────────────────────────────── */
function LineCard({ line, onClick }: { line: Line; onClick: () => void }) {
  const stops  = line.stops ?? [];
  const origin = stops[0]?.name ?? '—';
  const dest   = stops[stops.length - 1]?.name ?? '—';

  return (
    <Card
      id={`line-${line.id}`}
      onClick={onClick}
      hoverable
      padding="md"
      className="w-full text-left"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-500/15 rounded-2xl flex items-center justify-center shrink-0">
          <Bus className="w-6 h-6 text-primary-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground">{line.name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-sm text-muted overflow-hidden">
            <span className="truncate max-w-[100px]">{origin}</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[100px]">{dest}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-1.5">
            <span className="text-primary-600 text-sm font-black">{formatCurrency(line.fixedPrice, line.currency)}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted" />
        </div>
      </div>
    </Card>
  );
}
