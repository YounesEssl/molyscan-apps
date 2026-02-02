import { MOCK_VOICE_NOTES } from '@/mocks/voice-notes.mock';
import type { VoiceNote } from '@/schemas/voice-note.schema';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const voiceNoteService = {
  async getAll(): Promise<VoiceNote[]> {
    await delay(300);
    return MOCK_VOICE_NOTES;
  },

  async getById(id: string): Promise<VoiceNote | undefined> {
    await delay(200);
    return MOCK_VOICE_NOTES.find((v) => v.id === id);
  },

  async create(data: Partial<VoiceNote>): Promise<VoiceNote> {
    await delay(500);
    return {
      id: `vn-${Date.now()}`,
      duration: data.duration ?? 0,
      transcription: data.transcription ?? null,
      clientName: data.clientName ?? '',
      relatedScanId: data.relatedScanId,
      tags: data.tags ?? [],
      createdAt: new Date().toISOString(),
    };
  },
};
