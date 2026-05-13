import { useState } from 'react';
import { useTrips, useScheduleTrip, useUpdateTrip, useCancelTrip, useTripManifest, TripInstance, useGenerateTrips, useCancelTripsInRange } from '../api/trips';
import { useLines } from '../api/lines';
import { useDrivers, useVehicles } from '../api/fleet';
import { CalendarDays, Plus, User, Route, Clock, XCircle, Users, ClipboardList, X, BusFront, Pencil, Trash2 } from 'lucide-react';

export default function Scheduler() {
  const { data: trips, isLoading: isLoadingTrips, error: tripsError } = useTrips();
  const { data: lines } = useLines();
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();
  
  const scheduleTrip = useScheduleTrip();
  const updateTrip = useUpdateTrip();
  const cancelTrip = useCancelTrip();
  const generateTrips = useGenerateTrips();
  const cancelTripsInRange = useCancelTripsInRange();

  // Batch Cancel state
  const [selectedCancelLineId, setSelectedCancelLineId] = useState('');
  const [cancelStartDate, setCancelStartDate] = useState('');
  const [cancelEndDate, setCancelEndDate] = useState('');

  // Trip list filter state
  const [filterStatus, setFilterStatus] = useState<TripInstance['status'] | 'ALL'>('ALL');
  const [filterLineId, setFilterLineId] = useState('');

  // Derived available times from actual trips in the trips list
  const availableCancelTimes = trips
    ?.filter(t => {
      if (t.lineId !== selectedCancelLineId) return false;
      if (t.status === 'CANCELLED') return false;
      const tDate = t.departureTime.split('T')[0];
      const startArr = cancelStartDate ? tDate >= cancelStartDate : true;
      const endArr = cancelEndDate ? tDate <= cancelEndDate : true;
      return startArr && endArr;
    })
    .map(t => t.departureTime.split('T')[1].substring(0, 5)) // HH:MM
    .filter((v, i, a) => a.indexOf(v) === i) // Unique
    .sort();

  // Selected trip for editing
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const editingTrip = trips?.find(t => t.id === editingTripId);

  // Create form state
  const [lineId, setLineId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  // Manifest modal state
  const [manifestTripId, setManifestTripId] = useState<string | null>(null);
  const { data: manifest, isLoading: isLoadingManifest } = useTripManifest(manifestTripId);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineId || !departureDate || !departureTime) return;
  
    const start = new Date(departureDate);
    const end = endDate ? new Date(endDate) : new Date(departureDate);

    if (end < start) return alert('End date must be after start date');

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dateTime = new Date(`${dateStr}T${departureTime}`).toISOString();

      await scheduleTrip.mutateAsync({
        lineId,
        departureTime: dateTime,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
      });
      current.setDate(current.getDate() + 1);
    }
  
    setLineId('');
    setDriverId('');
    setVehicleId('');
    setDepartureDate('');
    setEndDate('');
    setDepartureTime('');
  };



  const statusColors: Record<TripInstance['status'], string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200 line-through opacity-75',
  };

  return (
    <div className="h-full flex gap-6 relative">
      
      {/* Manifest Modal Overlay */}
      {manifestTripId && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-[500px] max-h-[80%] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold flex items-center gap-2 text-slate-800">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Passenger Manifest
              </h3>
              <button onClick={() => setManifestTripId(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingManifest ? (
                <div className="text-center text-slate-400 py-8">Loading passenger list...</div>
              ) : manifest?.length === 0 ? (
                <div className="text-center text-slate-400 py-8">No passengers booked yet for this trip.</div>
              ) : (
                <div className="space-y-3">
                  {manifest?.map(entry => (
                    <div key={entry.id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                          {entry.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{entry.user.name}</p>
                          <p className="text-xs text-slate-500">{entry.user.phone || 'No phone'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {entry.seatsBooked} {entry.seatsBooked === 1 ? 'seat' : 'seats'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          entry.status === 'BOARDED' ? 'text-emerald-500' : 
                          entry.status === 'NO_SHOW' ? 'text-rose-500' : 'text-amber-500'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {editingTripId && editingTrip && (
        <EditTripModal 
          trip={editingTrip} 
          onClose={() => setEditingTripId(null)} 
          onSave={async (data) => {
            await updateTrip.mutateAsync({ id: editingTripId, ...data });
            setEditingTripId(null);
          }}
          drivers={drivers || []}
          vehicles={vehicles || []}
        />
      )}
      
      {/* LEFT COLUMN: Scheduler Form */}
      <div className="w-[350px] shrink-0 overflow-y-auto pr-1 pb-10 scrollbar-hide">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            Trip Scheduler
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-6">Create future dispatch schedules.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Schedule New Trip</h3>
          <form className="space-y-4" onSubmit={handleSchedule}>
            
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Select Line Route</label>
              <select required value={lineId} onChange={e => setLineId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="" disabled>-- Select a Line --</option>
                {lines?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Assign Driver <span className="text-slate-400 font-normal lowercase">(optional)</span></label>
              <select value={driverId} onChange={e => setDriverId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">-- Unassigned --</option>
                {drivers?.map(d => (
                  <option key={d.id} value={d.id} disabled={d.status !== 'ACTIVE'}>
                    {d.name} {d.status !== 'ACTIVE' ? `(${d.status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Assign Vehicle <span className="text-slate-400 font-normal lowercase">(optional)</span></label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">-- Unassigned --</option>
                {vehicles?.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
                <input required type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500 uppercase">End Date <span className="text-slate-400 font-normal lowercase">(optional)</span></label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={departureDate} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Departure Time</label>
              <input required type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <button type="submit" disabled={scheduleTrip.isPending} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-6">
              <Plus className="w-4 h-4" /> Schedule Trip
            </button>


          </form>
        </div>

        {/* Bulk Generation Card */}
        <div className="mt-6 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-200/50 shadow-sm shadow-indigo-100">
           <h3 className="text-sm font-black text-indigo-900 mb-3 uppercase tracking-tight flex items-center gap-2 italic">
             <BusFront className="w-4 h-4" />
             Batch Generate Trips
           </h3>
           <p className="text-[11px] text-indigo-700/70 mb-4 font-medium leading-relaxed">
             Populate the unassigned pool for a date range based on recurring patterns.
           </p>
           <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1">From</label>
                   <input 
                    type="date" 
                    id="bulk-start"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-bold" 
                  />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1">To</label>
                   <input 
                    type="date" 
                    id="bulk-end"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-bold" 
                  />
                </div>
              </div>
            <button 
                onClick={async () => {
                  const startInput = document.getElementById('bulk-start') as HTMLInputElement;
                  const endInput = document.getElementById('bulk-end') as HTMLInputElement;
                  if (!startInput.value) return alert('Please select a start date');
                  
                  const count = prompt(`Generate trips for this period? Click OK to proceed.`)
                  if (count !== null) {
                    await generateTrips.mutateAsync({ 
                      startDate: startInput.value, 
                      endDate: endInput.value || startInput.value 
                    });
                    alert('Batch generation complete! New trips are now in the unassigned pool.');
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] mt-2"
              >
                Generate Period
              </button>
           </div>
        </div>

        {/* Bulk Cancellation Card */}
        <div className="mt-4 bg-rose-50/50 p-5 rounded-2xl border border-rose-200/50 shadow-sm shadow-rose-100">
           <h3 className="text-sm font-black text-rose-900 mb-3 uppercase tracking-tight flex items-center gap-2 italic">
             <Trash2 className="w-4 h-4" />
             Batch Cancel Trips
           </h3>
           <p className="text-[11px] text-rose-700/70 mb-4 font-medium leading-relaxed">
             Cancel specific scheduled trips for a line within a date range.
           </p>
           <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const checkedTimes = Array.from(form.querySelectorAll('input[name="cancel-time"]:checked')).map(cb => (cb as HTMLInputElement).value);
              
              if (!selectedCancelLineId || !cancelStartDate || !cancelEndDate) {
                return alert('Please select a line and a full date range');
              }
              
              const msg = checkedTimes.length > 0 
                ? `Are you SURE you want to cancel these specific times (${checkedTimes.join(', ')}) in the selected range?`
                : `Are you SURE you want to cancel ALL trips for this line in the selected range?`;

              if (window.confirm(`${msg} This will also cancel all associated bookings.`)) {
                const res = await cancelTripsInRange.mutateAsync({
                  lineId: selectedCancelLineId,
                  startDate: cancelStartDate,
                  endDate: cancelEndDate,
                  times: checkedTimes.length > 0 ? checkedTimes : undefined
                });
                // @ts-ignore
                alert(`Successfully cancelled ${res.count} trips.`);
              }
           }}>
              <div>
                <label className="text-[10px] font-bold text-rose-400 uppercase ml-1">Select Line</label>
                <select 
                  id="cancel-line" 
                  required
                  value={selectedCancelLineId}
                  onChange={(e) => setSelectedCancelLineId(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-bold transition-all"
                >
                  <option value="">-- Choose Line --</option>
                  {lines?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="text-[10px] font-bold text-rose-400 uppercase ml-1">From</label>
                   <input 
                    type="date" 
                    id="cancel-start"
                    required
                    value={cancelStartDate}
                    onChange={(e) => setCancelStartDate(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-bold transition-all" 
                  />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-rose-400 uppercase ml-1">To</label>
                   <input 
                    type="date" 
                    id="cancel-end"
                    required
                    value={cancelEndDate}
                    onChange={(e) => setCancelEndDate(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-bold transition-all" 
                  />
                </div>
              </div>

              <div id="cancel-times-section" className="space-y-2">
                <label className="text-[10px] font-bold text-rose-400 uppercase ml-1 block">Choose Times to Cancel (optional)</label>
                <div id="cancel-times-list" className="grid grid-cols-2 gap-x-2 gap-y-1.5 bg-white/60 p-2.5 rounded-xl border border-rose-100 min-h-[50px] max-h-32 overflow-y-auto">
                  {availableCancelTimes?.length ? (
                    availableCancelTimes.map(time => (
                      <div key={time} className="flex items-center gap-2 px-1.5 py-1 hover:bg-rose-50 rounded-md transition-colors">
                         <input type="checkbox" name="cancel-time" value={time} id={`time-${time}`} className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5" />
                         <label htmlFor={`time-${time}`} className="text-[11px] font-extrabold text-slate-800 cursor-pointer tabular-nums">{time}</label>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold italic col-span-2 flex items-center justify-center py-2 h-full">
                      {selectedCancelLineId && cancelStartDate && cancelEndDate 
                        ? 'No active trips found in this range.' 
                        : 'Select line & dates to see trips...'}
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={cancelTripsInRange.isPending}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-[0.98] mt-2 disabled:opacity-50"
              >
                {cancelTripsInRange.isPending ? 'Processing...' : 'Confirm Bulk Cancellation'}
              </button>
           </form>

        </div>
      </div>



      {/* RIGHT COLUMN: Trips List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Latest Scheduled Trips</h3>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                    filterStatus === status 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter by Route:</span>
            <select 
              value={filterLineId} 
              onChange={e => setFilterLineId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">All Lines</option>
              {lines?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {filterLineId && (
              <button onClick={() => setFilterLineId('')} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {tripsError ? (
            <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-2xl">
               <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
               <p className="text-sm font-bold text-rose-800">Failed to load trips</p>
               <p className="text-xs text-rose-600 mt-1">{(tripsError as any).message}</p>
            </div>
          ) : isLoadingTrips ? (
             <div className="p-8 text-center text-slate-400">Loading trips...</div>
          ) : trips?.filter(t => (filterStatus === 'ALL' || t.status === filterStatus) && (!filterLineId || t.lineId === filterLineId)).length === 0 ? (
             <div className="p-16 text-center text-slate-400 bg-slate-100 rounded-2xl border-4 border-white shadow-sm font-medium">No trips found matching your filters.</div>
          ) : (
            trips
              ?.filter(t => (filterStatus === 'ALL' || t.status === filterStatus) && (!filterLineId || t.lineId === filterLineId))
              .map((trip: TripInstance) => {
                const dt = new Date(trip.departureTime);
                const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                
                return (
                  <div key={trip.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group transition-shadow hover:shadow-md">
                    
                    {/* Left block: Time & Route */}
                    <div className="flex items-center gap-5">
                      <div className="text-center shrink-0 w-24">
                        <div className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5"><Clock className="w-4 h-4 text-blue-500"/> {timeStr}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">{dateStr}</div>
                      </div>
                      
                      <div className="w-px h-10 bg-slate-200"></div>
                      
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <Route className="w-4 h-4 text-slate-400" />
                          {trip.line?.name || 'Unknown Line'}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md" title="Driver">
                            <User className="w-3.5 h-3.5" /> {trip.driver?.name || <span className="italic text-slate-400">Unassigned</span>}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md" title="Vehicle">
                            <BusFront className="w-3.5 h-3.5" /> {trip.vehicle?.licensePlate || <span className="italic text-slate-400">Unassigned</span>}
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {trip.remainingSeats} / {trip.totalSeats} seats left
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right block: Status & Actions */}
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[trip.status]}`}>
                        {trip.status}
                      </span>
                      
                      {/* Action buttons */}
                      <div className="w-24 flex justify-end gap-1">
                        <button 
                          onClick={() => setEditingTripId(trip.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Trip"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => setManifestTripId(trip.id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="View Manifest"
                        >
                          <ClipboardList className="w-5 h-5" />
                        </button>

                        {(trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS') && (
                          <button 
                            onClick={() => {
                              if(window.confirm('Are you sure you want to cancel this trip? Riders will be refunded.')) {
                                cancelTrip.mutate(trip.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Cancel Trip"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>


    </div>
  );
}

// Sub-component for Editing Trip
function EditTripModal({ trip, onClose, onSave, drivers, vehicles }: { 
  trip: TripInstance, 
  onClose: () => void, 
  onSave: (data: any) => Promise<void>,
  drivers: any[],
  vehicles: any[]
}) {
  const dt = new Date(trip.departureTime);
  const [driverId, setDriverId] = useState(trip.driverId || '');
  const [vehicleId, setVehicleId] = useState(trip.vehicleId || '');
  const [departureDate, setDepartureDate] = useState(dt.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [departureTime, setDepartureTime] = useState(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [isSaving, setIsSaving] = useState(false);
  
  // To handle range in edit, we'll need the schedule mutation here too
  const scheduleTrip = useScheduleTrip();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const start = new Date(departureDate);
      const end = endDate ? new Date(endDate) : new Date(departureDate);
      
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dateTime = new Date(`${dateStr}T${departureTime}`).toISOString();

        if (current.getTime() === start.getTime()) {
          // Update the existing trip for the first day
          await onSave({
            driverId: driverId || null,
            vehicleId: vehicleId || null,
            departureTime: dateTime
          });
        } else {
          // Create new trips for subsequent days in the range
          await scheduleTrip.mutateAsync({
            lineId: trip.lineId,
            driverId: driverId || undefined,
            vehicleId: vehicleId || undefined,
            departureTime: dateTime
          });
        }
        current.setDate(current.getDate() + 1);
      }
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[400px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold flex items-center gap-2 text-slate-800">
            <Pencil className="w-5 h-5 text-blue-600" />
            Edit Scheduled Trip
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Route</label>
            <div className="mt-1 p-2 bg-slate-100 rounded-lg text-sm text-slate-500 font-medium">
              {trip.line?.name}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Assign Driver</label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">-- Unassigned --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id} disabled={d.status !== 'ACTIVE' && d.id !== trip.driverId}>
                  {d.name} {d.status !== 'ACTIVE' ? `(${d.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Assign Vehicle</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">-- Unassigned --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.make})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
              <input required type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">End Date <span className="text-slate-400 font-normal lowercase">(optional)</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={departureDate} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Departure Time</label>
            <input required type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
