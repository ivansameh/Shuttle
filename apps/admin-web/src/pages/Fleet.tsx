import { useState } from 'react';
import { useDrivers, useCreateDriver, useDeleteDriver, useVehicles, useCreateVehicle, useDeleteVehicle, useApproveDriver, useDeclineDriver, Driver, Vehicle } from '../api/fleet';
import { Users, Truck, Plus, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Fleet() {
  // Navigation internal state
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles'>('drivers');

  // Drivers
  const { data: drivers, isLoading: isLoadingDrivers } = useDrivers();
  const createDriver = useCreateDriver();
  const deleteDriver = useDeleteDriver();
  const [newDriver, setNewDriver] = useState({ name: '', email: '', phone: '', password: '' });

  // Vehicles
  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles();
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const [newVehicle, setNewVehicle] = useState({ licensePlate: '', make: '', model: '', capacity: '14' });

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDriver.mutateAsync(newDriver);
    setNewDriver({ name: '', email: '', phone: '', password: '' });
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVehicle.mutateAsync({
      licensePlate: newVehicle.licensePlate,
      make: newVehicle.make,
      model: newVehicle.model,
      capacity: parseInt(newVehicle.capacity, 10),
    });
    setNewVehicle({ licensePlate: '', make: '', model: '', capacity: '14' });
  };

  // Filtering
  const [driverStatusFilter, setDriverStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE'>('ALL');

  const approveDriver = useApproveDriver();
  const declineDriver = useDeclineDriver();

  const filteredDrivers = drivers?.filter(d => {
    if (driverStatusFilter === 'ALL') return true;
    return d.status === driverStatusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase">Pending</span>;
      case 'ACTIVE': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Active</span>;
      case 'REJECTED': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase">Rejected</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">{status}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* Header & Tabs */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Truck className="w-6 h-6 text-blue-600" />
            Fleet & Drivers
          </h2>
          <p className="text-slate-500 text-sm mt-1 mb-4">Manage driver accounts and registered vehicles.</p>
          
          <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab('drivers')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'drivers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Drivers</div>
            </button>
            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vehicles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Vehicles</div>
            </button>
          </div>
        </div>

        {activeTab === 'drivers' && (
          <div className="flex bg-white border border-slate-200 p-1 rounded-xl mb-1 shadow-sm">
            <button onClick={() => setDriverStatusFilter('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${driverStatusFilter === 'ALL' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
            <button onClick={() => setDriverStatusFilter('PENDING')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${driverStatusFilter === 'PENDING' ? 'bg-amber-100/50 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}>Waiting Approval</button>
            <button onClick={() => setDriverStatusFilter('ACTIVE')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${driverStatusFilter === 'ACTIVE' ? 'bg-emerald-100/50 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>Active</button>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: Create Form */}
        <div className="w-1/3">
          {activeTab === 'drivers' ? (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Register Driver</h3>
              <form className="space-y-4" onSubmit={handleCreateDriver}>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                  <input required value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ahmed Ali" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Email (App Login)</label>
                  <input required type="email" value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="ahmed@driver.shuttle.com" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                  <input required value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="+201234567890" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                  <input required type="password" value={newDriver.password} onChange={e => setNewDriver({...newDriver, password: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                </div>
                <button type="submit" disabled={createDriver.isPending} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-6">
                  <Plus className="w-4 h-4" /> Add Driver
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Register Vehicle</h3>
              <form className="space-y-4" onSubmit={handleCreateVehicle}>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">License Plate</label>
                  <input required value={newVehicle.licensePlate} onChange={e => setNewVehicle({...newVehicle, licensePlate: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 uppercase font-mono" placeholder="ABC-1234" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Make</label>
                    <input required value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Toyota" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Model</label>
                    <input required value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="Hiace" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Passenger Capacity</label>
                  <input required type="number" min="1" value={newVehicle.capacity} onChange={e => setNewVehicle({...newVehicle, capacity: e.target.value})} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="14" />
                </div>
                <button type="submit" disabled={createVehicle.isPending} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50 mt-6">
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Data List */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 p-2">
          {activeTab === 'drivers' ? (
            isLoadingDrivers ? (
              <div className="p-8 text-center text-slate-400">Loading drivers...</div>
            ) : filteredDrivers?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No driver accounts found for this filter.</div>
            ) : (
              filteredDrivers?.map((driver: Driver) => (
                <div key={driver.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl group transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200 shrink-0">
                    {driver.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 truncate">{driver.name}</h4>
                      {getStatusBadge(driver.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 font-medium">
                      <span>{driver.email}</span>
                      <span>&bull;</span>
                      <span>{driver.phone}</span>
                    </div>
                    {driver.vehicles && driver.vehicles.length > 0 && (
                      <div className="mt-2 flex gap-1.5">
                        {driver.vehicles.map(v => (
                          <span key={v.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono">
                            {v.licensePlate} ({v.make})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driver.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => approveDriver.mutate(driver.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => declineDriver.mutate(driver.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    <Link 
                      to={`/fleet/${driver.id}`}
                      className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      Profile <ArrowRight className="w-3 h-3" />
                    </Link>
                    {driver.status !== 'PENDING' && (
                      <button 
                        onClick={() => deleteDriver.mutate(driver.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Deactivate account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            isLoadingVehicles ? (
              <div className="p-8 text-center text-slate-400">Loading vehicles...</div>
            ) : vehicles?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No vehicles registered.</div>
            ) : (
              vehicles?.map((vehicle: Vehicle) => (
                <div key={vehicle.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl group transition-colors">
                  <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                    <Truck className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 uppercase tracking-widest">{vehicle.licensePlate}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 uppercase">
                        {vehicle.capacity} Seats
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{vehicle.make} {vehicle.model}</p>
                  </div>
                  <button 
                    onClick={() => deleteVehicle.mutate(vehicle.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )
          )}
        </div>

      </div>
    </div>
  );
}
