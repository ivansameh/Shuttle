import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Bus, CalendarDays, ClipboardList, LogOut, MapPin, Search, AlertCircle } from 'lucide-react';

import { useNotificationStore } from '../store/useNotificationStore';
import NotificationBell from './NotificationBell';


const NAV_ITEMS = [
  { to: '/driver/schedule',  icon: CalendarDays,  label: 'Schedule',  end: true  },
  { to: '/driver/browse',    icon: Search,        label: 'Browse',    end: false },
  { to: '/driver/tracking',  icon: MapPin,        label: 'Tracking',  end: false },
];

export default function DriverLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead } = useNotificationStore();


  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';

  // --- Status Gate for Pending Drivers ---
  if (user?.role === 'DRIVER' && user?.status === 'PENDING') {
    return (
      <div className="min-h-screen bg-background flex flex-col p-6 items-center justify-center">
        <div className="w-full max-w-md text-center py-10 animate-slide-up">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100">
            <Bus className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-3">Pending Approval</h1>
          <p className="text-muted text-sm mb-10">
            Your account is currently under review by our team. 
            Once approved, your dashboard will be unlocked.
          </p>

          <div className="space-y-4">
            <button 
              onClick={() => navigate('/driver/register-vehicle')}
              className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all"
            >
              Register Your Vehicle
            </button>
            <button 
              onClick={handleLogout}
              className="text-muted hover:text-foreground text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto py-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Desktop Top Navbar ─────────────────────────── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto w-full px-6 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-black text-xl tracking-tight">Shuttle</span>
              <span className="badge bg-primary-100 text-primary-600 text-[10px]">DRIVER</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-muted hover:text-foreground hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : ''}`} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Notifications & User */}
          <div className="flex items-center gap-3">
            <NotificationBell 
              notifications={notifications}
              unreadCount={unreadCount}
              markAsRead={markAsRead}
            />
            
            <div className="flex items-center gap-2.5 bg-gray-50 border border-border rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-black">
                {initials}
              </div>
              <span className="text-sm text-foreground font-medium">{user?.name?.split(' ')[0]}</span>
            </div>

            <button 
              onClick={() => alert('SOS Alert sent to Admin Dispatch!')}
              className="w-9 h-9 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error hover:bg-error hover:text-white transition-all duration-200"
              title="Emergency Help"
            >
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </button>

            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl bg-input-bg border border-border flex items-center justify-center text-muted hover:text-error hover:border-error/40 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>


        </div>
      </header>

      {/* ── Mobile Top Bar ─────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-md shadow-primary-500/20">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground font-black text-lg tracking-tight">Shuttle</span>
            <span className="badge bg-primary-50 text-primary-600 text-[10px]">DRIVER</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-50 border border-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-black">
              {initials}
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-error p-1 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ───────────────────────────────── */}
      <main className="flex-1 max-w-2xl md:max-w-5xl mx-auto w-full px-4 py-5 pb-28 md:pb-8">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation ───────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border safe-bottom">
        <div className="flex">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] transition-all duration-200 relative ${
                  isActive ? 'text-primary-600' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 font-bold' : ''}`} />
                  <span className="text-[10px] font-bold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}
