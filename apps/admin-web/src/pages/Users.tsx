import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers, useUserBookings, User } from '../api/users';
import { useTrips } from '../api/trips';
import { useApproveDriver, useDeclineDriver } from '../api/fleet';
import { 
  Users as UsersIcon, 
  Search, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  History, 
  ChevronRight, 
  Filter, 
  Clock, 
  Route as RouteIcon, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ShieldX
} from 'lucide-react';

export default function Users() {
  const navigate = useNavigate();
  const [tripIdFilter, setTripIdFilter] = useState<string>('');
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useUsers(tripIdFilter || undefined);
  const { data: trips } = useTrips();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: bookings, isLoading: isLoadingBookings } = useUserBookings(selectedUserId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const selectedUser = users?.find(u => u.id === selectedUserId);

  const approveDriver = useApproveDriver();
  const declineDriver = useDeclineDriver();

  const handleApprove = async () => {
    if (!selectedUserId) return;
    await approveDriver.mutateAsync(selectedUserId);
  };

  const handleDecline = async () => {
    if (!selectedUserId) return;
    await declineDriver.mutateAsync(selectedUserId);
  };

  // Filter users based on search, role, and trip participation
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone && user.phone.includes(searchQuery));
    
    const matchesRole = roleFilter === 'ALL' || 
                       user.role.toString().toUpperCase() === roleFilter.toUpperCase();
    
    const matchesStatus = statusFilter === 'ALL' || 
                         (user.status === statusFilter);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-blue-500 bg-blue-50';
      case 'BOARDED': return 'text-emerald-500 bg-emerald-50';
      case 'CANCELLED': return 'text-rose-500 bg-rose-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      
      {/* LEFT COLUMN: User List & Search */}
      <div className="w-[380px] shrink-0 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <UsersIcon className="w-6 h-6 text-indigo-600" />
            User Directory
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {users ? `${filteredUsers?.length} of ${users.length} users shown` : 'Manage passengers and staff.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name, email, phone..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={roleFilter} 
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="ALL">All Roles</option>
                  <option value="RIDER">Riders</option>
                  <option value="DRIVER">Drivers</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>

              <div className="flex-1 relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Waiting Approval</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="SUSPENDED">Suspended Only</option>
                  <option value="REJECTED">Rejected Only</option>
                </select>
              </div>

              <div className="flex-1 relative">
                <RouteIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={tripIdFilter} 
                  onChange={e => setTripIdFilter(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="">All Trips</option>
                  {trips?.map(trip => (
                    <option key={trip.id} value={trip.id}>
                      {trip.line?.name} - {new Date(trip.departureTime).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {usersError ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">Connection Error</p>
                <p className="text-xs text-slate-500">{(usersError as Error).message}</p>
              </div>
            ) : isLoadingUsers ? (
              <div className="p-8 text-center text-slate-400">Loading directory...</div>
            ) : !users || users.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No users found in database.</div>
            ) : filteredUsers?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No users match filters.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredUsers?.map((user: User) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-4 flex items-center justify-between text-left transition-all hover:bg-slate-50 group ${
                      selectedUserId === user.id ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                        user.role === 'ADMIN' ? 'bg-indigo-500' :
                        user.role === 'DRIVER' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          {user.name}
                          {user.status === 'ACTIVE' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Active Account"></span>
                          )}
                          {user.status === 'PENDING' && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" title="Waiting for Approval"></span>
                          )}
                          {user.status === 'REJECTED' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" title="Rejected Application"></span>
                          )}
                          {user.status === 'SUSPENDED' && (
                            <span className="w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]" title="Suspended Account"></span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[180px]">{user.email}</div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${
                      selectedUserId === user.id ? 'translate-x-1 text-indigo-400' : 'group-hover:translate-x-0.5'
                    }`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: User Details & History */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-center text-slate-400">
              <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a user from the directory to view history</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* User Header Info */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                     selectedUser?.role === 'ADMIN' ? 'bg-indigo-500 shadow-indigo-200' :
                     selectedUser?.role === 'DRIVER' ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-500 shadow-blue-200'
                  }`}>
                    {selectedUser?.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-800">{selectedUser?.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                         selectedUser?.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                         selectedUser?.role === 'DRIVER' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {selectedUser?.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 pb-1">
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {selectedUser?.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {selectedUser?.phone || 'No phone provided'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  {selectedUser?.role === 'DRIVER' && selectedUser?.status === 'PENDING' && (
                    <div className="flex items-center gap-2 mb-2">
                       <button 
                         onClick={handleApprove}
                         disabled={approveDriver.isPending}
                         className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                       >
                         <ShieldCheck className="w-4 h-4" /> Approve Driver
                       </button>
                       <button 
                         onClick={handleDecline}
                         disabled={declineDriver.isPending}
                         className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                       >
                         <ShieldX className="w-4 h-4" /> Decline
                       </button>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Created</p>
                    <p className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {selectedUser ? new Date(selectedUser.createdAt).toLocaleDateString() : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings / Trip History */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Booking & Trip History
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {isLoadingBookings ? (
                  <div className="p-8 text-center text-slate-400">Loading trip history...</div>
                ) : !bookings || bookings.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 bg-slate-100 rounded-2xl border-4 border-white shadow-sm font-medium">
                    This user hasn't booked any trips yet.
                  </div>
                ) : (
                  bookings.map(booking => {
                    const dt = new Date(booking.tripInstance.departureTime);
                    const isFuture = dt > new Date() && booking.tripInstance.status !== 'CANCELLED';
                    
                    return (
                      <div key={booking.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-[10px] ${
                            isFuture ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'
                          }`}>
                            <span>{dt.toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span className="text-lg leading-none">{dt.getDate()}</span>
                          </div>
                          
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              {booking.tripInstance.line.name}
                              {isFuture && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-600 text-white rounded-md flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> RESERVED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> Driver: {booking.tripInstance.driver?.name || 'Unassigned'}</span>
                              <span>&bull;</span>
                              <span className="font-bold text-slate-700">{booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <button 
                             onClick={() => navigate(`/chat/${booking.id}`)}
                             className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200"
                             title="Monitor Chat"
                           >
                             <MessageSquare className="w-4 h-4" />
                           </button>
                           <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(booking.status)}`}>
                             {booking.status}
                           </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
