import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { sortStopsGreedy, fetchRouteInfo } from '../lib/routing';
import ShuttleMap from './ShuttleMap';
import Button from './ui/Button';
import { X, Clock, MapPin, AlertCircle, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';

interface Stop { id: string; name: string; lat: number; lng: number; }
interface Trip {
  id: string;
  departureTime: string;
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
  };
}

export default function BookingModal({ trip, stops, initialPickup, initialDropoff, onClose }: { 
  trip: Trip; 
  stops: Stop[];
  initialPickup?: string;
  initialDropoff?: string;
  onClose: () => void; 
}) {
  const navigate = useNavigate();
  const sortedStops = useMemo(() => {
    const dbStops = [...stops];
    const virtualStart: Stop = {
      id: 'START_POINT',
      name: trip.line.startPointName ? `🏁 ${trip.line.startPointName}` : `🏁 Start: ${trip.line.name.split('-')[0] || 'Origin'}`,
      lat: trip.line.startLat ?? dbStops[0]?.lat ?? 0,
      lng: trip.line.startLng ?? dbStops[0]?.lng ?? 0
    };
    const virtualEnd: Stop = {
      id: 'END_POINT',
      name: trip.line.endPointName ? `🚩 ${trip.line.endPointName}` : `🚩 End: ${trip.line.name.split('-')[1] || 'Destination'}`,
      lat: trip.line.endLat ?? dbStops[dbStops.length - 1]?.lat ?? 0,
      lng: trip.line.endLng ?? dbStops[dbStops.length - 1]?.lng ?? 0
    };

    const all = [virtualStart, ...dbStops];
    const sorted = sortStopsGreedy(all);
    
    // Move END_POINT to the absolute end
    const hasEnd = sorted.find(s => s.id === 'END_POINT');
    if (!hasEnd) sorted.push(virtualEnd);
    else {
      const idx = sorted.findIndex(s => s.id === 'END_POINT');
      if (idx !== -1) {
        const [token] = sorted.splice(idx, 1);
        sorted.push(token);
      }
    }
    return sorted;
  }, [stops, trip.line]);
  const [pickupId, setPickupId]   = useState(initialPickup ?? '');
  const [dropoffId, setDropoffId] = useState(initialDropoff ?? '');
  const [durations, setDurations] = useState<number[]>([]);
  const [seats, setSeats] = useState(1);

  useEffect(() => {
    if (sortedStops.length > 0) {
      fetchRouteInfo(sortedStops.map(s => ({ lat: s.lat, lng: s.lng }))).then(res => {
        setDurations(res.durations);
      });
    }
  }, [sortedStops]);

  const { mutate: book, isPending, error: bookingError } = useMutation({
    mutationFn: async () => {
      const res = await api.post('/rider/bookings', {
        tripInstanceId: trip.id,
        seatsBooked: seats,
        pickupStopId: (pickupId === 'START_POINT' || pickupId === 'END_POINT') ? null : (pickupId || null),
        dropoffStopId: (dropoffId === 'START_POINT' || dropoffId === 'END_POINT') ? null : (dropoffId || null),
      }) as any;
      return res.data?.booking ?? res.booking ?? res.data ?? res;
    },
    onSuccess: (booking: any) => {
      navigate(`/rider/booking/${booking.id}`);
    },
  });

  const getArrivalTime = (stopId: string) => {
    if (!stopId || durations.length === 0) return null;
    const idx = sortedStops.findIndex(s => s.id === stopId);
    if (idx === -1) return null;
    
    const baseTime = new Date(trip.departureTime);
    return new Date(baseTime.getTime() + (durations[idx] || 0) * 1000);
  };

  const pickupTime = getArrivalTime(pickupId);
  const dropoffTime = getArrivalTime(dropoffId);

  // Filter Drop-off list: Must be AFTER the pickup point
  const pickupIndex = useMemo(() => {
    return sortedStops.findIndex(s => s.id === pickupId);
  }, [pickupId, sortedStops]);

  const filteredDropoffStops = useMemo(() => {
    if (pickupIndex === -1) return sortedStops;
    return sortedStops.slice(pickupIndex + 1);
  }, [sortedStops, pickupIndex]);

  // Handle downstream dropoff invalidation
  useEffect(() => {
    if (pickupId && dropoffId) {
      const pIdx = sortedStops.findIndex(s => s.id === pickupId);
      const dIdx = sortedStops.findIndex(s => s.id === dropoffId);
      if (dIdx !== -1 && pIdx !== -1 && dIdx <= pIdx) {
        setDropoffId('');
      }
    }
  }, [pickupId, sortedStops, dropoffId]);

  const MAX_SEATS = Math.min(4, trip.remainingSeats);
  const total = trip.line.fixedPrice * seats;

  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full md:max-w-lg bg-surface border border-border rounded-t-4xl md:rounded-3xl p-6 pb-8 md:pb-6 animate-sheet-up md:animate-scale-in shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 md:hidden" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Confirm Booking</p>
            <h2 className="text-xl font-black text-foreground">{trip.line.name}</h2>
            <p className="text-sm font-bold text-foreground mt-1">
              <Clock className="w-3.5 h-3.5 inline mr-1 text-muted" />
              {formatDate(trip.departureTime, { weekday: 'short' })} at{' '}
              {formatTime(trip.departureTime)}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-gray-50 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6 rounded-2xl overflow-hidden border border-border h-36 relative shrink-0">
          <ShuttleMap 
            mode="tracker" 
            initialStops={sortedStops.map(s => ({ lat: s.lat, lng: s.lng }))}
          />
          <div className="absolute top-2 left-2 z-[1000] bg-surface/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white border border-border">
            Route Preview
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="input-label">Pick-up Point</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
              <select
                id="pickup-select"
                value={pickupId}
                onChange={e => setPickupId(e.target.value)}
                className="input pl-10 appearance-none pr-16"
              >
                <option value="">Select pick-up stop…</option>
                {sortedStops.map((s, idx) => (
                  <option key={s.id} value={s.id} disabled={idx === sortedStops.length - 1}>{s.name}</option>
                ))}
              </select>
              {pickupTime && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary-500/10 text-primary-400 text-[10px] font-black px-1.5 py-0.5 rounded border border-primary-500/20">
                  {pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="input-label">Drop-off Point</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <select
                id="dropoff-select"
                value={dropoffId}
                onChange={e => setDropoffId(e.target.value)}
                className="input pl-10 appearance-none pr-16"
              >
                <option value="">Select drop-off stop…</option>
                {filteredDropoffStops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {dropoffTime && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-muted/10 text-muted text-[10px] font-black px-1.5 py-0.5 rounded border border-border">
                  {dropoffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-bold text-muted uppercase tracking-widest mb-3 block">Seats</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSeats(Math.max(1, seats - 1))}
              disabled={seats <= 1}
              className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:bg-gray-50 disabled:opacity-40"
            >
              <span className="font-bold text-xl leading-none">-</span>
            </button>

            <div className="flex-1 text-center font-black text-2xl tabular-nums">
              {seats}
            </div>

            <button
              onClick={() => setSeats(Math.min(MAX_SEATS, seats + 1))}
              disabled={seats >= MAX_SEATS}
              className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground hover:bg-gray-50 disabled:opacity-40"
            >
              <span className="font-bold text-xl leading-none">+</span>
            </button>
          </div>
        </div>

        {bookingError && (
          <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3 mb-4">
            {(bookingError as any).message || 'Failed to book trip.'}
          </div>
        )}

        {trip.remainingSeats === 0 ? (
          <Button variant="secondary" fullWidth disabled>
            <AlertCircle className="w-5 h-5 mr-2" /> Trip is Full
          </Button>
        ) : (
          <Button
            id="modal-book-btn"
            variant="accent"
            onClick={() => book()}
            isLoading={isPending}
            disabled={!pickupId || !dropoffId}
            fullWidth
            leftIcon={!isPending && <CreditCard className="w-5 h-5 -ml-1" />}
          >
            {isPending ? 'Confirming…' : `Book ${seats} Seat${seats > 1 ? 's' : ''} — ${formatCurrency(total, trip.line?.currency)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
