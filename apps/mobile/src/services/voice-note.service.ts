import { api } from '@/lib/axios';
import { API_CONFIG, ENDPOINTS } from '@/constants/api';
import { storage } from '@/lib/storage';
import type { VoiceNote } from '@/schemas/voice-note.schema';

async function postMultipart<T>(path: string, data: FormData): Promise<T> {
  const token = await storage.getToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_CONFIG.baseURL}${path}`);
    xhr.timeout = 60000;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve((body?.data ?? body) as T);
        } catch {
          reject(new Error('Failed to parse voice note response'));
        }
      } else {
        reject(new Error(`Voice note upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Voice note upload network error'));
    xhr.ontimeout = () => reject(new Error('Voice note upload timed out'));
    xhr.send(data);
  });
}

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
    return postMultipart<VoiceNote>(ENDPOINTS.voiceNotes.create, data);
  },

  async resync(id: string): Promise<VoiceNote> {
    const response = await api.post(ENDPOINTS.voiceNotes.resync(id));
    return response.data;
  },
};
