import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  ArrowLeft, Bus, Clock, Tag, Users, Minus, Plus,
  CreditCard, ShieldCheck, Loader2, AlertTriangle,
  MapPin
} from 'lucide-react';
import { sortStopsGreedy } from '../lib/routing';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface Stop { id: string; name: string; lat: number; lng: number; }
interface Trip {
  id: string;
  departureTime: string;
  remainingSeats: number;
  line: { 
    id: string; 
    name: string; 
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    fixedPrice: number; 
    currency: string;
    stops: Stop[];
  };
}

export default function Checkout() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [seats, setSeats] = useState(1);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [pickupId, setPickupId]   = useState(queryParams.get('pickup') ?? '');
  const [dropoffId, setDropoffId] = useState(queryParams.get('dropoff') ?? '');

  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const res = await api.get(`/rider/trips/${tripId}`) as any;
      return res.data ?? res;
    },
    enabled: !!tripId,
  });

  const { mutate: book, isPending, error: bookingError } = useMutation({
    mutationFn: async () => {
      const res = await api.post('/rider/bookings', {
        tripInstanceId: tripId,
        seatsBooked: seats,
        // If pickup/dropoff are virtual tokens, handle them
        pickupStopId: (pickupId === 'START_POINT' || pickupId === 'END_POINT') ? null : pickupId,
        dropoffStopId: (dropoffId === 'START_POINT' || dropoffId === 'END_POINT') ? null : dropoffId,
        // Optional: tell backend it is a terminal booking if we had the fields
      }) as any;
      return res.data?.booking ?? res.booking ?? res.data ?? res;
    },
    onSuccess: (booking: any) => {
      navigate(`/rider/booking/${booking.id}`);
    },
  });

  const MAX_SEATS = Math.min(4, trip?.remainingSeats ?? 4); // Max 4 per booking rule
  const sortedStops = useMemo(() => {
    if (!trip?.line) return [];
    
    // 1. Get raw stops from DB
    const dbStops = [...trip.line.stops];
    
    // 2. Create virtual stops for Start and End terminals (so they appear in selection)
    const virtualStart: Stop = {
      id: 'START_POINT',
      name: `🏁 Start: ${trip.line.name.split('-')[0] || 'Origin'}`,
      lat: trip.line.startLat,
      lng: trip.line.startLng
    };
    
    const virtualEnd: Stop = {
      id: 'END_POINT',
      name: `🚩 End: ${trip.line.name.split('-')[1] || 'Destination'}`,
      lat: trip.line.endLat,
      lng: trip.line.endLng
    };

    // 3. Combine and sort
    const all = [virtualStart, ...dbStops];
    const sorted = sortStopsGreedy(all);
    
    // Ensure terminal is at the very end if not already
    const hasEnd = sorted.find(s => s.id === 'END_POINT');
    if (!hasEnd) sorted.push(virtualEnd);
    else {
      // Move END_POINT to the last position
      const idx = sorted.findIndex(s => s.id === 'END_POINT');
      if (idx !== -1) {
        const [token] = sorted.splice(idx, 1);
        sorted.push(token);
      }
    }

    return sorted;
  }, [trip?.line]);

  // Fetch Real Road Durations from OSRM
  const { data: stopDurations = [] } = useQuery<number[]>({
    queryKey: ['stop-durations', sortedStops.map(s => `${s.lat},${s.lng}`).join(';')],
    queryFn: async () => {
      if (sortedStops.length < 2) return [];
      const coords = sortedStops.map(s => `${s.lng},${s.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.routes && data.routes[0]) {
        const legs = data.routes[0].legs;
        let cumulative = 0;
        const durations = [0]; // First stop is at 0 minutes offset
        legs.forEach((leg: any) => {
          // Duration is in seconds, convert to minutes + add 2 min buffer for the stop itself
          cumulative += (leg.duration / 60) + 2; 
          durations.push(cumulative);
        });
        return durations;
      }
      return [];
    },
    enabled: sortedStops.length >= 2,
    staleTime: 1000 * 60 * 30, // 30 mins cache
  });

  /** 
   * Helper to calculate ETA Tip
   */
  const getEtaForStop = (idx: number) => {
    if (!trip) return "";
    const baseDate = new Date(trip.departureTime);
    
    // Use OSRM durations if available, otherwise fallback to simple estimation
    const offsetMinutes = stopDurations[idx] ?? (idx * 5); 
    
    const eta = new Date(baseDate.getTime() + offsetMinutes * 60000);
    return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Filtered Drop-off list: Must be AFTER the pickup point
   */
  const pickupIndex = useMemo(() => {
    return sortedStops.findIndex(s => s.id === pickupId);
  }, [pickupId, sortedStops]);

  const filteredDropoffStops = useMemo(() => {
    if (pickupIndex === -1) return sortedStops;
    // Only show stops that are strictly AFTER the pickup index
    return sortedStops.slice(pickupIndex + 1);
  }, [sortedStops, pickupIndex]);

  // If pickup changes and current dropoff is now invalid/upstream, reset it
  useEffect(() => {
    if (pickupId && dropoffId) {
      const pIdx = sortedStops.findIndex(s => s.id === pickupId);
      const dIdx = sortedStops.findIndex(s => s.id === dropoffId);
      if (dIdx <= pIdx) {
        setDropoffId('');
      }
    }
  }, [pickupId, sortedStops, dropoffId]);

  const total     = (trip?.line.fixedPrice ?? 0) * seats;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <Card padding="lg" className="text-center">
        <AlertTriangle className="w-10 h-10 text-error mx-auto mb-3" />
        <p className="text-foreground font-semibold">Trip not found.</p>
      </Card>
    );
  }

  const dep = new Date(trip.departureTime);

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Back to trips</span>
      </button>

      <h1 className="text-2xl font-black text-foreground">Confirm Booking</h1>

      {/* Trip summary */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100">
            <Bus className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-foreground font-bold">{trip.line.name}</h2>
            <p className="text-muted text-sm">
              <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              {dep.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
              {dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Stop Selection */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-xs font-bold text-muted uppercase tracking-widest">Select Stops</h3>
          
          <div className="space-y-3">
            <div className="relative">
              <label className="text-[10px] font-bold text-primary-400 uppercase absolute left-3 top-2.5 z-10">Pick-up</label>
              <MapPin className="absolute left-3 bottom-3 w-4 h-4 text-primary-400" />
              <select
                id="pickup-select-checkout"
                value={pickupId}
                onChange={e => setPickupId(e.target.value)}
                className="input pl-10 pt-7 appearance-none"
              >
                <option value="">Select pick-up stop…</option>
                {sortedStops.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({idx === 0 ? `Departs ${dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Est. ${getEtaForStop(idx)}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-muted uppercase absolute left-3 top-2.5 z-10">Drop-off</label>
              <MapPin className="absolute left-3 bottom-3 w-4 h-4 text-muted" />
              <select
                id="dropoff-select-checkout"
                value={dropoffId}
                onChange={e => setDropoffId(e.target.value)}
                className="input pl-10 pt-7 appearance-none"
              >
                <option value="">Select drop-off stop…</option>
                {filteredDropoffStops.map((s) => {
                  const actualIdx = sortedStops.findIndex(os => os.id === s.id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} (Arrives ~${getEtaForStop(actualIdx)})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Seat selector */}
        <div>
          <label className="text-xs font-bold text-muted uppercase tracking-widest mb-4 block">Seats</label>
          <div className="flex items-center gap-4">
            <button
              id="seats-minus"
              onClick={() => setSeats(Math.max(1, seats - 1))}
              disabled={seats <= 1}
              className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:border-border hover:bg-gray-50 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <span className="text-4xl font-black text-foreground tabular-nums">{seats}</span>
              <p className="text-muted text-xs mt-0.5">
                <Users className="w-3 h-3 inline mr-0.5" />
                {trip.remainingSeats} seats available
              </p>
            </div>

            <button
              id="seats-plus"
              onClick={() => setSeats(Math.min(MAX_SEATS, seats + 1))}
              disabled={seats >= MAX_SEATS}
              className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:border-border hover:bg-gray-50 focus:ring-2 focus:ring-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {seats >= 4 && (
            <p className="text-xs text-muted mt-2 text-center">Maximum 4 seats per booking</p>
          )}
        </div>
      </Card>

      {/* Price breakdown */}
      <Card padding="md" className="space-y-3">
        <h3 className="text-foreground font-bold">Price Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>{trip.line.currency} {trip.line.fixedPrice} × {seats} seat{seats > 1 ? 's' : ''}</span>
            <span className="text-foreground">{trip.line.currency} {total}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-primary-600 text-lg">{trip.line.currency} {total}</span>
          </div>
        </div>
      </Card>

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <ShieldCheck className="w-4 h-4 text-success shrink-0" />
        <span>Seat is locked during checkout. Price is fixed per line policy.</span>
      </div>

      {/* Error */}
      {bookingError && (
        <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3">
          {bookingError.message}
        </div>
      )}

      {/* CTA */}
      <Button
        id="confirm-booking"
        onClick={() => book()}
        isLoading={isPending}
        disabled={!pickupId || !dropoffId}
        size="lg"
        fullWidth
        leftIcon={!isPending && <CreditCard className="w-5 h-5 -ml-1" />}
      >
        {isPending ? 'Confirming…' : `Book ${seats} Seat${seats > 1 ? 's' : ''} — ${trip.line.currency} ${total}`}
      </Button>
    </div>
  );
}