import { api } from '@/lib/axios';
import { API_CONFIG, ENDPOINTS } from '@/constants/api';
import { storage } from '@/lib/storage';
import { VoiceNoteSchema, type VoiceNote } from '@/schemas/voice-note.schema';

export interface VoiceNoteUpdate {
  expectedRevision: number;
  transcription?: string;
  clientName?: string;
  contactName?: string;
  contactId?: string | null;
  companyId?: string | null;
  meetingAt?: string | null;
  meetingEndAt?: string | null;
  crmActionCode?: string | null;
  crmObjectiveCodes?: string[];
  productMentioned?: string;
  nextAction?: string;
  notes?: string;
}

export function isVoiceNoteConflict(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 409;
}

export function voiceNoteSyncMessage(note: VoiceNote): string {
  if (note.syncStatus === 'synced') return 'voiceNote.sentBody';
  if (note.syncStatus === 'syncing') return 'voiceNote.syncInProgressBody';
  if (note.syncErrorCode === 'legacy_uncertain') return 'voiceNote.legacyUncertainBody';
  if (note.syncErrorCode === 'update_unavailable' && !note.crmUpdateAvailable) return 'voiceNote.updateUnavailableBody';
  if (note.syncErrorCode === 'remote_deleted' || note.syncStatus === 'deleted') return 'voiceNote.remoteDeletedBody';
  if (note.syncStatus === 'pending') return 'voiceNote.pendingBody';
  return 'voiceNote.resyncErrorBody';
}

export function isVoiceNoteUpdateUnavailable(note: VoiceNote): boolean {
  if (note.syncErrorCode === 'update_unavailable' && !note.crmUpdateAvailable) return true;
  // Older API responses only expose the remote ID. New responses distinguish
  // an ID reserved for a first attempt from a confirmed CRM synchronization.
  const wasSynced = note.crmSyncedRevision === undefined
    ? Boolean(note.crmCommunicationId) : note.crmSyncedRevision !== null;
  return wasSynced && !note.crmUpdateAvailable;
}

export function canSendVoiceNote(note: VoiceNote): boolean {
  return !isVoiceNoteUpdateUnavailable(note) && note.syncStatus !== 'syncing'
    && note.syncStatus !== 'deleted' && note.syncErrorCode !== 'legacy_uncertain';
}

export function canResyncVoiceNoteFromHistory(note: VoiceNote, editingEnabled = false): boolean {
  if (!canSendVoiceNote(note) || !['pending', 'failed'].includes(note.syncStatus)) return false;
  if (editingEnabled) return true;
  // A failed initial creation remains retryable without the paid editor.
  // A reserved remote ID is safe only when the API explicitly confirms that
  // no revision has ever been synchronized.
  const neverSynced = note.crmSyncedRevision === null
    || (note.crmSyncedRevision === undefined && !note.crmCommunicationId);
  return note.revision === 0 && neverSynced;
}

async function postMultipart<T>(path: string, data: FormData): Promise<T> {
  const token = await storage.getToken();

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_CONFIG.baseURL}${path}`);
    xhr.timeout = 180000;
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
    return VoiceNoteSchema.array().parse(response.data);
  },

  async getById(id: string): Promise<VoiceNote> {
    const response = await api.get(ENDPOINTS.voiceNotes.detail(id));
    return VoiceNoteSchema.parse(response.data);
  },

  async create(data: FormData): Promise<VoiceNote> {
    return VoiceNoteSchema.parse(await postMultipart<VoiceNote>(ENDPOINTS.voiceNotes.create, data));
  },

  async update(id: string, data: VoiceNoteUpdate): Promise<VoiceNote> {
    const response = await api.patch(ENDPOINTS.voiceNotes.detail(id), data);
    return VoiceNoteSchema.parse(response.data);
  },

  async resync(id: string, expectedRevision?: number): Promise<VoiceNote> {
    const response = await api.post(ENDPOINTS.voiceNotes.resync(id),
      expectedRevision === undefined ? undefined : { expectedRevision },
      { timeout: 180000 },
    );
    return VoiceNoteSchema.parse(response.data);
  },
};
