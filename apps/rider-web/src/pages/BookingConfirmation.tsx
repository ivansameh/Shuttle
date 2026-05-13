import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  CheckCircle2, Bus, Clock, Users, Tag, Ticket,
  MapPin, Home, Loader2, XCircle, MessageSquare, Navigation
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';

interface Booking {
  id: string;
  seatsBooked: number;
  pricePaid: number;
  status: string;
  createdAt: string;
  tripInstance: {
    departureTime: string;
    line: { id: string; name: string; currency: string; stops?: { name: string }[] };
    driver?: { name: string };
    vehicle?: { licensePlate: string };
  };
  pickupStop?: { name: string; lat: number; lng: number };
  dropoffStop?: { name: string; lat: number; lng: number };
}

export default function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user }      = useAuthStore();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const { mutate: cancelBooking, isPending: isCancelling } = useMutation({
    mutationFn: async () => {
      await api.delete(`/rider/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await api.get(`/rider/bookings/${bookingId}`) as any;
      return res.data ?? res;
    },
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!booking) return null;

  const dep     = new Date(booking.tripInstance.departureTime);
  const stops   = booking.tripInstance.line.stops ?? [];
  const origin  = stops[0]?.name ?? '—';
  const dest    = stops[stops.length - 1]?.name ?? '—';

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
      {/* Status header */}
      <div className="text-center py-8">
        {booking.status === 'CANCELLED' ? (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-error/10 border border-error/20 rounded-full mb-5">
              <XCircle className="w-10 h-10 text-error" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">Booking Cancelled</h1>
            <p className="text-muted">This booking is no longer valid.</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 border border-success/20 rounded-full mb-5">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">Booking Confirmed!</h1>
            <p className="text-muted">Your ticket is ready. Have a safe journey, {user?.name?.split(' ')[0]}!</p>
          </>
        )}
      </div>

      {/* Digital Ticket */}
      <div className="relative">
        {/* Ticket card */}
        <div className={`rounded-3xl p-6 shadow-xl overflow-hidden relative ${
          booking.status === 'CANCELLED' 
            ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-zinc-900/40' 
            : 'bg-gradient-to-br from-primary-600 to-violet-700 shadow-primary-500/30'
        }`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 border-2 border-white rounded-full" />
            <div className="absolute bottom-4 left-4 w-20 h-20 border-2 border-white rounded-full" />
          </div>

          <div className="relative space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-white" />
                <span className="text-white font-black text-lg">Shuttle</span>
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1">
                <span className="text-white/90 text-xs font-bold uppercase tracking-widest">
                  {booking.status === 'CANCELLED' ? 'void' : 'e-ticket'}
                </span>
              </div>
            </div>

            {/* Route */}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Route</p>
              <p className="text-white font-bold text-xl">{booking.tripInstance.line.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/70 text-sm">{booking.pickupStop?.name ?? origin}</span>
                <div className="flex-1 border-t border-dashed border-white/30 relative">
                  <Bus className="w-3 h-3 text-white/50 absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
                </div>
                <span className="text-white/70 text-sm">{booking.dropoffStop?.name ?? dest}</span>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock,  label: 'Departure', value: dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                { icon: Users,  label: 'Seats',     value: `${booking.seatsBooked} seat${booking.seatsBooked > 1 ? 's' : ''}` },
                { icon: Tag,    label: 'Total',      value: `${booking.tripInstance.line.currency} ${(booking.pricePaid * booking.seatsBooked).toFixed(2)}` },
                { icon: Ticket, label: 'Booking ID', value: `#${booking.id.slice(-6).toUpperCase()}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-white/60 text-xs">{label}</span>
                  </div>
                  <p className="text-white font-bold text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Driver / Vehicle */}
            {(booking.tripInstance.driver || booking.tripInstance.vehicle) && (
              <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white/60" />
                <div className="text-sm">
                  {booking.tripInstance.driver && (
                    <span className="text-white/80">Driver: <span className="text-white font-semibold">{booking.tripInstance.driver.name}</span></span>
                  )}
                  {booking.tripInstance.vehicle && (
                    <span className="text-white/80 ml-3">Vehicle: <span className="text-white font-semibold">{booking.tripInstance.vehicle.licensePlate}</span></span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket notch effect */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full" />
      </div>

      {/* CTA buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          id="go-home"
          onClick={() => navigate('/rider/home')}
          variant="outline"
          size="lg"
          fullWidth
          leftIcon={<Home className="w-5 h-5 -ml-1" />}
        >
          Home
        </Button>
        <Button
          id="open-chat"
          onClick={() => navigate(`/rider/chat/${bookingId}`)}
          variant="secondary"
          size="lg"
          fullWidth
          leftIcon={<MessageSquare className="w-5 h-5 -ml-1" />}
        >
          Chat
        </Button>
      </div>

      {booking.status === 'CONFIRMED' && booking.pickupStop && (
        <Button
          id="get-directions"
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.pickupStop!.lat},${booking.pickupStop!.lng}&travelmode=walking`;
            window.open(url, '_blank');
          }}
          size="lg"
          fullWidth
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
          leftIcon={<Navigation className="w-5 h-5 -ml-1" />}
        >
          Get Directions to Pick-up
        </Button>
      )}

      {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && dep > new Date() && (
        <Button
          id="cancel-booking"
          onClick={() => {
            if (confirm('Are you sure you want to cancel this booking? This cannot be undone.')) {
              cancelBooking();
            }
          }}
          disabled={isCancelling}
          isLoading={isCancelling}
          variant="danger"
          size="lg"
          fullWidth
          leftIcon={!isCancelling && <XCircle className="w-5 h-5 -ml-1" />}
        >
          {isCancelling ? 'Cancelling…' : 'Cancel Booking'}
        </Button>
      )}
    </div>
  );
}
