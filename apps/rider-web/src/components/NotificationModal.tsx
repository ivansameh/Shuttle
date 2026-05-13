import React from 'react';
import { X, Bell, Info, Megaphone } from 'lucide-react';
import { Notification } from '../hooks/useNotifications';

interface NotificationModalProps {
  notification: Notification | null;
  onClose: () => void;
}

export default function NotificationModal({ notification, onClose }: NotificationModalProps) {
  if (!notification) return null;

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'PROMO':
        return {
          icon: <Megaphone className="w-6 h-6 text-purple-400" />,
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
          accentColor: 'bg-purple-500'
        };
      case 'TRIP_UPDATE':
        return {
          icon: <Info className="w-6 h-6 text-orange-400" />,
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          accentColor: 'bg-orange-500'
        };
      default:
        return {
          icon: <Bell className="w-6 h-6 text-primary-400" />,
          bgColor: 'bg-primary-500/10',
          borderColor: 'border-primary-500/30',
          accentColor: 'bg-primary-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Window */}
      <div className="relative w-full max-w-md bg-surface border border-border shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Top Accent Bar */}
        <div className={`h-2 w-full ${styles.accentColor}`} />
        
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-2xl ${styles.bgColor} border ${styles.borderColor}`}>
              {styles.icon}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-muted hover:text-foreground hover:bg-white/5 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-2xl font-black text-foreground mb-3 leading-tight uppercase tracking-tight">
            {notification.title}
          </h2>
          
          <p className="text-muted leading-relaxed mb-8 text-lg font-medium opacity-90">
            {notification.body}
          </p>
          
          <button
            onClick={onClose}
            className={`w-full py-4 text-white font-black rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${styles.accentColor} shadow-${styles.accentColor.split('-')[1]}-500/30`}
          >
            DISMISS MESSAGE
          </button>
        </div>
      </div>
    </div>
  );
}
