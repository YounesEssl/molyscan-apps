import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

let mockAccess: string | null = null;
let mockRefresh: string | null = null;
const mockClearUser = jest.fn();
jest.mock('@/lib/storage', () => ({ storage: {
  getToken: jest.fn(async () => mockAccess),
  getRefreshToken: jest.fn(async () => mockRefresh),
  setToken: jest.fn(async (value: string) => { mockAccess = value; }),
  setRefreshToken: jest.fn(async (value: string) => { mockRefresh = value; }),
  clearTokens: jest.fn(async () => { mockAccess = null; mockRefresh = null; }),
} }));
jest.mock('@/stores/auth.store', () => ({ useAuthStore: { getState: () => ({ clearUser: mockClearUser }) } }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

import { api } from './axios';
import { clearSession, saveSession } from './session';

function rejectWith(status: number, config: InternalAxiosRequestConfig) {
  return Promise.reject(new AxiosError('rejected', undefined, config, {}, {
    status, statusText: 'rejected', data: {}, headers: {}, config,
  }));
}

describe('session renewal', () => {
  let post: jest.SpyInstance;
  beforeEach(async () => {
    await saveSession('expired', 'refresh-1');
    mockClearUser.mockClear();
    post = jest.spyOn(axios, 'post');
    api.defaults.adapter = async (config) => {
      if (config.headers.Authorization === 'Bearer expired') return rejectWith(401, config);
      return { status: 200, statusText: 'OK', data: { data: { ok: true } }, headers: {}, config };
    };
  });
  afterEach(() => post.mockRestore());

  it('renews once for simultaneous requests and retries all with the new token', async () => {
    post.mockResolvedValue({ data: { data: { accessToken: 'new-access' } } });
    const results = await Promise.all(Array.from({ length: 8 }, () => api.get('/auth/me')));
    expect(results.every((result) => result.data.ok)).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][2]).toEqual({ timeout: 10000 });
    expect(mockAccess).toBe('new-access');
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it.each([
    ['offline', new AxiosError('offline', 'ERR_NETWORK')],
    ['timeout', new AxiosError('timeout', 'ECONNABORTED')],
    ['server error', { response: { status: 503 } }],
    ['rate limit', { response: { status: 429 } }],
  ])('keeps credentials after a temporary %s and can recover on retry', async (_name, error) => {
    post.mockRejectedValueOnce(error).mockResolvedValueOnce({ data: { accessToken: 'recovered' } });
    await expect(api.get('/auth/me')).rejects.toBe(error);
    expect(mockAccess).toBe('expired');
    expect(mockRefresh).toBe('refresh-1');
    expect(mockClearUser).not.toHaveBeenCalled();
    await expect(api.get('/auth/me')).resolves.toMatchObject({ data: { ok: true } });
  });

  it.each([401, 403])('ends a definitively rejected refresh (%s)', async (status) => {
    post.mockRejectedValue({ response: { status } });
    await expect(api.get('/auth/me')).rejects.toMatchObject({ response: { status } });
    expect(mockAccess).toBeNull();
    expect(mockRefresh).toBeNull();
    expect(mockClearUser).toHaveBeenCalledTimes(1);
  });

  it('does not erase the session for a malformed server response', async () => {
    post.mockResolvedValue({ data: {} });
    await expect(api.get('/auth/me')).rejects.toThrow('Invalid refresh response');
    expect(mockRefresh).toBe('refresh-1');
    expect(mockAccess).toBe('expired');
  });

  it('does not attempt refresh or clear an existing session for invalid login credentials', async () => {
    api.defaults.adapter = (config) => rejectWith(401, config);
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } });
    expect(post).not.toHaveBeenCalled();
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'])('ignores a late refresh %s after another account signs in', async (outcome) => {
    let finish!: (value: unknown) => void;
    post.mockImplementation(() => new Promise((resolve, reject) => { finish = outcome === 'resolve' ? resolve : reject; }));
    const request = api.get('/auth/me').catch((error) => error);
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    await saveSession('other-account', 'refresh-2');
    finish(outcome === 'resolve' ? { data: { accessToken: 'late' } } : { response: { status: 401 } });
    await request;
    expect(mockAccess).toBe('other-account');
    expect(mockRefresh).toBe('refresh-2');
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it('does not restore credentials after logout while refresh is pending', async () => {
    let finish!: (value: unknown) => void;
    post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const request = api.get('/auth/me').catch((error) => error);
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    await clearSession();
    finish({ data: { accessToken: 'late' } });
    await request;
    expect(mockAccess).toBeNull();
    expect(mockRefresh).toBeNull();
  });

  it('reuses the new token when an old 401 arrives after the refresh has completed', async () => {
    let release!: () => void;
    api.defaults.adapter = async (config) => {
      if (config.headers.Authorization === 'Bearer expired') {
        if (config.url === '/slow') await new Promise<void>((resolve) => { release = resolve; });
        return rejectWith(401, config);
      }
      return { status: 200, statusText: 'OK', data: { data: true }, headers: new AxiosHeaders(), config };
    };
    post.mockResolvedValue({ data: { accessToken: 'new-access' } });
    const slow = api.get('/slow');
    await api.get('/fast');
    release();
    await slow;
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('never replays a previous account request with a new account token', async () => {
    let release!: () => void;
    let requests = 0;
    api.defaults.adapter = async (config) => {
      requests += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      return rejectWith(401, config);
    };
    const request = api.post('/voice-notes', {}).catch((error) => error);
    while (!release) await new Promise((resolve) => setImmediate(resolve));
    await saveSession('other-account', 'refresh-2');
    release();
    await expect(request).resolves.toMatchObject({ message: 'Session changed' });
    expect(post).not.toHaveBeenCalled();
    expect(requests).toBe(1);
  });
});
