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
          icon: <Megaphone className="w-6 h-6 text-purple-600" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-100',
          accentColor: 'bg-purple-600'
        };
      case 'TRIP_UPDATE':
        return {
          icon: <Info className="w-6 h-6 text-orange-600" />,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-100',
          accentColor: 'bg-orange-600'
        };
      default:
        return {
          icon: <Bell className="w-6 h-6 text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          accentColor: 'bg-blue-600'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose}
      />
      
      {/* Modal Window */}
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-[2rem] overflow-hidden border-2 border-primary-500">
        {/* Top Accent Bar */}
        <div className={`h-2.5 w-full ${styles.accentColor}`} />
        
        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div className={`p-4 rounded-3xl ${styles.bgColor} border ${styles.borderColor}`}>
              {styles.icon}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
            {notification.title}
          </h2>
          
          <p className="text-slate-600 leading-relaxed mb-10 text-lg">
            {notification.body}
          </p>
          
          <button
            onClick={onClose}
            className={`w-full py-5 text-white font-bold text-lg rounded-[1.5rem] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${styles.accentColor} shadow-${styles.accentColor.split('-')[1]}-500/30`}
          >
            Acknowledge Message
          </button>
        </div>
      </div>
    </div>
  );
}
