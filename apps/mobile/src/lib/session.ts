import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth.store';

// Serialize credential writes so a late refresh cannot undo logout or replace
// the credentials of a newly signed-in account.
let revision = 0;
let writes: Promise<void> = Promise.resolve();

function write(operation: () => Promise<void>): Promise<void> {
  const next = writes.then(operation);
  writes = next.catch(() => {});
  return next;
}

export function getSessionRevision(): number {
  return revision;
}

export function saveSession(accessToken: string, refreshToken: string): Promise<void> {
  revision += 1;
  return write(async () => {
    await storage.setRefreshToken(refreshToken);
    await storage.setToken(accessToken);
  });
}

export function clearSession(): Promise<void> {
  revision += 1;
  useAuthStore.getState().clearUser();
  return write(() => storage.clearTokens());
}

export function replaceAccessToken(token: string, expectedRevision: number): Promise<void> {
  return write(async () => {
    if (revision !== expectedRevision) throw new Error('Session changed');
    await storage.setToken(token);
  });
}

export function expireSession(expectedRevision: number): Promise<void> {
  if (revision !== expectedRevision) return Promise.resolve();
  return clearSession();
}

export function isSessionRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403;
}
