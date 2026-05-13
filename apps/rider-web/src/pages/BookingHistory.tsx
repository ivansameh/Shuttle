import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  ClipboardList, Bus, Clock, Tag, Users, Ticket,
  XCircle, MapPin, Loader2, ArrowRight, Navigation
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface Booking {
  id: string;
  seatsBooked: number;
  pricePaid: number;
  status: string;
  createdAt: string;
  tripInstance: {
    id: string;
    departureTime: string;
    status: string;
    line: { name: string; currency: string };
  };
  pickupStop?: { name: string };
  dropoffStop?: { name: string };
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED:   'bg-success/10 text-success border-success/20',
  PENDING:     'bg-accent/10 text-accent border-accent/20',
  CANCELLED:   'bg-error/10 text-error border-error/20',
  BOARDED:     'bg-primary-50 text-primary-600 border-primary-200',
  NO_SHOW:     'bg-muted/10 text-muted border-muted/20',
};

export default function BookingHistory() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const res = await api.get('/rider/bookings') as any;
      return res.data ?? res;
    },
  });

  const { mutate: cancelBooking, variables: cancellingId } = useMutation({
    mutationFn: async (bookingId: string) => {
      await api.delete(`/rider/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const active = bookings.filter((b) => 
    b.status === 'CONFIRMED' || 
    b.status === 'BOARDED' || 
    b.tripInstance.status === 'IN_PROGRESS'
  );
  const history = bookings.filter((b) => 
    !active.find(a => a.id === b.id)
  );

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const dep = new Date(booking.tripInstance.departureTime);
    const canCancel =
      (booking.status === 'CONFIRMED' || booking.status === 'PENDING') &&
      booking.tripInstance.status === 'SCHEDULED';
    
    // Can track if trip is in progress OR if it's scheduled and within departure window
    const canTrack = 
      booking.tripInstance.status === 'IN_PROGRESS' || 
      (booking.tripInstance.status === 'SCHEDULED' && booking.status === 'CONFIRMED');
    const isCancelling = cancellingId === booking.id;

    return (
      <Card hoverable className="transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0 border border-primary-100">
              <Bus className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-foreground font-bold">{booking.tripInstance.line.name}</h3>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {dep.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                  {dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-accent" />
                  <span className="text-accent font-semibold">{booking.tripInstance.line.currency} {(booking.pricePaid * booking.seatsBooked).toFixed(2)}</span>
                </span>
                {(booking.pickupStop || booking.dropoffStop) && (
                  <div className="flex items-center gap-2 w-full mt-1.5 text-xs bg-gray-50 rounded-lg px-2 py-1 border border-border/50">
                    <MapPin className="w-3 h-3 text-primary-500" />
                    <span className="text-foreground/80">{booking.pickupStop?.name ?? '—'}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-muted" />
                    <span className="text-foreground/80">{booking.dropoffStop?.name ?? '—'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <span className={`badge border ${STATUS_STYLES[booking.status] ?? STATUS_STYLES.CONFIRMED}`}>
              {booking.status}
            </span>

            <div className="flex gap-2">
              <button
                id={`view-booking-${booking.id}`}
                onClick={() => navigate(`/rider/booking/${booking.id}`)}
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
              >
                <Ticket className="w-3.5 h-3.5" />
                View
              </button>

              {canTrack && (
                <button
                  id={`track-${booking.tripInstance.id}`}
                  onClick={() => navigate(`/rider/tracking/${booking.tripInstance.id}`)}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 transition-colors px-2 py-1 bg-primary-50 rounded-lg border border-primary-200"
                >
                  <Navigation className="w-3.5 h-3.5 animate-pulse" />
                  Track Live
                </button>
              )}

              {canCancel && (
                <button
                  id={`cancel-${booking.id}`}
                  onClick={() => {
                    if (confirm('Cancel this booking? This action cannot be undone.')) {
                      cancelBooking(booking.id);
                    }
                  }}
                  disabled={isCancelling}
                  className="flex items-center gap-1 text-xs text-error hover:text-error/80 transition-colors disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-black text-foreground">My Trips</h1>

      {bookings.length === 0 ? (
        <Card padding="lg" className="text-center py-20 flex flex-col items-center">
          <ClipboardList className="w-14 h-14 text-muted mx-auto mb-4 opacity-40" />
          <p className="text-foreground font-bold mb-1">No bookings yet</p>
          <p className="text-muted text-sm mb-6">Find a route and book your first ride.</p>
          <Button
            onClick={() => navigate('/rider/home')}
          >
            Browse Routes
          </Button>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Active & Upcoming
              </h2>
              {active.map((b) => <BookingCard key={b.id} booking={b} />)}
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Trip History
              </h2>
              {history.map((b) => <BookingCard key={b.id} booking={b} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
