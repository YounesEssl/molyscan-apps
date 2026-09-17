jest.mock('@/lib/axios', () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn() } }), { virtual: true });
jest.mock('@/constants/api', () => ({
  API_CONFIG: { baseURL: 'https://api.example.test' },
  ENDPOINTS: { voiceNotes: { list: '/voice-notes', create: '/voice-notes',
    detail: (id: string) => `/voice-notes/${id}`, resync: (id: string) => `/voice-notes/${id}/resync` } },
}), { virtual: true });
jest.mock('@/lib/storage', () => ({ storage: { getToken: jest.fn() } }), { virtual: true });
jest.mock('@/schemas/voice-note.schema', () => require('../schemas/voice-note.schema'), { virtual: true });

import { api } from '@/lib/axios';
import { VoiceNoteSchema } from '../schemas/voice-note.schema';
import { canSendVoiceNote, isVoiceNoteConflict, isVoiceNoteUpdateUnavailable, voiceNoteService, voiceNoteSyncMessage } from './voice-note.service';

const rawNote = { id: 'note-1', duration: 90, transcription: 'Compte rendu', clientName: 'Client', createdAt: '2026-09-17T08:00:00.000Z' };
const parsed = (overrides: Record<string, unknown> = {}) => VoiceNoteSchema.parse({ ...rawNote, ...overrides });

describe('CRM note edits and resend transport', () => {
  beforeEach(() => jest.resetAllMocks());

  it('accepts old notes with revision zero and defaults CRM update capability to unavailable', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: rawNote });
    const note = await voiceNoteService.getById('note-1');
    expect(note.revision).toBe(0);
    expect(note.crmUpdateAvailable).toBe(false);
    expect(api.get).toHaveBeenCalledWith('/voice-notes/note-1');
  });

  it('saves only changed fields and the read revision without uploading or retranscribing audio', async () => {
    (api.patch as jest.Mock).mockResolvedValue({ data: { ...rawNote, revision: 5, notes: 'Corrigé', syncStatus: 'pending' } });
    const update = { notes: 'Corrigé', contactId: null, expectedRevision: 4 };
    const note = await voiceNoteService.update('note-1', update);
    expect(api.patch).toHaveBeenCalledWith('/voice-notes/note-1', update);
    expect(note.revision).toBe(5);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('sends expectedRevision and permits a slow CRM request without turning a failed result into success', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { ...rawNote, revision: 5, syncStatus: 'failed', syncErrorCode: 'crm_unavailable' } });
    const result = await voiceNoteService.resync('note-1', 5);
    expect(api.post).toHaveBeenCalledWith('/voice-notes/note-1/resync', { expectedRevision: 5 }, { timeout: 180000 });
    expect(result.syncStatus).toBe('failed');
    expect(voiceNoteSyncMessage(result)).toBe('voiceNote.resyncErrorBody');
  });

  it('preserves conflicts so the editor can reload while retaining its draft', async () => {
    const conflict = { response: { status: 409 } };
    (api.patch as jest.Mock).mockRejectedValue(conflict);
    await expect(voiceNoteService.update('note-1', { notes: 'Saisie', expectedRevision: 2 })).rejects.toBe(conflict);
    expect(isVoiceNoteConflict(conflict)).toBe(true);
    expect(isVoiceNoteConflict({ response: { status: 500 } })).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('propagates read failures rather than presenting a missing note as an empty form', async () => {
    const error = new Error('offline');
    (api.get as jest.Mock).mockRejectedValue(error);
    await expect(voiceNoteService.getById('note-1')).rejects.toBe(error);
    await expect(voiceNoteService.getAll()).rejects.toBe(error);
  });

  it.each(['deleted', 'syncing', 'pending', 'synced', 'failed'])('accepts the %s synchronization state', (syncStatus) => {
    expect(parsed({ syncStatus }).syncStatus).toBe(syncStatus);
  });

  it('blocks updates of previously synced notes until the remote update contract is available', () => {
    const note = parsed({ crmCommunicationId: 'remote-1', crmSyncedRevision: 3, revision: 4, syncStatus: 'pending' });
    expect(isVoiceNoteUpdateUnavailable(note)).toBe(true);
    expect(canSendVoiceNote(note)).toBe(false);
    expect(canSendVoiceNote({ ...note, crmUpdateAvailable: true })).toBe(true);
  });

  it('uses a remote ID conservatively for old responses but permits first-attempt retries with an explicit null synced revision', () => {
    const old = parsed({ crmCommunicationId: 'remote-1', syncStatus: 'failed' });
    expect(canSendVoiceNote(old)).toBe(false);
    const firstAttempt = parsed({ crmCommunicationId: 'reserved-1', crmSyncedRevision: null, syncStatus: 'failed' });
    expect(canSendVoiceNote(firstAttempt)).toBe(true);
  });

  it.each([
    ['deleted', 'remote_deleted', 'voiceNote.remoteDeletedBody'],
    ['failed', 'legacy_uncertain', 'voiceNote.legacyUncertainBody'],
    ['syncing', null, 'voiceNote.syncInProgressBody'],
  ])('blocks unsafe resend for %s and explains the reason', (syncStatus, syncErrorCode, key) => {
    const note = parsed({ syncStatus, syncErrorCode });
    expect(canSendVoiceNote(note)).toBe(false);
    expect(voiceNoteSyncMessage(note)).toBe(key);
  });

  it('explains unavailable updates without claiming a successful sync', () => {
    const note = parsed({ syncStatus: 'failed', syncErrorCode: 'update_unavailable', crmSyncedRevision: null });
    expect(voiceNoteSyncMessage(note))
      .toBe('voiceNote.updateUnavailableBody');
    expect(canSendVoiceNote(note)).toBe(false);
    expect(canSendVoiceNote({ ...note, crmUpdateAvailable: true })).toBe(true);
    expect(voiceNoteSyncMessage({ ...note, crmUpdateAvailable: true })).toBe('voiceNote.resyncErrorBody');
  });

  it.each([{ codes: ['visit', 'sample'] }, { codes: [] }])('sends objective arrays, including explicit clearing, in JSON edits: $codes', async ({ codes }) => {
    (api.patch as jest.Mock).mockResolvedValue({ data: { ...rawNote, crmObjectiveCodes: codes, crmObjectiveLabels: codes, revision: 1 } });
    const updated = await voiceNoteService.update('note-1', { expectedRevision: 0, crmObjectiveCodes: codes });
    expect(api.patch).toHaveBeenCalledWith('/voice-notes/note-1', { expectedRevision: 0, crmObjectiveCodes: codes });
    expect(updated.crmObjectiveCodes).toEqual(codes);
    expect(updated.crmObjectiveLabels).toEqual(codes);
  });
});
