import { useState, useMemo } from 'react';
import { useLines, useCreateLine, useUpdateLine, useDeleteLine, useStops, useCreateStop, useDeleteStop, useUpdateStop, Line, Stop } from '../api/lines';

import { Route, MapPin, Plus, Trash2, ChevronRight, Map, Banknote, Edit2, Check, X } from 'lucide-react';
import ShuttleMap from '../components/ShuttleMap';


export default function Lines() {
  const { data: lines, isLoading: isLoadingLines } = useLines();
  const createLine = useCreateLine();
  const updateLine = useUpdateLine();
  const deleteLine = useDeleteLine();

  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  
  const selectedLine = useMemo(() => 
    lines?.find(l => l.id === selectedLineId), [lines, selectedLineId]
  );
  
  // Create Line Form
  const [newLineData, setNewLineData] = useState({ 
    name: '', 
    startLat: '', 
    startLng: '', 
    startPointName: '',
    endLat: '', 
    endLng: '', 
    endPointName: '',
    fixedPrice: '',
    commissionRate: '0.10',
    schedules: [] as { time: string, daysOfWeek: number[] }[]
  });
  const [activePicking, setActivePicking] = useState<'start' | 'end' | null>(null);
  const [newTime, setNewTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 7]); // Default Sun-Thu

  const days = [
    { label: 'S', value: 7 },
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'T', value: 4 },
    { label: 'F', value: 5 },
    { label: 'S', value: 6 },
  ];

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const { data: stops, isLoading: isLoadingStops } = useStops(selectedLineId);
  const createStop = useCreateStop();
  const deleteStop = useDeleteStop();
  const updateStop = useUpdateStop();

  // Create Stop Form
  const [newStopData, setNewStopData] = useState({ name: '', lat: '', lng: '', orderIndex: '' });

  // Edit Stop/Line State
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editStopName, setEditStopName] = useState<string>('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState<string>('');

  const handleCreateLine = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLine.mutateAsync({
      name: newLineData.name,
      startLat: parseFloat(newLineData.startLat),
      startLng: parseFloat(newLineData.startLng),
      startPointName: newLineData.startPointName,
      endLat: parseFloat(newLineData.endLat),
      endLng: parseFloat(newLineData.endLng),
      endPointName: newLineData.endPointName,
      fixedPrice: parseFloat(newLineData.fixedPrice),
      commissionRate: parseFloat(newLineData.commissionRate),
      schedules: newLineData.schedules,
    });
    setNewLineData({ name: '', startLat: '', startLng: '', startPointName: '', endLat: '', endLng: '', endPointName: '', fixedPrice: '', commissionRate: '0.10', schedules: [] });
  };

  const handleCreateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineId) return;

    await createStop.mutateAsync({
      lineId: selectedLineId,
      name: newStopData.name,
      lat: parseFloat(newStopData.lat),
      lng: parseFloat(newStopData.lng),
      orderIndex: parseInt(newStopData.orderIndex, 10),
    });
    setNewStopData({ name: '', lat: '', lng: '', orderIndex: '' });
  };

  const getDayLabels = (dayValues: number[]) => {
    if (dayValues.length === 7) return 'Daily';
    if (JSON.stringify(dayValues.sort()) === JSON.stringify([1,2,3,4,7])) return 'Sun-Thu';
    return dayValues.map(v => days.find(d => d.value === v)?.label).join('');
  };

  // Replicate the geographic-first nearest-neighbor sort
  const sortedStopsList = useMemo(() => {
    if (!stops || stops.length === 0) return [];
    
    // Sort starting from the Line's defined Start Point
    const startPt = selectedLine ? { lat: selectedLine.startLat, lng: selectedLine.startLng } : null;
    if (!startPt) return [...stops].sort((a, b) => a.orderIndex - b.orderIndex);

    const sorted: Stop[] = [];
    const remaining = [...stops];

    let currentPos = startPt;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const dist = Math.pow(currentPos.lat - candidate.lat, 2) + Math.pow(currentPos.lng - candidate.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      const found = remaining[nearestIdx];
      sorted.push(found);
      currentPos = { lat: found.lat, lng: found.lng };
      remaining.splice(nearestIdx, 1);
    }
    
    return sorted;
  }, [stops, selectedLine]);

  return (
    <div className="h-full flex gap-6">
      
      {/* LEFT COLUMN: Lines List */}
      <div className="w-1/2 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Route className="w-6 h-6 text-blue-600" />
            Shuttle Lines
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage the available bus routes and their base prices.</p>
        </div>

        {/* Create Line Form */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Create New Line</h3>
          <form className="space-y-4" onSubmit={handleCreateLine}>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Route Name</label>
              <input required value={newLineData.name} onChange={(e) => setNewLineData({...newLineData, name: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. Downtown Express" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Start Point</label>
                <div 
                  onClick={() => setActivePicking('start')}
                  className={`mt-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    activePicking === 'start' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">
                      {newLineData.startPointName || (newLineData.startLat ? `${parseFloat(newLineData.startLat).toFixed(4)}, ${parseFloat(newLineData.startLng).toFixed(4)}` : 'Click to set on map')}
                    </span>
                    <span className="text-[10px] text-slate-400">Departure Station Name</span>
                  </div>
                  <MapPin className={`w-4 h-4 ${newLineData.startLat ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">End Point</label>
                <div 
                  onClick={() => setActivePicking('end')}
                  className={`mt-1 p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    activePicking === 'end' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-slate-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">
                      {newLineData.endPointName || (newLineData.endLat ? `${parseFloat(newLineData.endLat).toFixed(4)}, ${parseFloat(newLineData.endLng).toFixed(4)}` : 'Click to set on map')}
                    </span>
                    <span className="text-[10px] text-slate-400">Destination Terminal Name</span>
                  </div>
                  <MapPin className={`w-4 h-4 ${newLineData.endLat ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              </div>
            </div>

            {activePicking && (
              <div className="rounded-xl overflow-hidden border border-blue-200 h-48 relative animate-in fade-in zoom-in duration-300">
                <ShuttleMap 
                  mode="builder"
                  initialStops={[]}
                  onStopsChange={async (stops) => {
                    const latest = stops[stops.length - 1];
                    if (!latest) return;
                    
                    if (activePicking === 'start') {
                      setNewLineData(prev => ({ ...prev, startLat: latest.lat.toString(), startLng: latest.lng.toString() }));
                    } else {
                      setNewLineData(prev => ({ ...prev, endLat: latest.lat.toString(), endLng: latest.lng.toString() }));
                    }

                    // Auto-fill name logic
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latest.lat}&lon=${latest.lng}`);
                      const data = await res.json();
                      const pointName = data.display_name.split(',')[0] || data.name || "Station";
                      
                      if (activePicking === 'start') {
                        setNewLineData(prev => ({ 
                          ...prev, 
                          startPointName: pointName,
                          name: prev.name || `${pointName} - ...` 
                        }));
                      } else {
                        setNewLineData(prev => ({ 
                          ...prev, 
                          endPointName: pointName,
                          name: prev.name.includes(' - ...') ? prev.name.replace(' - ...', ` - ${pointName}`) : (prev.name || `... - ${pointName}`)
                        }));
                      }
                    } catch {}
                    
                    // Toggle to next or close
                    if (activePicking === 'start' && !newLineData.endLat) setActivePicking('end');
                    else setActivePicking(null);
                  }}
                />
                <div className="absolute top-2 left-2 z-[1000] bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                  Click on map to set {activePicking} point
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Fixed Price (EGP)</label>
                <input required type="number" min="0" value={newLineData.fixedPrice} onChange={(e) => setNewLineData({...newLineData, fixedPrice: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="25.00" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Web Commission (%)</label>
                <input required type="number" step="0.01" min="0" max="1" value={newLineData.commissionRate} onChange={(e) => setNewLineData({...newLineData, commissionRate: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="0.15" />
                <p className="text-[10px] text-slate-400 mt-0.5">Decimal: 0.10 = 10%</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase italic">Daily Recurring Times</label>
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex gap-2">
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  <button 
                    type="button" 
                    onClick={() => { 
                      if(newTime && !newLineData.schedules.some(s => s.time === newTime && JSON.stringify(s.daysOfWeek) === JSON.stringify(selectedDays))) { 
                        setNewLineData({...newLineData, schedules: [...newLineData.schedules, { time: newTime, daysOfWeek: [...selectedDays] }].sort((a,b) => a.time.localeCompare(b.time))}); 
                        setNewTime(''); 
                      } 
                    }} 
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {days.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${
                        selectedDays.includes(d.value) 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                  <span className="text-[10px] text-slate-400 font-bold uppercase ml-2 whitespace-nowrap">
                    {getDayLabels(selectedDays)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {newLineData.schedules.length === 0 && <span className="text-[10px] text-slate-400">No schedules added yet.</span>}
                {newLineData.schedules.map((s, idx) => (
                  <div key={idx} className="bg-blue-50 text-blue-600 px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col gap-0.5 border border-blue-100 min-w-[70px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>{s.time}</span>
                      <button type="button" onClick={() => setNewLineData({...newLineData, schedules: newLineData.schedules.filter((_, i) => i !== idx)})} className="hover:text-red-500"><Plus className="w-3 h-3 rotate-45" /></button>
                    </div>
                    <span className="text-[9px] text-blue-400 uppercase tracking-tighter">{getDayLabels(s.daysOfWeek)}</span>
                  </div>
                ))}
              </div>
            </div>


            <button type="submit" disabled={createLine.isPending} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add Line
            </button>
          </form>
        </div>

        {/* Lines List */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {isLoadingLines ? (
            <div className="p-8 text-center text-slate-400">Loading lines...</div>
          ) : lines?.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No lines found. Add one above.</div>
          ) : (
            lines?.map((line: Line) => (
              <div 
                key={line.id} 
                onClick={() => setSelectedLineId(line.id)}
                className={`p-4 cursor-pointer transition-colors group flex items-center justify-between ${selectedLineId === line.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex-1">
                  {editingLineId === line.id ? (
                    <form 
                      className="flex items-center gap-2"
                      onClick={e => e.stopPropagation()}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editLineName.trim()) return;
                        await updateLine.mutateAsync({ id: line.id, data: { name: editLineName } });
                        setEditingLineId(null);
                      }}
                    >
                      <input 
                        autoFocus
                        value={editLineName}
                        onChange={e => setEditLineName(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-white border border-blue-500 rounded focus:outline-none font-bold"
                      />
                      <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditingLineId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <h4 className={`font-bold flex items-center gap-2 ${selectedLineId === line.id ? 'text-blue-700' : 'text-slate-800'}`}>
                        {line.name}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLineId(line.id);
                            setEditLineName(line.name);
                          }}
                          className="p-1 text-slate-300 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1"><Map className="w-3.5 h-3.5" /> Coordinates set</span>
                        <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> {line.fixedPrice} {line.currency}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLine.mutate(line.id); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className={`w-5 h-5 ${selectedLineId === line.id ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Stops for Selected Line */}
      <div className="w-1/2 flex flex-col gap-5 overflow-y-auto pb-8 pr-2">
        {!selectedLineId ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed text-slate-400 p-8 text-center min-h-[400px]">
            <MapPin className="w-12 h-12 mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">Select a Line</h3>
            <p className="text-sm">Choose a line from the left panel to manage its stops.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                <MapPin className="w-6 h-6 text-indigo-500" />
                Line Builder
              </h2>
              <p className="text-slate-500 text-sm mt-1">Click the map to add stops or manage boarding points.</p>
            </div>

            {/* Interactive Map */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0" style={{ minHeight: '350px' }}>
              <ShuttleMap 
                mode="builder"
                startPoint={selectedLine ? { lat: selectedLine.startLat, lng: selectedLine.startLng } : null}
                endPoint={selectedLine ? { lat: selectedLine.endLat, lng: selectedLine.endLng } : null}
                initialStops={stops?.map((s: Stop) => ({ lat: s.lat, lng: s.lng })) || []}
                onStopsChange={async (newStops) => {
                  const latest = newStops[newStops.length - 1];
                  if (latest) {
                    // Don't add if it matches start or end points (they are already anchors)
                    if (selectedLine) {
                       if (Math.abs(latest.lat - selectedLine.startLat) < 0.0001 && Math.abs(latest.lng - selectedLine.startLng) < 0.0001) return;
                       if (Math.abs(latest.lat - selectedLine.endLat) < 0.0001 && Math.abs(latest.lng - selectedLine.endLng) < 0.0001) return;
                    }

                    setNewStopData({
                      ...newStopData,
                      lat: latest.lat.toString(),
                      lng: latest.lng.toString(),
                      orderIndex: (stops?.length ? stops.length + 1 : 1).toString()
                    });

                    // Reverse Geocode to get a name
                    try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latest.lat}&lon=${latest.lng}`);
                      const data = await res.json();
                      const name = data.display_name.split(',')[0] || data.name || "New Stop";
                      setNewStopData(prev => ({ ...prev, name }));
                    } catch (e) {
                      console.error("Geocoding failed", e);
                    }
                  }
                }}
              />
            </div>

            {/* Create Stop Form */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Add Stop</h3>
              <form className="space-y-4" onSubmit={handleCreateStop}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Stop Name</label>
                     <input required value={newStopData.name} onChange={(e) => setNewStopData({...newStopData, name: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Central Station" />
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Order Index</label>
                     <input required type="number" min="1" value={newStopData.orderIndex} onChange={(e) => setNewStopData({...newStopData, orderIndex: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="1" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Latitude</label>
                    <input required type="number" step="any" value={newStopData.lat} onChange={(e) => setNewStopData({...newStopData, lat: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="30.0444" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Longitude</label>
                    <input required type="number" step="any" value={newStopData.lng} onChange={(e) => setNewStopData({...newStopData, lng: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="31.2357" />
                  </div>
                </div>

                <button type="submit" disabled={createStop.isPending} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" /> Add Stop
                </button>
              </form>
            </div>

            {/* Stops List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 min-h-[200px] shrink-0">
              {isLoadingStops ? (
                <div className="p-8 text-center text-slate-400">Loading stops...</div>
              ) : stops?.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No stops configured for this line.</div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute top-6 bottom-6 left-[27px] w-0.5 bg-slate-200"></div>
                  
                  <div className="space-y-1 relative">
                    {/* START POINT EDITABLE */}
                    <div className="flex flex-row items-center gap-4 p-3 hover:bg-blue-50/30 rounded-xl group transition-colors w-full">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white z-10 shadow-sm">
                        S
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {editingLineId === 'START_POINT' ? (
                          <form className="flex items-center gap-2" onSubmit={async (e) => {
                            e.preventDefault();
                            await updateLine.mutateAsync({ id: selectedLineId, data: { startPointName: editLineName } });
                            setEditingLineId(null);
                          }}>
                            <input autoFocus value={editLineName} onChange={e => setEditLineName(e.target.value)} className="w-full px-2 py-1 text-sm bg-white border border-blue-500 rounded focus:outline-none" />
                            <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setEditingLineId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
                          </form>
                        ) : (
                          <>
                            <h4 className="font-bold text-blue-800 flex items-center gap-2">
                              {selectedLine?.startPointName || 'Line Start Terminal'}
                              <button onClick={() => { setEditingLineId('START_POINT'); setEditLineName(selectedLine?.startPointName || ''); }} className="p-1 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-3 h-3" /></button>
                            </h4>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Base Departure Point</p>
                          </>
                        )}
                      </div>
                    </div>

                    {sortedStopsList.map((stop: Stop, index: number) => (
                      <div key={stop.id} className="flex flex-row items-center gap-4 p-3 hover:bg-slate-50 rounded-xl group transition-colors w-full">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center text-xs font-bold text-indigo-600 z-10 shadow-sm" style={{ borderRadius: '50%' }}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 overflow-hidden" style={{ width: '100%' }}>
                          {editingStopId === stop.id ? (
                            <form 
                              className="flex items-center gap-2"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if(!editStopName.trim()) return;
                                await updateStop.mutateAsync({ id: stop.id, lineId: stop.lineId, data: { name: editStopName } });
                                setEditingStopId(null);
                              }}
                            >
                              <input 
                                autoFocus
                                value={editStopName}
                                onChange={e => setEditStopName(e.target.value)}
                                className="w-full px-2 py-1 text-sm bg-white border border-indigo-500 rounded focus:outline-none"
                              />
                              <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => setEditingStopId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </form>
                          ) : (
                            <>
                              <h4 className="font-bold text-slate-800 truncate" title={stop.name}>{stop.name}</h4>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</p>
                            </>
                          )}
                        </div>
                        
                        {editingStopId !== stop.id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingStopId(stop.id);
                                setEditStopName(stop.name);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Rename Stop"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteStop.mutate({ id: stop.id, lineId: stop.lineId })}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Stop"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* END POINT EDITABLE */}
                    <div className="flex flex-row items-center gap-4 p-3 hover:bg-indigo-50/30 rounded-xl group transition-colors w-full border-t border-slate-50 mt-2">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-xs font-bold text-white z-10 shadow-sm">
                        E
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {editingLineId === 'END_POINT' ? (
                          <form className="flex items-center gap-2" onSubmit={async (e) => {
                            e.preventDefault();
                            await updateLine.mutateAsync({ id: selectedLineId || '', data: { endPointName: editLineName } });
                            setEditingLineId(null);
                          }}>
                            <input autoFocus value={editLineName} onChange={e => setEditLineName(e.target.value)} className="w-full px-2 py-1 text-sm bg-white border border-indigo-500 rounded focus:outline-none" />
                            <button type="submit" className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4" /></button>
                            <button type="button" onClick={() => setEditingLineId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
                          </form>
                        ) : (
                          <>
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                              {selectedLine?.endPointName || 'Line Final Terminal'}
                              <button onClick={() => { setEditingLineId('END_POINT'); setEditLineName(selectedLine?.endPointName || ''); }} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100"><Edit2 className="w-3 h-3" /></button>
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Final Destination Terminal</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
