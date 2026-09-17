import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { VoiceNotesController } from '../voice-notes/voice-notes.controller';
import { VoiceNotesService } from '../voice-notes/voice-notes.service';
import { FeaturesModule } from './features.module';
import { FeaturesService } from './features.service';

// An in-memory API exercises the real JWT guards, headers, controller routing
// and production response filter. No database, CRM, Docker or device is used.
describe('Authenticated feature discovery and CRM editing gate', () => {
  const secret = 'isolated-feature-http-test-secret';
  const jwt = new JwtService({ secret });
  const token = jwt.sign({ sub: 'user', email: 'feature-test@example.test', role: 'commercial' }, { expiresIn: '5m' });
  let app: INestApplication;
  let baseUrl: string;
  let featureValue: string | undefined;
  let row: any;
  const prisma = { voiceNote: { findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn() } };
  const crm = {
    canUpdateCommunication: jest.fn().mockReturnValue(true),
    validateCommunicationSelection: jest.fn(),
    communicationExists: jest.fn(),
    createCommunication: jest.fn(),
    updateCommunication: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' }), FeaturesModule],
      controllers: [VoiceNotesController],
      providers: [
        JwtStrategy,
        { provide: VoiceNotesService, inject: [FeaturesService], useFactory: (features: FeaturesService) =>
          new VoiceNotesService(prisma as any, {} as any, {} as any, crm as any, features) },
      ],
    }).overrideProvider(ConfigService).useValue({
      get: (key: string) => key === 'JWT_SECRET' ? secret : key === 'CRM_HISTORY_EDITING_ENABLED' ? featureValue : undefined,
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    featureValue = undefined;
    jest.clearAllMocks();
    row = {
      id: 'note', userId: 'user', revision: 1, duration: 60, companyId: 'company',
      crmCommunicationId: 'remote', crmSyncedRevision: 0, syncStatus: 'pending',
      crmSyncToken: null, crmSyncStartedAt: null, syncErrorCode: null,
      transcription: 'Preserve this note', notes: 'Existing edited content',
      createdAt: new Date('2026-09-17T08:00:00Z'), crmObjectiveCodes: [], crmObjectiveLabels: [],
    };
    prisma.voiceNote.findFirst.mockImplementation(async () => ({ ...row }));
  });

  afterAll(async () => { await app?.close(); });

  async function request(path: string, options: { method?: string; body?: unknown; bearer?: string | null } = {}) {
    const bearer = options.bearer === undefined ? token : options.bearer;
    const response = await fetch(`${baseUrl}/api${path}`, {
      method: options.method ?? 'GET',
      headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }

  it.each([null, 'invalid-token'])('requires a valid JWT before disclosing feature flags (%p)', async (bearer) => {
    expect((await request('/features', { bearer })).status).toBe(401);
  });

  it('rejects an expired JWT', async () => {
    const expired = jwt.sign({ sub: 'user', role: 'commercial' }, { expiresIn: -1 });
    expect((await request('/features', { bearer: expired })).status).toBe(401);
  });

  it('returns only the safe default feature flag and disables HTTP caching', async () => {
    const result = await request('/features');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: { crmHistoryEditingEnabled: false } });
    expect(result.headers.get('cache-control')).toBe('no-store');
  });

  it('lets the same authenticated client discover activation and deactivation from the server', async () => {
    featureValue = 'true';
    const active = await request('/features');
    expect(active.status).toBe(200);
    expect(active.body).toEqual({ data: { crmHistoryEditingEnabled: true } });
    expect(active.headers.get('cache-control')).toBe('no-store');
    featureValue = 'false';
    const disabled = await request('/features');
    expect(disabled.body).toEqual({ data: { crmHistoryEditingEnabled: false } });
    expect(disabled.headers.get('cache-control')).toBe('no-store');
  });

  it('returns the machine-readable 403 for PATCH through the production filter before accessing a note', async () => {
    const result = await request('/voice-notes/note', { method: 'PATCH', body: { expectedRevision: 1, notes: 'Do not save' } });
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ statusCode: 403, code: 'CRM_HISTORY_EDITING_DISABLED' });
    expect(prisma.voiceNote.findFirst).not.toHaveBeenCalled();
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
    expect(prisma.voiceNote.create).not.toHaveBeenCalled();
    expect(crm.validateCommunicationSelection).not.toHaveBeenCalled();
    expect(crm.createCommunication).not.toHaveBeenCalled();
    expect(crm.updateCommunication).not.toHaveBeenCalled();
  });

  it('rejects the legacy resync route for an edited revision without a database write or CRM request', async () => {
    const result = await request('/voice-notes/note/resync', { method: 'POST' });
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ statusCode: 403, code: 'CRM_HISTORY_EDITING_DISABLED' });
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
    expect(prisma.voiceNote.create).not.toHaveBeenCalled();
    expect(crm.communicationExists).not.toHaveBeenCalled();
    expect(crm.createCommunication).not.toHaveBeenCalled();
    expect(crm.updateCommunication).not.toHaveBeenCalled();
    expect(row.notes).toBe('Existing edited content');
  });

  it('keeps saved history readable while withholding and restoring editing availability', async () => {
    const disabled = await request('/voice-notes/note');
    expect(disabled.status).toBe(200);
    expect(disabled.body).toMatchObject({ data: { notes: 'Existing edited content', crmUpdateAvailable: false, revision: 1 } });
    featureValue = 'true';
    const enabled = await request('/voice-notes/note');
    expect(enabled.status).toBe(200);
    expect(enabled.body).toMatchObject({ data: { notes: 'Existing edited content', crmUpdateAvailable: true, revision: 1 } });
    expect(prisma.voiceNote.updateMany).not.toHaveBeenCalled();
    expect(crm.communicationExists).not.toHaveBeenCalled();
  });
});
