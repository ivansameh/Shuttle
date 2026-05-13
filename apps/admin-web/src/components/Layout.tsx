import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  BusFront, 
  Map, 
  CalendarDays, 
  Users, 
  PieChart, 
  Route as RouteIcon,
  Megaphone,
  LogOut
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { api } from '../lib/axios';
import { useNotificationStore } from '../store/useNotificationStore';

const navItems = [
  { name: 'Analytics', path: '/', icon: PieChart },
  { name: 'Lines & Stops', path: '/lines', icon: RouteIcon },
  { name: 'Fleet & Drivers', path: '/fleet', icon: Users },
  { name: 'Trip Scheduler', path: '/scheduler', icon: CalendarDays },
  { name: 'Live Dispatch', path: '/dispatch', icon: Map },
  { name: 'User Directory', path: '/users', icon: Users },
  { name: 'Broadcast', path: '/broadcast', icon: Megaphone },
];

export default function Layout() {
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BusFront className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Shuttle</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 shadow-sm border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <NotificationBell 
              notifications={notifications} 
              unreadCount={unreadCount} 
              markAsRead={handleMarkAsRead} 
            />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
