import { BadRequestException } from '@nestjs/common';
import { VoiceNotesService } from './voice-notes.service';

describe('New CRM voice notes', () => {
  let service: VoiceNotesService;
  let prisma: any;
  let crm: any;
  let transcription: any;
  const start = '2026-09-16T08:30:00.000Z';
  const end = '2026-09-16T09:00:00.000Z';
  let row: any;

  beforeEach(() => {
    row = { id: 'note', userId: 'user', duration: 95, createdAt: new Date(start),
      meetingAt: new Date(start), meetingEndAt: new Date(end), revision: 0,
      crmSyncedRevision: null, crmCommunicationId: null, crmSyncToken: null,
      crmSyncStartedAt: null, syncErrorCode: null, syncStatus: 'pending',
      companyId: null, contactId: null, contactName: null,
      crmActionCode: null, crmObjectiveCode: null, transcription: 'Original' };
    prisma = { voiceNote: {
      create: jest.fn().mockImplementation(async ({ data }) => (row = { ...row, ...data })),
      findFirst: jest.fn().mockImplementation(async () => ({ ...row })),
      findUniqueOrThrow: jest.fn().mockImplementation(async () => ({ ...row })),
      updateMany: jest.fn().mockImplementation(async ({ data }) => {
        const revision = data.revision?.increment ? row.revision + data.revision.increment : row.revision;
        row = { ...row, ...data, revision };
        return { count: 1 };
      }),
    } };
    crm = {
      canUpdateCommunication: jest.fn().mockReturnValue(true),
      validateCommunicationSelection: jest.fn().mockImplementation(async (_user, action, objectives = []) => ({
        ...(action ? { crmActionCode: action, crmActionLabel: 'Visite' } : {}),
        crmObjectiveCodes: objectives, crmObjectiveLabels: objectives.map((code: string) => `Objectif ${code}`),
      })),
      createCommunication: jest.fn().mockResolvedValue({ id: 'remote' }),
      formatDateTime: jest.fn().mockReturnValue('2026-09-16 10:30:00'),
    };
    transcription = { transcribe: jest.fn().mockResolvedValue('server transcript') };
    service = new VoiceNotesService(prisma, { upload: jest.fn() } as any, transcription, crm);
  });

  it('persists the end and validated labels, then forwards dates and codes to CRM', async () => {
    const result = await service.create('user', {
      duration: 95, transcription: 'Visite terminée', meetingAt: start, meetingEndAt: end, companyId: 'company', crmActionCode: 'visit',
    });
    expect(prisma.voiceNote.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      meetingAt: new Date(start), meetingEndAt: new Date(end), crmActionCode: 'visit', crmActionLabel: 'Visite',
    }) });
    expect(crm.createCommunication).toHaveBeenCalledWith('user', expect.objectContaining({
      datetime: new Date(start), endDatetime: new Date(end), actionCode: 'visit', note: expect.stringContaining('Action : Visite'),
    }), expect.any(String));
    expect(result.meetingEndAt).toBe(end);
  });

  it('rejects an invalid appointment before persisting or transcribing anything', async () => {
    await expect(service.create('user', { duration: 60, meetingEndAt: end })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voiceNote.create).not.toHaveBeenCalled();
    expect(transcription.transcribe).not.toHaveBeenCalled();
  });

  it('keeps manually entered content after failed recognition without re-running Whisper during save', async () => {
    await service.create('user', { duration: 95, transcription: '', notes: 'Compte rendu saisi' },
      { originalname: 'note.m4a', buffer: Buffer.alloc(2000), mimetype: 'audio/m4a' } as any);
    expect(transcription.transcribe).not.toHaveBeenCalled();
    expect(prisma.voiceNote.create).toHaveBeenCalledWith({ data: expect.objectContaining({ notes: 'Compte rendu saisi' }) });
  });

  it('keeps the voice note when CRM is unreachable so the existing retry flow can send it', async () => {
    crm.createCommunication.mockRejectedValue(new Error('offline'));
    const result = await service.create('user', { duration: 60, transcription: 'Note conservée', companyId: 'company' });
    expect(result.syncStatus).toBe('failed');
    expect(prisma.voiceNote.create).toHaveBeenCalledTimes(1);
  });

  it('saves an edited revision without changing its remote ID or sending it', async () => {
    Object.assign(row, { crmCommunicationId: 'remote', crmSyncedRevision: 0, syncStatus: 'synced' });
    const result = await service.update('note', 'user', { expectedRevision: 0, notes: 'Corrected' });
    expect(result).toMatchObject({ revision: 1, syncStatus: 'pending', crmCommunicationId: 'remote', notes: 'Corrected', transcription: 'Original' });
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it('rejects another user and stale revisions before any write', async () => {
    prisma.voiceNote.findFirst.mockResolvedValueOnce(null);
    await expect(service.update('note', 'other', { expectedRevision: 0, notes: 'No' })).rejects.toMatchObject({ status: 404 });
    expect(prisma.voiceNote.findFirst).toHaveBeenCalledWith({ where: { id: 'note', userId: 'other', syncStatus: { not: 'deleted' } } });
    await expect(service.update('note', 'user', { expectedRevision: 3, notes: 'No' })).rejects.toMatchObject({ status: 409 });
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
  });

  it('validates merged dates and prevents changing an existing CRM attachment', async () => {
    row.crmCommunicationId = 'remote';
    await expect(service.update('note', 'user', { expectedRevision: 0, meetingAt: '2026-09-16T10:00:00Z' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('note', 'user', { expectedRevision: 0, companyId: 'different' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
  });

  it('keeps legacy uncertainty after an edit and never creates another communication', async () => {
    Object.assign(row, { syncStatus: 'failed', syncErrorCode: 'legacy_uncertain', companyId: 'company' });
    const saved = await service.update('note', 'user', { expectedRevision: 0, notes: 'Corrected' });
    expect(saved.syncErrorCode).toBe('legacy_uncertain');
    const retried = await service.resync('note', 'user', 1);
    expect(retried.syncStatus).not.toBe('synced');
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it('clears an objective without erasing the unchanged action', async () => {
    Object.assign(row, { crmActionCode: 'visit', crmActionLabel: 'Visite', crmObjectiveCode: 'sale', crmObjectiveLabel: 'Vente' });
    const saved = await service.update('note', 'user', { expectedRevision: 0, crmObjectiveCode: '' });
    expect(saved).toMatchObject({ crmActionCode: 'visit', crmActionLabel: 'Visite', crmObjectiveCode: null, crmObjectiveLabel: null });
  });

  it('exposes an interrupted worker as retryable after its lease expires', async () => {
    Object.assign(row, { syncStatus: 'syncing', crmSyncToken: 'old', crmSyncStartedAt: new Date(Date.now() - 360_000) });
    expect(await service.findById('note', 'user')).toMatchObject({ syncStatus: 'failed', syncErrorCode: 'crm_unavailable' });
  });

  it('reports an unavailable update without replacing it with a new creation', async () => {
    Object.assign(row, { companyId: 'company', crmCommunicationId: 'remote', crmSyncedRevision: 0 });
    crm.communicationExists = jest.fn().mockResolvedValue(true);
    crm.updateCommunication = jest.fn().mockRejectedValue({ syncErrorCode: 'update_unavailable' });
    expect(await service.resync('note', 'user', 0)).toMatchObject({ syncStatus: 'failed', syncErrorCode: 'update_unavailable', crmCommunicationId: 'remote' });
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it.each([null, false])('does not recreate a previously confirmed communication on lookup %s', async (exists) => {
    Object.assign(row, { companyId: 'company', crmCommunicationId: 'remote', crmSyncedRevision: 0 });
    crm.communicationExists = jest.fn().mockResolvedValue(exists);
    expect(await service.resync('note', 'user', 0)).toMatchObject({ syncStatus: 'failed', syncErrorCode: exists === null ? 'crm_unavailable' : 'remote_deleted' });
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it('persists and sends every selected objective with CRM labels', async () => {
    const result = await service.create('user', { duration: 60, companyId: 'company', crmObjectiveCodes: ['one', 'two', 'one'] });
    expect(result).toMatchObject({ crmObjectiveCodes: ['one', 'two'], crmObjectiveLabels: ['Objectif one', 'Objectif two'] });
    expect(crm.createCommunication).toHaveBeenCalledWith('user', expect.objectContaining({
      objectiveCodes: ['one', 'two'], note: expect.stringContaining('Objectifs : Objectif one, Objectif two'),
    }), expect.any(String));
  });

  it('updates the same communication with all objectives, then clears them without resurrecting the legacy value', async () => {
    Object.assign(row, { companyId: 'company', crmCommunicationId: 'remote', crmSyncedRevision: 0,
      crmObjectiveCodes: ['old'], crmObjectiveLabels: ['Ancien'], crmObjectiveCode: 'old', crmObjectiveLabel: 'Ancien' });
    crm.communicationExists = jest.fn().mockResolvedValue(true);
    crm.updateCommunication = jest.fn().mockResolvedValue({ id: 'remote' });
    await service.update('note', 'user', { expectedRevision: 0, crmObjectiveCodes: ['one', 'two'] });
    expect((await service.resync('note', 'user', 1)).syncStatus).toBe('synced');
    expect(crm.updateCommunication).toHaveBeenLastCalledWith('user', 'remote', expect.objectContaining({ objectiveCodes: ['one', 'two'] }));
    const cleared = await service.update('note', 'user', { expectedRevision: 1, crmObjectiveCodes: [] });
    expect(cleared).toMatchObject({ crmObjectiveCodes: [], crmObjectiveLabels: [], crmObjectiveCode: null, crmObjectiveLabel: null });
    await service.resync('note', 'user', 2);
    expect(crm.updateCommunication).toHaveBeenLastCalledWith('user', 'remote', expect.objectContaining({ objectiveCodes: [] }));
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it('preserves an unchanged objective selection even when its order changes', async () => {
    Object.assign(row, { crmObjectiveCodes: ['one', 'two'], crmObjectiveLabels: ['Un', 'Deux'] });
    expect((await service.update('note', 'user', { expectedRevision: 0, crmObjectiveCodes: ['two', 'one'] })).revision).toBe(0);
    expect(crm.validateCommunicationSelection).not.toHaveBeenCalled();
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
  });
});
