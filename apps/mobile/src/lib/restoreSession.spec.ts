const mockSetUser = jest.fn();
const mockClearUser = jest.fn();
jest.mock('@/lib/storage', () => ({ storage: {
  getToken: jest.fn(), getRefreshToken: jest.fn(), clearTokens: jest.fn(),
  setToken: jest.fn(), setRefreshToken: jest.fn(),
} }));
jest.mock('@/services/auth.service', () => ({ authService: { getMe: jest.fn() } }));
jest.mock('@/stores/auth.store', () => ({ useAuthStore: { getState: () => ({ setUser: mockSetUser, clearUser: mockClearUser }) } }));
import { storage } from './storage';
import { authService } from '@/services/auth.service';
import { restoreSession } from './restoreSession';
import { clearSession } from './session';

describe('session restoration on startup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.getToken as jest.Mock).mockResolvedValue('access');
    (storage.getRefreshToken as jest.Mock).mockResolvedValue('refresh');
  });
  it('restores a slow but valid response without the former three-second cutoff', async () => {
    jest.useFakeTimers();
    (authService.getMe as jest.Mock).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ id: 'user-1' }), 5000)));
    const result = restoreSession();
    await jest.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBe('ready');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-1' });
    expect(storage.clearTokens).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
  it.each([
    new Error('Network unavailable'),
    { code: 'ECONNABORTED' },
    { response: { status: 503 } },
  ])('offers recovery without discarding credentials on a temporary error', async (error) => {
    (authService.getMe as jest.Mock).mockRejectedValue(error);
    await expect(restoreSession()).resolves.toBe('unavailable');
    expect(storage.clearTokens).not.toHaveBeenCalled();
    expect(mockClearUser).not.toHaveBeenCalled();
  });
  it('signs out when the server definitively rejects the session', async () => {
    (authService.getMe as jest.Mock).mockRejectedValue({ response: { status: 401 } });
    await expect(restoreSession()).resolves.toBe('ready');
    expect(storage.clearTokens).toHaveBeenCalledTimes(1);
    expect(mockClearUser).toHaveBeenCalledTimes(1);
  });
  it('can restore when only the refresh token is present', async () => {
    (storage.getToken as jest.Mock).mockResolvedValue(null);
    (authService.getMe as jest.Mock).mockResolvedValue({ id: 'user-1' });
    await expect(restoreSession()).resolves.toBe('ready');
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-1' });
  });
  it('does not contact the server without any saved credentials', async () => {
    (storage.getToken as jest.Mock).mockResolvedValue(null);
    (storage.getRefreshToken as jest.Mock).mockResolvedValue(null);
    await expect(restoreSession()).resolves.toBe('ready');
    expect(authService.getMe).not.toHaveBeenCalled();
  });
  it('does not restore a profile after the user signs out during validation', async () => {
    let finish!: (user: unknown) => void;
    (authService.getMe as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const result = restoreSession();
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    await clearSession();
    finish({ id: 'old-user' });
    await result;
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});
