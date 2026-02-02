import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'scan_match',
  'price_approved',
  'price_rejected',
  'ai_response',
  'workflow_update',
  'system',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const AppNotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string(),
  read: z.boolean().default(false),
  relatedId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type AppNotification = z.infer<typeof AppNotificationSchema>;
