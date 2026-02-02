import { z } from 'zod';

export const AIMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(['user', 'assistant']),
  text: z.string(),
  timestamp: z.string().datetime(),
  sources: z.array(z.string()).optional(),
});
export type AIMessage = z.infer<typeof AIMessageSchema>;

export const AIConversationProductSchema = z.object({
  scannedName: z.string(),
  scannedBrand: z.string(),
  molydalName: z.string(),
  molydalReference: z.string(),
});
export type AIConversationProduct = z.infer<typeof AIConversationProductSchema>;

export const AIConversationSchema = z.object({
  id: z.string(),
  scanId: z.string(),
  product: AIConversationProductSchema,
  messages: z.array(AIMessageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AIConversation = z.infer<typeof AIConversationSchema>;
