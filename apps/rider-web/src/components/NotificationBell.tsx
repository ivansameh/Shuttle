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
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-input-bg border border-border flex items-center justify-center text-muted hover:text-foreground transition-all duration-200 relative"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 sm:right-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 md:left-auto md:right-0 mt-2 w-72 sm:w-80 bg-surface rounded-xl shadow-xl border border-border z-50 overflow-hidden transform origin-top-right transition-all text-foreground">
          <div className="p-4 border-b border-border bg-background flex justify-between items-center">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-bold tracking-wide">
                {unreadCount} NEW
              </span>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted flex flex-col items-center">
                <BellRing className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-4 transition-colors hover:bg-white/5 cursor-pointer flex gap-3 ${
                      !notification.isRead ? 'bg-primary-500/10' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id);
                    }}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'PROMO' ? 'bg-purple-500/20 text-purple-400' :
                        notification.type === 'TRIP_UPDATE' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {notification.type === 'PROMO' ? <Bell className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm tracking-tight ${!notification.isRead ? 'font-bold' : 'font-medium opacity-80'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5 leading-snug break-words">
                        {notification.body}
                      </p>
                      <p className="text-[10px] opacity-40 mt-2 font-medium">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0 self-center">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border text-center bg-background">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary-400 hover:text-primary-300"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
