import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, ChevronRight, Bus, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/axios';
import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface TripInstance {
  id: string;
  lineId: string;
  departureTime: string;
  status: string;
  totalSeats: number;
  remainingSeats: number;
  line: {
    id: string;
    name: string;
  };
}

export default function AvailableTrips() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: trips, isLoading, error } = useQuery<TripInstance[]>({
    queryKey: ['available-trips'],
    queryFn: async () => {
      const response = await api.get('/driver/available-trips');
      return response.data;
    },
  });

  const reserveMutation = useMutation({
    mutationFn: async (tripId: string) => {
      return api.patch(`/driver/trips/${tripId}/reserve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-trips'] });
      queryClient.invalidateQueries({ queryKey: ['driver-schedule'] });
      setSuccessMsg('Trip reserved successfully! It has been added to your schedule.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200/50 rounded-lg"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 w-full bg-gray-200/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-black text-foreground flex items-center gap-3 tracking-tight">
          <Search className="w-8 h-8 text-primary-600" />
          Browse Trips
        </h1>
        <p className="text-muted text-sm mt-1 font-medium">
          Claim unassigned trips to add them to your daily schedule.
        </p>
      </div>

      {successMsg && (
        <div className="bg-success/5 border border-success/20 text-success p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{successMsg}</p>
        </div>
      )}

      {error ? (
        <Card padding="lg" className="text-center py-10 border-error/20 bg-error/5">
          <AlertCircle className="w-10 h-10 text-error mx-auto mb-3" />
          <h3 className="font-bold text-foreground">Failed to load trips</h3>
          <p className="text-muted text-sm capitalize">{(error as any).message}</p>
        </Card>
      ) : trips && trips.length > 0 ? (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Card 
              key={trip.id}
              hoverable
              className="relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-600/20" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-start gap-4 text-left">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors shrink-0">
                    <Calendar className="w-5 h-5 text-primary-600 mb-0.5" />
                    <span className="text-[10px] font-black text-foreground uppercase">{formatDate(trip.departureTime).split(',')[0]}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary-700 transition-colors">
                      {trip.line.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(trip.departureTime)} • {formatDate(trip.departureTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Fixed Route</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => reserveMutation.mutate(trip.id)}
                  isLoading={reserveMutation.isPending}
                  variant="accent"
                  fullWidth={false}
                  className="sm:w-auto w-full group-hover:scale-[1.02]"
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {reserveMutation.isPending ? 'Reserving...' : 'Reserve Trip'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" className="flex flex-col items-center justify-center py-20 text-center border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Bus className="w-10 h-10 text-muted/20" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Available Trips</h3>
          <p className="text-muted text-sm max-w-xs mx-auto">
            Check back later! All upcoming trips have been assigned or reserved.
          </p>
        </Card>
      )}
    </div>
  );
}
