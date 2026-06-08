import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore, setUnauthorizedHandler } from './api';
import type { AuthTokens, CurrentUser } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

class AccessDeniedError extends Error {}

async function fetchMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/auth/me');
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Déconnexion immédiate quand l'API renvoie 401 (token expiré/invalide) :
  // bascule l'état vers « anonymous » → ProtectedRoute redirige vers /login
  // sans qu'un refresh manuel soit nécessaire.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restauration de session au montage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.get()) {
        setStatus('anonymous');
        return;
      }
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (me.role !== 'admin') {
          tokenStore.clear();
          setStatus('anonymous');
          return;
        }
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        tokenStore.clear();
        setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Revalidation de session au retour sur l'onglet : sans cela, un token expiré
  // pendant que l'onglet était en arrière-plan n'est détecté qu'au prochain
  // appel API (React Query n'a pas refetchOnWindowFocus). On revérifie /auth/me
  // dès que l'onglet redevient visible ; un token expiré → 401 → déconnexion.
  useEffect(() => {
    const revalidate = (): void => {
      if (document.visibilityState !== 'visible') return;
      if (!tokenStore.get()) return; // déjà déconnecté
      void fetchMe()
        .then((me) => {
          if (me.role !== 'admin') {
            tokenStore.clear();
            setUser(null);
            setStatus('anonymous');
          }
        })
        .catch(() => {
          // 401 → traité par l'intercepteur (unauthorizedHandler) ;
          // les autres erreurs (réseau…) ne déconnectent pas.
        });
    };
    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('focus', revalidate);
    return () => {
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('focus', revalidate);
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const { data } = await api.post<AuthTokens>('/auth/login', {
      email,
      password,
    });
    tokenStore.set(data.accessToken);
    if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
    try {
      const me = await fetchMe();
      if (me.role !== 'admin') {
        tokenStore.clear();
        throw new AccessDeniedError(
          'Accès réservé aux administrateurs.',
        );
      }
      setUser(me);
      setStatus('authenticated');
    } catch (err) {
      tokenStore.clear();
      setStatus('anonymous');
      throw err;
    }
  };

  const logout = (): void => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
  };

  return (
    <AuthContext.Provider value={{ status, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
