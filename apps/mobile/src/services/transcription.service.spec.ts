jest.mock('@/constants/api', () => ({ API_CONFIG: { baseURL: 'https://api.example.test' } }), { virtual: true });
jest.mock('@/lib/storage', () => ({ storage: { getToken: jest.fn().mockResolvedValue('token') } }), { virtual: true });

import { transcribeAudio } from './transcription.service';

describe('Voice transcription transport', () => {
  let xhr: any;
  const OriginalXHR = global.XMLHttpRequest;
  const OriginalFormData = global.FormData;

  beforeEach(() => {
    jest.useFakeTimers();
    global.FormData = class { append() {} } as any;
    xhr = { open: jest.fn(), setRequestHeader: jest.fn(), send: jest.fn() };
    global.XMLHttpRequest = jest.fn(() => xhr) as any;
  });
  afterEach(() => {
    jest.useRealTimers();
    global.XMLHttpRequest = OriginalXHR;
    global.FormData = OriginalFormData;
  });

  it('accepts a complete transcript arriving well after the old 30-second cutoff', async () => {
    const pending = transcribeAudio('file:///long-note.m4a');
    await Promise.resolve();
    expect(xhr.timeout).toBeGreaterThan(90_000);
    expect(xhr.open).toHaveBeenCalledWith('POST', 'https://api.example.test/chat/transcribe');
    await jest.advanceTimersByTimeAsync(65_000);
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ data: { transcription: 'Début du compte rendu. Fin après 90 secondes.' } });
    xhr.onload();
    await expect(pending).resolves.toBe('Début du compte rendu. Fin après 90 secondes.');
  });

  it('rejects provider errors rather than reporting an empty successful transcript', async () => {
    const pending = transcribeAudio('file:///note.m4a');
    await Promise.resolve();
    xhr.status = 503;
    xhr.onload();
    await expect(pending).rejects.toThrow('HTTP 503');
  });

  it('rejects malformed success responses', async () => {
    const pending = transcribeAudio('file:///note.m4a');
    await Promise.resolve();
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ data: {} });
    xhr.onload();
    await expect(pending).rejects.toThrow('Invalid transcription response');
  });
});
