import { z } from 'zod';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';

// Includes audio upload and recognition of a multi-minute field report.
export const TRANSCRIPTION_TIMEOUT_MS = 180_000;
const TranscriptionResponse = z.object({ data: z.object({ transcription: z.string() }) });

/** Native XHR supplies the multipart boundary for React Native URI uploads. */
export async function transcribeAudio(uri: string): Promise<string> {
  const data = new FormData();
  data.append('audio', { uri, type: 'audio/m4a', name: 'note.m4a' } as unknown as Blob);
  const token = await storage.getToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_CONFIG.baseURL}/chat/transcribe`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = TRANSCRIPTION_TIMEOUT_MS;
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Transcription failed: HTTP ${xhr.status}`));
        return;
      }
      try {
        resolve(TranscriptionResponse.parse(JSON.parse(xhr.responseText)).data.transcription.trim());
      } catch {
        reject(new Error('Invalid transcription response'));
      }
    };
    xhr.onerror = () => reject(new Error('Transcription network error'));
    xhr.ontimeout = () => reject(new Error('Transcription timed out'));
    xhr.onabort = () => reject(new Error('Transcription cancelled'));
    xhr.send(data);
  });
}
