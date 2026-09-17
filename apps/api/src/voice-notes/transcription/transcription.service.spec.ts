import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import OpenAI, { toFile } from 'openai';
import { TranscriptionService } from './transcription.service';

const mockTranscribe = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ audio: { transcriptions: { create: mockTranscribe } } })),
  toFile: jest.fn().mockImplementation(async (bytes) => ({ bytes })),
}));

describe('Whisper transcription failures and complete audio', () => {
  let service: TranscriptionService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new TranscriptionService(new ConfigService({ OPENAI_API_KEY: 'test' }));
  });

  it('sends the entire file and preserves text from the end of the recording', async () => {
    const audio = Buffer.alloc(2 * 1024 * 1024);
    mockTranscribe.mockResolvedValue({ text: 'Visite client. Dernière information en fin de note.' });
    await expect(service.transcribe(audio, 'long-note.m4a')).resolves.toBe('Visite client. Dernière information en fin de note.');
    expect(toFile).toHaveBeenCalledWith(audio, 'audio.m4a', { type: 'audio/mp4' });
    expect(OpenAI).toHaveBeenCalledWith(expect.objectContaining({ timeout: 120_000, maxRetries: 0 }));
  });

  it('reports an upstream failure so the mobile can offer a retry', async () => {
    mockTranscribe.mockRejectedValue(new Error('upstream timeout'));
    await expect(service.transcribe(Buffer.alloc(2048))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps silent-audio artifacts out of the CRM report', async () => {
    mockTranscribe.mockResolvedValue({ text: 'Sous-titres par amara.org' });
    await expect(service.transcribe(Buffer.alloc(2048))).resolves.toBeNull();
  });
});
