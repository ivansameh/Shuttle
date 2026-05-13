import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'SYSTEM' | 'TRIP_UPDATE' | 'PROMO';
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  latestNotification: Notification | null;
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  setLatestNotification: (notification: Notification | null) => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  latestNotification: null,
  unreadCount: 0,
  setNotifications: (notifications) => set({ 
    notifications, 
    unreadCount: notifications.filter(n => !n.isRead).length 
  }),
  addNotification: (notification) => set((state) => {
    const newNotifications = [notification, ...state.notifications];
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.isRead).length
    };
  }),
  setLatestNotification: (notification) => set({ latestNotification: notification }),
  markAsRead: (id) => set((state) => {
    const newNotifications = state.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    return {
      notifications: newNotifications,
      unreadCount: newNotifications.filter(n => !n.isRead).length
    };
  }),
}));
