import { storage } from '@/lib/storage';
import { authService } from '@/services/auth.service';
import { expireSession, getSessionRevision, isSessionRejection } from '@/lib/session';
import { useAuthStore } from '@/stores/auth.store';

export type SessionRestoration = 'ready' | 'unavailable';

export async function restoreSession(): Promise<SessionRestoration> {
  const revision = getSessionRevision();
  try {
    const [token, refreshToken] = await Promise.all([storage.getToken(), storage.getRefreshToken()]);
    if (!token && !refreshToken) return 'ready';
    const user = await authService.getMe();
    if (revision === getSessionRevision()) useAuthStore.getState().setUser(user);
    return 'ready';
  } catch (error) {
    if (revision !== getSessionRevision()) return 'ready';
    if (isSessionRejection(error)) {
      await expireSession(revision);
      return 'ready';
    }
    return 'unavailable';
  }
}
