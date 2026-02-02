import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { AppNotification } from '@/schemas/notification.schema';

export const notificationService = {
  async getAll(): Promise<AppNotification[]> {
    const response = await api.get(ENDPOINTS.notifications.list);
    // Paginated endpoint returns { data, meta } — extract data
    return response.data.data ?? response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.post(ENDPOINTS.notifications.markRead(id));
  },

  async markAllAsRead(): Promise<void> {
    await api.post(ENDPOINTS.notifications.markAllRead);
  },

  async registerPushToken(token: string): Promise<void> {
    await api.post('/notifications/push-token', { token });
  },
};
