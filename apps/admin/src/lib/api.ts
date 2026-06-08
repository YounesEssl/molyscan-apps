import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

const TOKEN_KEY = 'molyscan_admin_token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

// Notifie l'app (AuthProvider) quand l'API renvoie 401 (token expiré/invalide),
// pour basculer l'état d'auth vers « anonymous » sans attendre un refresh.
// Registre de callback plutôt qu'un import direct d'auth.tsx, pour éviter un
// cycle d'imports (auth.tsx dépend de api.ts, pas l'inverse).
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://192.0.0.2:3000/api',
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// L'API NestJS emballe les réponses dans un enveloppe { data: ... }
// (sauf réponses paginées qui ont aussi { meta }). On déballe pour simplifier.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (
      body &&
      typeof body === 'object' &&
      'data' in body &&
      !('meta' in body)
    ) {
      response.data = body.data;
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      // Un 401 sur /auth/login = mauvais identifiants (géré par le formulaire),
      // pas une session expirée — on ne déclenche pas la déconnexion globale.
      const isLogin = error.config?.url?.includes('/auth/login');
      if (!isLogin) {
        unauthorizedHandler?.();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
