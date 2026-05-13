import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, ChevronRight, Bus, Users, ArrowRight, Filter, ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface TripInstance {
  id: string;
  lineId: string;
  driverId: string;
  departureTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  totalSeats: number;
  remainingSeats: number;
  line: {
    id: string;
    name: string;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    fixedPrice: string;
  };
}

export default function DriverSchedule() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Generate 11 days (5 past, Today, 5 future)
  const days = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 5 + i);
      return d;
    });
  }, []);

  const { data: trips = [], isLoading, error } = useQuery<TripInstance[]>({
    queryKey: ['driver-schedule'],
    queryFn: async () => {
      const response = await api.get('/driver/schedule');
      return response.data;
    },
  });

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const tDate = new Date(t.departureTime);
      const isSameDay = tDate.getDate() === selectedDate.getDate() &&
                       tDate.getMonth() === selectedDate.getMonth() &&
                       tDate.getFullYear() === selectedDate.getFullYear();
      
      if (!isSameDay) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      return true;
    });
  }, [trips, selectedDate, statusFilter]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-24 w-full bg-gray-200/50 rounded-2xl"></div>
        <div className="h-10 w-full bg-gray-200/50 rounded-lg"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 w-full bg-gray-200/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6 pb-12">
      {/* Header & Date Selector */}
      <div className="bg-white/90 -mx-4 px-4 pt-4 pb-2 sticky top-0 z-30 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            Duty Schedule
          </h1>
          <div className="text-right">
             <p className="text-[10px] font-bold text-muted uppercase tracking-tighter">Current View</p>
             <p className="text-xs font-bold text-primary-600">{selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}</p>
          </div>
        </div>

        {/* Horizontal Date Picker */}
        <div className="overflow-x-auto no-scrollbar flex gap-3 pb-4">
          {days.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center min-w-[70px] py-3 rounded-2xl border transition-all ${
                  isSelected 
                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20 scale-105' 
                    : 'bg-gray-50 border-gray-100 text-muted hover:border-gray-200'
                }`}
              >
                <span className={`text-[10px] uppercase font-black mb-1 ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                  {day.toLocaleDateString([], { weekday: 'short' })}
                </span>
                <span className="text-lg font-black tracking-tighter">
                  {day.getDate()}
                </span>
                {isToday && !isSelected && <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-1" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-1 space-y-6">
        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                statusFilter === s 
                  ? 'bg-primary-900 text-white border-primary-900 shadow-sm' 
                  : 'bg-white border-gray-200 text-muted hover:border-gray-300'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Trips List */}
        <div className="space-y-4">
          {filteredTrips.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Bus className="w-10 h-10 text-muted/40" />
              </div>
              <p className="text-muted text-sm font-medium">No trips matching your filters for this day.</p>
            </Card>
          ) : (
            filteredTrips.map((trip) => (
              <Card 
                key={trip.id}
                hoverable
                onClick={() => {
                  if (trip.status === 'CANCELLED') return;
                  navigate(`/driver/manifest/${trip.id}`);
                }}
                className={`group relative overflow-hidden ${
                  trip.status === 'CANCELLED' 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer active:scale-[0.99] bg-white border-gray-100'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  trip.status === 'IN_PROGRESS' ? 'bg-success' : 
                  trip.status === 'COMPLETED' ? 'bg-gray-400' : 
                  trip.status === 'CANCELLED' ? 'bg-error' :
                  'bg-primary-600'
                }`} />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex flex-col items-center justify-center border border-gray-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors">
                      <Clock className="w-4 h-4 text-primary-600 mb-0.5" />
                      <span className="text-[10px] font-black text-foreground">{formatTime(trip.departureTime)}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary-700 transition-colors truncate max-w-[200px]">
                        {trip.line.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                         <div className="flex items-center gap-1 text-[10px] text-muted font-bold">
                           <Users className="w-3 h-3" />
                           {trip.totalSeats - trip.remainingSeats} Seats
                         </div>
                         <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                            trip.status === 'IN_PROGRESS' ? 'bg-success/10 border-success/20 text-success' :
                            trip.status === 'COMPLETED'   ? 'bg-gray-100 border-gray-200 text-muted' :
                            trip.status === 'CANCELLED'   ? 'bg-error/10 border-error/20 text-error' :
                            'bg-primary-50 border-primary-100 text-primary-600'
                          }`}>
                            {trip.status.replace('_', ' ')}
                         </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-muted font-bold tracking-widest uppercase">
                Showing {filteredTrips.length} of {trips.filter(t => new Date(t.departureTime).toDateString() === selectedDate.toDateString()).length} trips for this day
            </p>
        </div>
      </div>
    </div>
  );
}
