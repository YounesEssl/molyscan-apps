import { z } from 'zod';

export const VoiceNoteSchema = z.object({
  id: z.string(),
  duration: z.number(),
  transcription: z.string().nullable(),
  clientName: z.string(),
  contactId: z.string().nullable().optional(),
  contactName: z.string().optional(),
  meetingAt: z.string().datetime().nullable().optional(),
  productMentioned: z.string().optional(),
  nextAction: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.string().nullable().optional(),
  relatedScanId: z.string().optional(),
  syncStatus: z.string().optional(),
  crmCommunicationId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type VoiceNote = z.infer<typeof VoiceNoteSchema>;
