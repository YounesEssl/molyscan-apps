import { create } from 'zustand';
import type { AppNotification } from '@/schemas/notification.schema';
import { MOCK_NOTIFICATIONS } from '@/mocks/notifications.mock';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length };
    }),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
