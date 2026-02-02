import { MOCK_NOTIFICATIONS } from '@/mocks/notifications.mock';
import type { AppNotification } from '@/schemas/notification.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const notificationService = {
  async getAll(): Promise<AppNotification[]> {
    await delay(200);
    return MOCK_NOTIFICATIONS;
  },

  async markAsRead(id: string): Promise<void> {
    await delay(100);
  },

  async markAllAsRead(): Promise<void> {
    await delay(100);
  },
};
