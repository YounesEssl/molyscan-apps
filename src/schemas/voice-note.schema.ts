import { z } from 'zod';

export const VoiceNoteSchema = z.object({
  id: z.string(),
  duration: z.number(),
  transcription: z.string().nullable(),
  clientName: z.string(),
  relatedScanId: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type VoiceNote = z.infer<typeof VoiceNoteSchema>;
