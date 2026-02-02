import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import type { LoginRequest, User } from '@/schemas/auth.schema';

interface UseAuthReturn {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  const login = useCallback(
    async (credentials: LoginRequest): Promise<void> => {
      await authService.login(credentials);
      const me = await authService.getMe();
      setUser(me);
    },
    [setUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
    clearUser();
  }, [clearUser]);

  return {
    isAuthenticated,
    user,
    login,
    logout,
  };
}
