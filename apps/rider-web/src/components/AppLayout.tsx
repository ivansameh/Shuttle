import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Bus, Home, Ticket, User, LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { api } from '../lib/axios';
import { useNotificationStore } from '../store/useNotificationStore';

const NAV_ITEMS = [
  { to: '/rider/home',     icon: Home,   label: 'Dashboard', end: true  },
  { to: '/rider/bookings', icon: Ticket, label: 'My Trips',  end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead: storeMarkAsRead } = useNotificationStore();

  const handleMarkAsRead = async (id: string) => {
    try {
      storeMarkAsRead(id);
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?';

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Desktop Top Navbar ─────────────────────────── */}
      <header className="hidden md:flex sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto w-full px-6 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="text-foreground font-black text-xl tracking-tight">Shuttle</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2.5 outline-none rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-muted hover:text-foreground hover:bg-gray-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : ''}`} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User pill & dropdown */}
          <div className="flex items-center gap-3">
            <NotificationBell 
              notifications={notifications} 
              unreadCount={unreadCount} 
              markAsRead={handleMarkAsRead} 
            />
            
            <div className="relative group">
              <button
                className="flex items-center gap-2.5 bg-surface border border-border shadow-sm rounded-xl px-3 py-1.5 transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                  {initials}
                </div>
                <span className="text-sm text-foreground font-semibold pr-1">{user?.name?.split(' ')[0]}</span>
              </button>

              <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-2xl shadow-xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 py-2">
                <div className="px-4 py-2 border-b border-border mb-1">
                  <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] text-muted uppercase tracking-widest">{user?.role}</p>
                </div>
                <NavLink to="/rider/settings" className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-gray-50 Mtransition-colors">
                  <User className="w-4 h-4" /> Account Settings
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-error hover:bg-error/5 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile Top Bar ─────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-md shadow-primary-500/30">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <span className="text-foreground font-black text-lg tracking-tight">Shuttle</span>
          </div>
          {/* Avatar + logout */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/rider/settings"
              className={({ isActive }) => 
                `w-8 h-8 bg-primary-50 border border-primary-200 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold transition-all ${isActive ? 'ring-2 ring-primary-500/30' : ''}`
              }
            >
              {initials}
            </NavLink>
            <NotificationBell 
              notifications={notifications} 
              unreadCount={unreadCount} 
              markAsRead={handleMarkAsRead} 
            />
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
                  isActive ? 'text-primary-400' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active pill indicator */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-full" />
                  )}
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-primary-600' : ''}`} />
                  <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-primary-600' : ''}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Profile shortcut (mobile only) */}
          <button
            onClick={() => navigate('/rider/settings')}
            className="flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] text-muted transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-wide">Account</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
