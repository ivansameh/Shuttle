import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import { useNotificationStore } from '../store/useNotificationStore';
import { api } from '../lib/axios';
import { X, Info, Megaphone } from 'lucide-react';

export default function NotificationManager() {
  const { token, user } = useAuthStore();
  const { 
    latestNotification, 
    setLatestNotification, 
    addNotification, 
    setNotifications 
  } = useNotificationStore();

  useEffect(() => {
    if (!token || !user) return;

    // Initial fetch
    api.get('/notifications').then((res: any) => {
      if (res.success) setNotifications(res.data);
    });

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socket = io(backendUrl, {
      auth: { token, userId: user.id, role: user.role },
      transports: ['websocket'],
    });

    socket.on('new_notification', (payload: any) => {
      const enriched = {
        ...payload,
        id: payload.id || `notif-${Date.now()}`,
        isRead: false
      };
      addNotification(enriched);
      setLatestNotification(enriched);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, setNotifications, addNotification, setLatestNotification]);

  if (!latestNotification) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Heavy Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[24px] animate-in fade-in duration-500"
        onClick={() => setLatestNotification(null)}
      />
      
      {/* Centered Modal Window */}
      <div className="relative w-full max-w-md bg-white shadow-[0_32px_128px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className={`h-2 w-full ${
          latestNotification.type === 'PROMO' ? 'bg-purple-600' : 
          latestNotification.type === 'TRIP_UPDATE' ? 'bg-orange-600' : 'bg-blue-600'
        }`} />
        
        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div className={`flex items-center justify-center w-16 h-16 rounded-[22px] ${
              latestNotification.type === 'PROMO' ? 'bg-purple-50 text-purple-600' : 
              latestNotification.type === 'TRIP_UPDATE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {latestNotification.type === 'PROMO' ? <Megaphone className="w-8 h-8" /> : <Info className="w-8 h-8" />}
            </div>
            <button onClick={() => setLatestNotification(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight tracking-tight">{latestNotification.title}</h2>
          <p className="text-slate-600 mb-10 leading-relaxed text-lg font-medium opacity-90">{latestNotification.body}</p>
          
          <button
            onClick={() => setLatestNotification(null)}
            className={`w-full py-5 text-white text-xl font-bold rounded-[22px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl ${
              latestNotification.type === 'PROMO' ? 'bg-purple-600 shadow-purple-600/30' : 
              latestNotification.type === 'TRIP_UPDATE' ? 'bg-orange-600 shadow-orange-600/30' : 'bg-blue-600 shadow-blue-600/30'
            }`}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
