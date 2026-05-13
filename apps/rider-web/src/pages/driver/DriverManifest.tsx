import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  UserCheck, 
  UserX, 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Play,
  CheckCircle,
  Clock,
  Navigation,
  MapPin,
  ArrowRight,
  Bus
} from 'lucide-react';
import { api } from '../../lib/axios';
import { useState, useMemo, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface Booking {
  id: string;
  seatsBooked: number;
  status: 'PENDING' | 'CONFIRMED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  user: {
    name: string;
  };
  pickupStop: { name: string } | null;
  dropoffStop: { name: string } | null;
}

interface TripDetails {
  id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  line: {
    name: string;
    startLat: number;
    startLng: number;
  };
  departureTime: string;
}


interface ManifestResponse {
  trip: TripDetails;
  bookings: Booking[];
}

export default function DriverManifest() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'boarding' | 'dropoff'>('boarding');
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [checklist, setChecklist] = useState({ cleaned: false, noLostItems: false, maintenanceOk: true });
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);


  const { data, isLoading, error } = useQuery<ManifestResponse>({
    queryKey: ['trip-manifest', tripId],
    queryFn: async () => {
      if (!tripId) return { trip: {} as TripDetails, bookings: [] };
      const response = await api.get(`/driver/trips/${tripId}/manifest`);
      return response.data;
    },
    enabled: !!tripId,
  });

  const trip = data?.trip;
  const bookings = data?.bookings || [];

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: 'BOARDED' | 'NO_SHOW' }) => {
      const response = await api.patch(`/driver/trips/${tripId}/bookings/${bookingId}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-manifest', tripId] });
    },
  });

  const tripStatusMutation = useMutation({
    mutationFn: async (status: 'IN_PROGRESS' | 'COMPLETED') => {
      const response = await api.patch(`/driver/trips/${tripId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-manifest', tripId] });
      queryClient.invalidateQueries({ queryKey: ['driver-schedule'] });
    },
  });

  // --- Logic: Group bookings by drop-off stop for the drop-off plan ---
  const dropoffPlan = useMemo(() => {
    const plan: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      if (b.status === 'BOARDED') {
        const stopName = b.dropoffStop?.name || 'Main Terminal';
        if (!plan[stopName]) plan[stopName] = [];
        plan[stopName].push(b);
      }
    });
    return Object.entries(plan).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bookings]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const isTooFarToStart = useMemo(() => {
    if (!driverLocation || !trip?.line) return false;
    // Simple distance calculation (approximate)
    const R = 6371; // km
    const dLat = (trip.line.startLat - driverLocation.lat) * Math.PI / 180;
    const dLon = (trip.line.startLng - driverLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(driverLocation.lat * Math.PI / 180) * Math.cos(trip.line.startLat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d > 0.5; // > 500 meters
  }, [driverLocation, trip]);

  const filteredBookings = useMemo(() => {

    return bookings.filter(b => 
      b.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bookings, searchTerm]);

  const boardedCount = bookings.filter(b => b.status === 'BOARDED').length;
  const totalCount = bookings.length;

  if (!tripId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-slide-up">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
          <ClipboardList className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2">Select a Trip</h2>
        <p className="text-muted text-sm max-w-xs mb-8">
          Please select a trip from your schedule to view the passenger manifest.
        </p>
        <Button onClick={() => navigate('/driver/schedule')} leftIcon={<ChevronLeft className="w-4 h-4" />}>
          Back to Schedule
        </Button>
      </div>
    );
  }

  if (isLoading) return <div className="space-y-6 animate-pulse">
    <div className="h-10 w-64 bg-gray-200/50 rounded-lg"></div>
    <div className="h-32 w-full bg-gray-200/50 rounded-2xl"></div>
  </div>;

  if (error) return <Card padding="lg" className="text-center border-error/20 bg-error/5">
    <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
    <h3 className="text-xl font-bold text-foreground">Failed to load manifest</h3>
    <Button variant="outline" onClick={() => navigate('/driver/schedule')} className="mt-4">Back to Schedule</Button>
  </Card>;

  // --- Logic: Time Lock & Status Guards ---
  const isTripActive = trip?.status === 'IN_PROGRESS';
  const isTripCompleted = trip?.status === 'COMPLETED';
  const isTripCancelled = trip?.status === 'CANCELLED';

  const departureDate = trip ? new Date(trip.departureTime) : new Date();
  const now = new Date();
  const minsUntilDeparture = (departureDate.getTime() - now.getTime()) / (1000 * 60);
  
  // Can only start if scheduled and within 30 mins of departure
  const isLockedByTime = minsUntilDeparture > 30;
  const canStart = trip?.status === 'SCHEDULED' && !isLockedByTime;


  if (isTripCancelled) {
    return (
      <div className="animate-slide-up space-y-8 pb-20">
        <button onClick={() => navigate('/driver/schedule')} className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-bold uppercase">
          <ChevronLeft className="w-4 h-4" /> Schedule
        </button>
  
        <Card padding="lg" className="text-center space-y-6 border-error/20 bg-error/5">
          <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mx-auto">
             <AlertCircle className="w-12 h-12 text-error" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground mb-2">Trip Cancelled</h1>
            <p className="text-muted text-sm max-w-md mx-auto">
              This trip has been cancelled by the administrator. No further actions can be taken.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/driver/schedule')}>
             Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!isTripActive && !isTripCompleted) {
    return (
      <div className="animate-slide-up space-y-8 pb-20">
        <button onClick={() => navigate('/driver/schedule')} className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-bold uppercase">
          <ChevronLeft className="w-4 h-4" /> Schedule
        </button>

        <Card padding="lg" className="text-center space-y-6">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto border-4 border-primary-100">
             <Bus className="w-12 h-12 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground mb-2">{trip?.line?.name}</h1>
            <div className="flex flex-col items-center gap-2 mb-4">
              <p className="text-muted text-sm max-w-md mx-auto font-medium">
                This trip is scheduled for <span className="text-foreground font-bold">{trip?.departureTime ? new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>.
              </p>
              {isLockedByTime && minsUntilDeparture !== Infinity && !isNaN(minsUntilDeparture) && (
                <div className="flex items-center gap-2 text-warning px-4 py-2 bg-warning/5 rounded-full border border-warning-200">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Locked: Wait until {Math.ceil(minsUntilDeparture - 30)} mins left</span>
                </div>
              )}
            </div>
            {!isLockedByTime && (
              <p className="text-muted text-xs">Ready to roll? You can now begin this session.</p>
            )}
          </div>
          
          {isTooFarToStart && !isLockedByTime && (
            <div className="bg-error/5 border border-error/20 p-4 rounded-xl flex items-center gap-3 text-error text-sm font-bold mb-4 max-w-sm mx-auto">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Warning: You are &gt;500m away from the starting stop. Please arrive at the stop before beginning.</span>
            </div>
          )}

          <Button 
            onClick={() => tripStatusMutation.mutate('IN_PROGRESS')}
            disabled={tripStatusMutation.isPending || isLockedByTime}
            isLoading={tripStatusMutation.isPending}
            size="lg"
            className={`w-full max-w-xs mx-auto ${isLockedByTime ? 'opacity-50' : 'shadow-lg shadow-primary-500/20'}`}
            leftIcon={!tripStatusMutation.isPending && <Play className="w-6 h-6 fill-current" />}
          >
            {tripStatusMutation.isPending ? 'Starting...' : 'Begin Trip'}
          </Button>
        </Card>
      </div>
    );
  }



  // --- Condition: Trip is Completed ---
  if (isTripCompleted) {
    return (
      <div className="animate-slide-up space-y-8 pb-20">
        <button onClick={() => navigate('/driver/schedule')} className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-bold uppercase">
          <ChevronLeft className="w-4 h-4" /> Schedule
        </button>

        <Card padding="lg" className="text-center space-y-6 border-success/20 bg-success/5">
          <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto">
             <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground mb-2">Trip Completed</h1>
            <p className="text-muted text-sm max-w-md mx-auto">
              This trip has been marked as finished. The passenger manifest is no longer accessible.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/driver/schedule')}>
             Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button onClick={() => navigate('/driver/schedule')} className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors text-sm font-bold uppercase">
          <ChevronLeft className="w-4 h-4" /> Schedule
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="badge bg-success/10 text-success text-[10px] animate-pulse border border-success/20">LIVE SESSION</span>
               <h1 className="text-3xl font-black text-foreground tracking-tight">{trip?.line?.name}</h1>
            </div>
            <p className="text-muted text-sm font-medium">Current session in progress. Please manage riders below.</p>
          </div>
          
          <Button 
            variant="danger"
            onClick={() => setShowEndTripModal(true)}
            disabled={tripStatusMutation.isPending}
            leftIcon={<CheckCircle className="w-4 h-4" />}
          >
            End Trip
          </Button>
        </div>
      </div>

      {/* --- Post-Trip Checklist Modal --- */}
      {showEndTripModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowEndTripModal(false)} />
          <Card className="w-full max-w-md relative z-10 shadow-2xl animate-sheet-up p-0 overflow-hidden bg-white border-gray-100">
            <div className="bg-primary-50 p-6 border-b border-primary-100">
               <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                 <ClipboardList className="w-6 h-6 text-primary-600" />
                 Post-Trip Checklist
               </h3>
               <p className="text-muted text-xs mt-1 font-medium italic">Required by safety protocols before finishing.</p>
            </div>
            
            <div className="p-6 space-y-4">
               {[
                 { id: 'cleaned', label: 'Vehicle interior is clean and free of trash', icon: Bus },
                 { id: 'noLostItems', label: 'No passenger personal items were left behind', icon: Search },
                 { id: 'maintenanceOk', label: 'No new mechanical or safety issues noticed', icon: AlertCircle },
               ].map(({ id, label, icon: Icon }) => (
                 <label 
                   key={id}
                   className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                     (checklist as any)[id] ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'
                   }`}
                 >
                   <input 
                     type="checkbox" 
                     className="hidden" 
                     checked={(checklist as any)[id]} 
                     onChange={() => setChecklist(prev => ({ ...prev, [id]: !(prev as any)[id] }))}
                   />
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                     (checklist as any)[id] ? 'bg-primary-600 text-white' : 'bg-gray-100 text-muted'
                   }`}>
                      <Icon className="w-5 h-5" />
                   </div>
                   <span className={`text-sm font-bold ${ (checklist as any)[id] ? 'text-foreground' : 'text-muted'}`}>
                     {label}
                   </span>
                 </label>
               ))}
               
               <div className="pt-4 flex gap-3">
                 <Button variant="outline" onClick={() => setShowEndTripModal(false)} className="flex-1">Cancel</Button>
                 <Button 
                    disabled={!checklist.cleaned || !checklist.noLostItems || tripStatusMutation.isPending}
                    isLoading={tripStatusMutation.isPending}
                    onClick={() => {
                      tripStatusMutation.mutate('COMPLETED');
                      setShowEndTripModal(false);
                    }}
                    className="flex-2 px-8"
                  >
                    Confirm & End
                  </Button>
               </div>
            </div>
          </Card>
        </div>
      )}


      {/* Tabs / View Mode */}
      <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
        <button 
          onClick={() => setViewMode('boarding')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-all ${
            viewMode === 'boarding' ? 'bg-white text-primary-600 shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Boarding List
        </button>
        <button 
          onClick={() => setViewMode('dropoff')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-all ${
            viewMode === 'dropoff' ? 'bg-white text-primary-600 shadow-sm' : 'text-muted hover:text-foreground'
          }`}
        >
          <Navigation className="w-4 h-4" /> Drop-off Plan
        </button>
      </div>

      {viewMode === 'boarding' ? (
        <div className="space-y-6">
          {/* Stats & Search */}
          <div className="grid grid-cols-2 gap-4">
            <Card padding="md" className="bg-primary-50 border-primary-100 flex flex-col items-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 h-1 bg-primary-600/30 transition-all duration-500" style={{ width: `${totalCount > 0 ? (boardedCount / totalCount) * 100 : 0}%` }}></div>
                <span className="text-2xl font-black text-primary-600">{boardedCount} / {totalCount}</span>
                <span className="text-[10px] uppercase font-bold text-muted tracking-widest mt-1">Boarded</span>
            </Card>
            <Card padding="md" className="bg-warning/5 border-warning/20 flex flex-col items-center">
                <span className="text-2xl font-black text-warning">{(bookings.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED').length)}</span>
                <span className="text-[10px] uppercase font-bold text-muted tracking-widest mt-1">Waiting</span>
            </Card>
          </div>


          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-primary-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search passengers..." 
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="py-10 text-center text-muted italic">No passengers found.</div>
            ) : (
              filteredBookings.map((booking) => (
                <Card key={booking.id} padding="md" className="transition-all border-l-4" 
                     style={{ borderLeftColor: booking.status === 'BOARDED' ? '#10b981' : booking.status === 'NO_SHOW' ? '#ef4444' : 'transparent' }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                        booking.status === 'BOARDED' ? 'bg-success/10 text-success' : 
                        booking.status === 'NO_SHOW' ? 'bg-error/10 text-error' : 
                        'bg-gray-100 text-muted'
                      }`}>
                        {booking.user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{booking.user.name}</h4>
                        <div className="text-[10px] text-muted font-black uppercase flex items-center gap-2 mt-0.5">
                          <span className="text-primary-600">{booking.seatsBooked} SEATS</span>
                          <span>•</span>
                          <span>{booking.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {booking.status !== 'BOARDED' && (
                        <button 
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'BOARDED' })}
                          className="w-10 h-10 rounded-xl bg-success/10 text-success hover:bg-success hover:text-white transition-all flex items-center justify-center border border-success/20"
                        >
                          <UserCheck className="w-5 h-5" />
                        </button>
                      )}
                      {booking.status !== 'NO_SHOW' && booking.status !== 'BOARDED' && (
                        <button 
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'NO_SHOW' })}
                          className="w-10 h-10 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center justify-center border border-error/20"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      )}
                      {booking.status === 'BOARDED' && (
                        <div className="text-success font-black text-[10px] uppercase flex items-center gap-1.5 px-3 py-1.5 bg-success/10 rounded-lg border border-success/20">
                           <CheckCircle2 className="w-4 h-4" /> Boarded
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Navigation className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-foreground">Drop-off Schedule</h3>
          </div>

          {dropoffPlan.length === 0 ? (
            <Card padding="lg" className="text-center border-dashed bg-gray-50/50">
               <MapPin className="w-10 h-10 text-muted/30 mx-auto mb-4" />
               <h4 className="font-bold text-foreground mb-1">No Passengers Boarded</h4>
               <p className="text-muted text-sm px-10">Mark passengers as "Boarded" to see their drop-off locations here.</p>
            </Card>
          ) : (
            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100">
              {dropoffPlan.map(([stopName, stopBookings], index) => (
                <div key={stopName} className="relative pl-12">
                   {/* Timeline item */}
                   <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-4 border-primary-600 flex items-center justify-center z-10 shadow-lg shadow-primary-500/10">
                      <span className="text-xs font-black text-primary-600">{index + 1}</span>
                   </div>

                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <h4 className="text-lg font-black text-foreground uppercase tracking-tight">{stopName}</h4>
                         <span className="text-[10px] font-black text-muted underline decoration-primary-600 underline-offset-4">
                           {stopBookings.length} DROP-OFFS
                         </span>
                      </div>

                      <div className="grid gap-2">
                         {stopBookings.map(b => (
                           <div key={b.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center font-black text-xs text-primary-600">
                                 {b.user.name.charAt(0)}
                               </div>
                               <div>
                                 <div className="text-sm font-bold text-foreground">{b.user.name}</div>
                                 <div className="text-[10px] text-muted font-bold">{b.seatsBooked} SEAT(S)</div>
                               </div>
                             </div>
                             <ArrowRight className="w-4 h-4 text-muted/20" />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              ))}
              
              <div className="relative pl-12 pt-4">
                 <div className="absolute left-0 top-4 w-10 h-10 rounded-full bg-success/10 border-4 border-success-200 flex items-center justify-center z-10">
                    <CheckCircle className="w-5 h-5 text-success" />
                 </div>
                 <h4 className="text-lg font-black text-success uppercase tracking-tight py-1.5 px-1">End of Route</h4>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
