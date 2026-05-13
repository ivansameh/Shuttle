import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import {
  ArrowLeft, Bus, Clock, Tag, Users, MapPin,
  ChevronRight, Loader2, CalendarDays
} from 'lucide-react';
import ShuttleMap from '../components/ShuttleMap';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import BookingModal from '../components/BookingModal';
import { useTrips, useTripDetail, Trip } from '../hooks/useTrips';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';

interface Line {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fixedPrice: number;
  currency: string;
  schedules?: { id: string; time: string, daysOfWeek: number[] }[];
  stops?: { id: string, name: string, lat: number, lng: number, orderIndex: number }[];
}


const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   'bg-primary-50 text-primary-600 border-primary-200',
  IN_PROGRESS: 'bg-success/10 text-success border-success/20',
  COMPLETED:   'bg-muted/10 text-muted border-muted/20',
  CANCELLED:   'bg-error/10 text-error border-error/20',
};

export default function TripDetail() {
  const { tripId: lineId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Fetch Line details (using reusable hook)
  const { data: line, isLoading: isLineLoading } = useTripDetail(lineId!);

  // Fetch Trips for that line and selected date (using reusable hook)
  const { data: trips = [], isLoading: isTripsLoading, error } = useTrips({
    lineId,
    date: selectedDate
  });

  const isLoading = isLineLoading || isTripsLoading;

  const availableTrips = trips.filter((t) => t.status === 'SCHEDULED' && t.remainingSeats > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Back to routes</span>
      </button>

      {/* Header */}
      <Card padding="md">
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center border border-primary-100">
              <Bus className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">
                {line?.name ?? 'Loading…'}
              </h1>
              <p className="text-muted text-sm mt-0.5">Select a departure or get a weekly pass</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-accent/5 border border-accent/20 p-2 rounded-xl">
             <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center border border-accent/20">
                <Tag className="w-4 h-4 text-accent" />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-accent leading-none">Best Value</p>
                <p className="text-xs font-bold text-foreground mt-1">Weekly Passes Available</p>
             </div>
          </div>
        </div>

        {/* Route Preview Map */}
        {line?.stops && (
          <div className="rounded-2xl overflow-hidden border border-border h-64 relative mb-2">
            <ShuttleMap 
              mode="tracker" 
              startPoint={{ lat: line.startLat, lng: line.startLng }}
              endPoint={{ lat: line.endLat, lng: line.endLng }}
              initialStops={line.stops.map((s: any) => ({ lat: s.lat, lng: s.lng }))}
            />
            <div className="absolute top-4 left-4 z-[1000] bg-surface/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-bold text-foreground border border-border shadow-sm">
              Full Route visualization
            </div>
          </div>
        )}
      </Card>

      {/* Date Picker Bar */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
         {[0,1,2,3,4,5,6].map(offset => {
           const d = new Date();
           d.setDate(d.getDate() + offset);
           const iso = d.toISOString().split('T')[0];
           const isSelected = iso === selectedDate;
           
           return (
             <button
               key={iso}
               onClick={() => setSelectedDate(iso)}
               className={`flex flex-col items-center min-w-[70px] p-3 rounded-2xl border transition-all ${
                 isSelected 
                   ? 'bg-primary-600 border-primary-500 shadow-lg shadow-primary-500/20 scale-105 text-white' 
                   : 'bg-surface border-border hover:border-primary-300'
               }`}
             >
               <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                 {d.toLocaleDateString([], { weekday: 'short' })}
               </span>
               <span className={`text-lg font-black mt-1 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                 {d.getDate()}
               </span>
             </button>
           );
         })}
         <div className="flex flex-col items-center min-w-[120px]">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-2xl p-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary-500"
            />
         </div>
      </div>

      {/* Recurring Schedule Summary */}
      <Card padding="md" className="bg-gray-50/50 border-dashed border-border">
        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recurring Schedule (Sun-Thu)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {line?.schedules?.map((sched: any) => (
            <div key={sched.id} className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-lg font-black text-foreground leading-none">{sched.time}</p>
                <p className="text-[10px] text-muted font-bold uppercase mt-1 tracking-tighter">
                  {sched.daysOfWeek.length === 7 ? 'Daily' : 
                   JSON.stringify(sched.daysOfWeek.sort()) === JSON.stringify([1,2,3,4,7]) ? 'Sun-Thu' : 
                   'Selected Days'}
                </p>
              </div>
              <div className="flex gap-1">
                {[7,1,2,3,4].map(d => (
                  <div 
                    key={d} 
                    className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${
                      sched.daysOfWeek.includes(d) ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-muted/50'
                    }`}
                  >
                    {['S','M','T','W','T','F','S'][d % 7]}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!line?.schedules?.length && <p className="text-xs text-muted col-span-full italic">No recurring schedule defined for this line.</p>}
        </div>
      </Card>

      {/* Subscription Banner / Action */}

      {line?.schedules && line.schedules.length > 0 && (
        <Card padding="md" className="border-accent/30 bg-accent/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/15 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2 tracking-tight">
                <CalendarDays className="w-5 h-5 text-accent" />
                Get a Weekly Pass
              </h3>
              <p className="text-muted text-sm font-medium">
                Reserve your seat automatically for all scheduled days. Renewed weekly.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {line.schedules.map((sched: any) => (
                <button
                  key={sched.id}
                  onClick={async () => {
                    const dayLabels = sched.daysOfWeek.length === 7 ? 'Daily' : sched.daysOfWeek.sort().join(',');
                    if (window.confirm(`Do you want to subscribe to the ${sched.time} ride for [${dayLabels}]?`)) {
                      try {
                        await api.post('/rider/subscriptions', {
                          lineId: line.id,
                          time: sched.time,
                          daysOfWeek: sched.daysOfWeek
                        });
                        alert('Subscription activated! Your seats will be reserved automatically.');
                      } catch (err) {
                        alert('Failed to subscribe. Please try again.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-50 active:scale-95 border border-border rounded-xl transition-all duration-200 shadow-sm"
                >
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest leading-none mb-1">Pass</p>
                  <p className="text-sm font-black text-foreground">{sched.time}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Trip list */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <Card padding="lg" className="text-center">
          <p className="text-error">Failed to load trips. Please try again.</p>
        </Card>
      ) : trips.length === 0 ? (
        <Card padding="lg" className="text-center items-center">
          <CalendarDays className="w-12 h-12 text-muted mb-4 opacity-50" />
          <p className="text-foreground font-semibold mb-1">No trips scheduled</p>
          <p className="text-muted text-sm">Check back later for upcoming departures.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => {
            const dep = new Date(trip.departureTime);
            const isBookable = trip.status === 'SCHEDULED' && trip.remainingSeats > 0;
            const statusClass = STATUS_STYLES[trip.status] ?? STATUS_STYLES.SCHEDULED;

            return (
              <Card
                key={trip.id}
                hoverable={isBookable}
                onClick={isBookable ? () => setSelectedTrip(trip) : undefined}
                className={!isBookable ? 'opacity-60 cursor-not-allowed' : 'group'}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Departure info */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-foreground tabular-nums">
                        {formatTime(trip.departureTime)}
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {formatDate(trip.departureTime, { weekday: 'short' })}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-muted">
                      {trip.driver && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{trip.driver.name}</span>
                        </div>
                      )}
                      {trip.vehicle && (
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5" />
                          <span>{trip.vehicle.licensePlate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right space-y-2">
                      <div className={`badge border ${statusClass}`}>
                        {trip.status.replace('_', ' ')}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Users className="w-3.5 h-3.5 text-muted" />
                        <span className={`text-sm font-semibold ${
                          trip.remainingSeats <= 3 ? 'text-error' : 'text-foreground'
                        }`}>
                          {trip.remainingSeats} seats left
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Tag className="w-3.5 h-3.5 text-accent" />
                        <span className="text-accent text-sm font-bold">
                          {formatCurrency(trip.line?.fixedPrice, trip.line?.currency)}
                        </span>
                      </div>
                    </div>
                    {isBookable && (
                      <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all duration-200" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Booking Modal (All-in-One Reservation) ── */}
      {selectedTrip && selectedTrip.line && (
        <BookingModal
          trip={selectedTrip}
          stops={line?.stops ?? selectedTrip.line.stops ?? []}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}
