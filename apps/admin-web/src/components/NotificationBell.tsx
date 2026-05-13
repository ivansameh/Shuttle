import { useState, useRef, useEffect } from 'react';
import { Bell, Info, BellRing } from 'lucide-react';
import { Notification } from '../store/useNotificationStore';

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
}

export default function NotificationBell({ notifications, unreadCount, markAsRead }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden transform origin-bottom-left transition-all text-slate-800">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <BellRing className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-slate-50 cursor-pointer flex gap-3 ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'PROMO' ? 'bg-purple-100 text-purple-600' :
                        notification.type === 'TRIP_UPDATE' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notification.type === 'PROMO' ? <Bell className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm tracking-tight ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug break-words">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0 self-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-100 text-center bg-slate-50">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
