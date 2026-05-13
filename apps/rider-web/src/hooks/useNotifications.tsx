import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { X, Info, Megaphone, Bell } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'SYSTEM' | 'TRIP_UPDATE' | 'PROMO';
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token, user } = useAuthStore(state => ({ token: state.token, user: state.user }));

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response: any = await api.get('/notifications');
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;

    fetchNotifications();

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(backendUrl, {
      auth: { 
        token,
        userId: user.id,
        role: user.role
      },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('new_notification', (payload: any) => {
      console.log('Received notification:', payload);
      
      const newId = payload.id || `notif-${Date.now()}`;
      
      // Update history
      setNotifications(prev => [{ ...payload, id: newId, isRead: false }, ...prev]);

      // Trigger Prominent Window Pop-up via Toast
      toast.custom(
        (t) => (
          <div className={`!fixed !inset-0 !m-0 !p-0 z-[99999] flex items-center justify-center transition-all duration-500 ${t.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Full Screen Extreme Blur Backdrop */}
            <div 
              className={`absolute inset-0 bg-black/80 backdrop-blur-[24px] transition-all duration-500 ${t.visible ? 'opacity-100' : 'opacity-0'}`} 
              onClick={() => toast.dismiss(t.id)} 
            />
            
            {/* Modal Window: Centered */}
            <div className={`relative w-[90%] max-w-md bg-surface/90 backdrop-blur-md shadow-[0_32px_120px_rgba(0,0,0,0.8)] rounded-[2.5rem] overflow-hidden border border-white/10 transition-all duration-500 ease-out ${t.visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-12 opacity-0'}`}>
              
              {/* Premium Top Polish */}
              <div className={`absolute top-0 inset-x-0 h-2 w-full bg-gradient-to-r ${
                payload.type === 'PROMO' ? 'from-purple-500 via-pink-500 to-purple-500' : 
                payload.type === 'TRIP_UPDATE' ? 'from-orange-500 via-amber-500 to-orange-500' : 'from-primary-400 via-primary-500 to-primary-600'
              }`} />
              
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-[22px] shadow-lg ${
                    payload.type === 'PROMO' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 
                    payload.type === 'TRIP_UPDATE' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  }`}>
                    {payload.type === 'PROMO' ? <Megaphone className="w-8 h-8" /> : payload.type === 'TRIP_UPDATE' ? <Bell className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                  </div>
                  
                  <button onClick={() => toast.dismiss(t.id)} className="p-2 hover:bg-white/10 rounded-full text-muted transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <h2 className="text-3xl font-black text-white mb-4 leading-tight tracking-tight uppercase tracking-tighter">{payload.title}</h2>
                <p className="text-slate-300 mb-10 leading-relaxed text-lg font-medium opacity-90">{payload.body}</p>
                
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className={`w-full py-5 text-white text-xl font-black rounded-[20px] transition-all active:scale-[0.97] shadow-2xl ${
                    payload.type === 'PROMO' ? 'bg-purple-600 shadow-purple-500/50 hover:bg-purple-500' : 
                    payload.type === 'TRIP_UPDATE' ? 'bg-orange-600 shadow-orange-500/50 hover:bg-orange-500' : 'bg-primary-500 shadow-primary-500/50 hover:bg-primary-600'
                  }`}
                >
                  DISMISS
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: Infinity, position: 'top-center' }
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark read', error);
      fetchNotifications();
    }
  };

  return { notifications, unreadCount, markAsRead, fetchNotifications };
};
