import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { FeaturesService } from '../features/features.service';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceNotesService } from './voice-notes.service';

// Explicit opt-in only: never use the application's DATABASE_URL for fixtures.
const databaseUrl = process.env.VOICE_NOTES_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('Voice note editing and synchronization with PostgreSQL', () => {
  const prisma = new PrismaService({ datasources: { db: { url: databaseUrl ?? 'postgresql://unused' } } });
  const userId = randomUUID();
  let crm: any;
  let service: VoiceNotesService;

  beforeAll(async () => {
    await prisma.user.create({ data: {
      id: userId, email: `voice-note-qa-${userId}@example.test`, passwordHash: 'test-only',
      firstName: 'QA', lastName: 'CRM', role: 'admin', status: 'approved',
    } });
  });
  beforeEach(() => {
    // Remote updates are simulated: these tests exercise PostgreSQL concurrency,
    // without writing test communications in the production CRM.
    crm = {
      canUpdateCommunication: jest.fn().mockReturnValue(true),
      validateCommunicationSelection: jest.fn().mockResolvedValue({}),
      formatDateTime: jest.fn((date: Date) => date.toISOString()),
      communicationExists: jest.fn().mockResolvedValue(true),
      createCommunication: jest.fn(async (_user, _record, id) => ({ id })),
      updateCommunication: jest.fn(async (_user, id) => ({ id })),
    };
    const features = new FeaturesService({ get: () => 'true' } as unknown as ConfigService);
    service = new VoiceNotesService(prisma, {} as any, {} as any, crm, features);
  });
  afterAll(async () => {
    try {
      await prisma.voiceNote.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally { await prisma.$disconnect(); }
  });

  const makeNote = () => prisma.voiceNote.create({ data: {
    userId, duration: 60, companyId: randomUUID(), transcription: 'Original',
  } });

  it('accepts exactly one of two concurrent edits of the same revision', async () => {
    const note = await makeNote();
    const results = await Promise.allSettled([
      service.update(note.id, userId, { expectedRevision: 0, transcription: 'Version A' }),
      service.update(note.id, userId, { expectedRevision: 0, transcription: 'Version B' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);
    const saved = await prisma.voiceNote.findUniqueOrThrow({ where: { id: note.id } });
    expect(saved.revision).toBe(1);
    expect(['Version A', 'Version B']).toContain(saved.transcription);
    expect(crm.createCommunication).not.toHaveBeenCalled();
  });

  it('reserves the GUID before sending and excludes parallel sends and edits', async () => {
    const note = await makeNote();
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    crm.createCommunication.mockImplementation(async (_user: string, _record: unknown, id: string) => {
      entered();
      await gate;
      return { id };
    });
    const sending = service.resync(note.id, userId, 0);
    try {
      await started;
      const reserved = await prisma.voiceNote.findUniqueOrThrow({ where: { id: note.id } });
      expect(reserved.crmCommunicationId).toBe(crm.createCommunication.mock.calls[0][2]);
      expect(reserved.syncStatus).toBe('syncing');
      await expect(service.resync(note.id, userId, 0)).rejects.toMatchObject({ status: 409 });
      await expect(service.update(note.id, userId, { expectedRevision: 0, notes: 'Concurrent' })).rejects.toMatchObject({ status: 409 });
      expect(crm.createCommunication).toHaveBeenCalledTimes(1);
    } finally { release(); }
    expect((await sending).syncStatus).toBe('synced');
  });

  it('reconciles a lost creation response using the same GUID, without a second creation', async () => {
    const note = await makeNote();
    crm.createCommunication.mockRejectedValueOnce(new Error('Response lost after remote creation'));
    const failed = await service.resync(note.id, userId, 0);
    expect(failed.syncStatus).toBe('failed');
    expect(failed.crmCommunicationId).toBeTruthy();
    const retried = await service.resync(note.id, userId, 0);
    expect(retried.syncStatus).toBe('synced');
    expect(retried.crmCommunicationId).toBe(failed.crmCommunicationId);
    expect(crm.createCommunication).toHaveBeenCalledTimes(1);
    expect(crm.updateCommunication).toHaveBeenCalledWith(userId, failed.crmCommunicationId, expect.objectContaining({ note: 'Original' }));
  });
});
