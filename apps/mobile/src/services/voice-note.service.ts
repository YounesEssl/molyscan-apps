import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import type { VoiceNote } from '@/schemas/voice-note.schema';

export const voiceNoteService = {
  async getAll(): Promise<VoiceNote[]> {
    const response = await api.get(ENDPOINTS.voiceNotes.list);
    return response.data;
  },

  async getById(id: string): Promise<VoiceNote | undefined> {
    const response = await api.get(ENDPOINTS.voiceNotes.detail(id));
    return response.data;
  },

  async create(data: FormData): Promise<VoiceNote> {
    const response = await api.post(ENDPOINTS.voiceNotes.create, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
