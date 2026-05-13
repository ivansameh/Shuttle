import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { X, Info, Megaphone } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/auth';

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
              className={`absolute inset-0 bg-slate-900/60 backdrop-blur-[20px] transition-all duration-500 ${t.visible ? 'opacity-100' : 'opacity-0'}`} 
              onClick={() => toast.dismiss(t.id)} 
            />
            
            {/* Modal Window: Centered */}
            <div className={`relative w-[90%] max-w-md bg-white/90 backdrop-blur-md shadow-[0_32px_120px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden border border-white/40 transition-all duration-500 ease-out ${t.visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-12 opacity-0'}`}>
              
              {/* Premium Top Polish */}
              <div className={`absolute top-0 inset-x-0 h-2 w-full bg-gradient-to-r ${
                payload.type === 'PROMO' ? 'from-purple-500 via-pink-500 to-purple-500' : 
                payload.type === 'TRIP_UPDATE' ? 'from-orange-500 via-amber-500 to-orange-500' : 'from-blue-400 via-blue-500 to-blue-600'
              }`} />
              
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-[22px] shadow-lg ${
                    payload.type === 'PROMO' ? 'bg-purple-100 text-purple-600' : 
                    payload.type === 'TRIP_UPDATE' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {payload.type === 'PROMO' ? <Megaphone className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                  </div>
                  
                  <button onClick={() => toast.dismiss(t.id)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight tracking-tight">{payload.title}</h2>
                <p className="text-slate-600 mb-10 leading-relaxed text-lg font-medium opacity-90">{payload.body}</p>
                
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className={`w-full py-5 text-white text-xl font-bold rounded-[20px] transition-all active:scale-[0.97] shadow-2xl ${
                    payload.type === 'PROMO' ? 'bg-purple-600 shadow-purple-500/40 hover:bg-purple-700' : 
                    payload.type === 'TRIP_UPDATE' ? 'bg-orange-600 shadow-orange-500/40 hover:bg-orange-700' : 'bg-blue-600 shadow-blue-500/40 hover:bg-blue-700'
                  }`}
                >
                  GOT IT
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

  return { 
    notifications, 
    unreadCount, 
    markAsRead, 
    fetchNotifications 
  };
};
