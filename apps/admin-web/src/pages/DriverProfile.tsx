import { useParams, useNavigate } from 'react-router-dom';
import { useDriverProfile } from '../api/fleet';
import { 
  User, 
  MapPin, 
  TrendingUp, 
  Banknote, 
  ArrowLeft, 
  Calendar, 
  CreditCard,
  Clock,
  ArrowRightLeft
} from 'lucide-react';

export default function DriverProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDriverProfile(id || null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h3 className="font-bold">Error</h3>
        <p>Could not load driver profile. Please ensure the ID is valid.</p>
        <button onClick={() => navigate(-1)} className="mt-4 flex items-center gap-2 text-sm font-bold uppercase">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const { profile, stats, trips, transactions } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Driver Profile: {profile.name}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Detailed financial and operational summary for this driver.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {profile.status}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: stats.totalEarned, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Paid out', value: stats.totalPaid, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Payout', value: stats.pendingPayout, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Current Balance', value: stats.balance, icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{Number(stat.value).toLocaleString()} EGP</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Trips */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Trip History
            </h3>
            <span className="text-xs text-slate-400 font-medium uppercase">Last 20 Trips</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
            {trips.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No trips recorded yet.</div>
            ) : (
              trips.map((trip: any) => (
                <div key={trip.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold text-slate-800">{trip.line.name}</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                         trip.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                       }`}>
                         {trip.status}
                       </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(trip.departureTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {trip._count.bookings} Riders</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-slate-800 font-bold">
                      {Number(trip.line.fixedPrice * trip._count.bookings * (1 - trip.line.commissionRate)).toLocaleString()} EGP
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial Transactions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
              Financial Ledger
            </h3>
            <span className="text-xs text-slate-400 font-medium uppercase">Recent Activity</span>
          </div>
          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
             {transactions.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-sm">No transactions recorded yet.</div>
             ) : (
               transactions.map((tx: any) => (
                 <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                       tx.type === 'PAYOUT' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                     }`}>
                       {tx.type === 'PAYOUT' ? <ArrowLeft className="w-4 h-4 rotate-45" /> : <TrendingUp className="w-4 h-4" />}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight text-[10px]">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                     </div>
                   </div>
                   <div className="text-right">
                      <p className={`font-bold ${tx.type === 'PAYOUT' ? 'text-red-600' : 'text-slate-800'}`}>
                        {tx.type === 'PAYOUT' ? '-' : '+'}{Number(tx.amount).toLocaleString()} EGP
                      </p>
                      <span className={`text-[10px] font-black uppercase ${
                        tx.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {tx.status}
                      </span>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
