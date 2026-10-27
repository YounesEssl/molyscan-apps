jest.mock('@/i18n', () => ({ __esModule: true, default: { language: 'fr', resolvedLanguage: 'fr' }, loadStoredLanguage: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/stores/outbox.store', () => ({ useOutboxStore: { getState: () => ({ refreshCounts: async () => {} }) } }));
jest.mock('./repository', () => ({ enqueue: jest.fn().mockResolvedValue(undefined), removeByKind: jest.fn() }));
jest.mock('./imageStore', () => ({ saveImage: jest.fn().mockResolvedValue('photo'), readImageBase64: jest.fn().mockResolvedValue('AA=='), deleteImage: jest.fn() }));
jest.mock('./connectivity', () => ({ triggerSync: jest.fn() }));
jest.mock('@/lib/axios', () => ({ api: { post: jest.fn().mockResolvedValue({ data: {} }) } }));
import i18n from '@/i18n';
import { enqueueScanAnalysis } from './enqueue';
import { enqueue } from './repository';
import { scanAnalysisHandler } from './handlers/scanAnalysis.handler';
import { api } from '@/lib/axios';
import type { OutboxRow } from './types';

describe('Queued scans keep the language of capture', () => {
  beforeEach(() => jest.clearAllMocks());
  it('records French with the queued scan', async () => {
    await enqueueScanAnalysis({ base64: 'AA==', mimeType: 'image/jpeg' });
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ language: 'fr' }) }));
  });
  it('sends the captured language even after the app language changes', async () => {
    i18n.language = 'en';
    const row = { id: 'scan-1', imagePath: 'photo', mimeType: 'image/jpeg', payload: JSON.stringify({ aiConsentRecorded: true, language: 'fr' }) } as OutboxRow;
    await scanAnalysisHandler.send(row);
    expect(api.post).toHaveBeenCalledWith('/scans/analyze-image', expect.objectContaining({ language: 'fr' }), expect.anything());
  });
  it('uses the current preference for legacy queued scans without a language', async () => {
    i18n.resolvedLanguage = 'en';
    const row = { id: 'scan-1', imagePath: 'photo', payload: JSON.stringify({ aiConsentRecorded: true }) } as OutboxRow;
    await scanAnalysisHandler.send(row);
    expect(api.post).toHaveBeenCalledWith('/scans/analyze-image', expect.objectContaining({ language: 'en' }), expect.anything());
  });
});
