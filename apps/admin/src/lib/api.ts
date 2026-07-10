import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

const TOKEN_KEY = 'molyscan_admin_token';
const REFRESH_KEY = 'molyscan_admin_refresh';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  setRefresh: (token: string): void => localStorage.setItem(REFRESH_KEY, token),
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

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

// L'API NestJS emballe les réponses dans une enveloppe { data: ... }.
// On déballe pour simplifier, sauf pour les réponses paginées { data, meta }.
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
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401) {
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

      // Sur un endpoint d'auth (login, refresh…), on ne tente pas de refresh.
      if (!isAuthEndpoint && !originalRequest._retry) {
        const refreshToken = tokenStore.getRefresh();

        if (refreshToken) {
          originalRequest._retry = true;
          try {
            // Appel direct axios (hors intercepteur) pour éviter une boucle infinie.
            const { data } = await axios.post(
              `${api.defaults.baseURL}/auth/refresh`,
              { refreshToken },
            );
            const newAccessToken: string = data?.data?.accessToken ?? data?.accessToken;
            tokenStore.set(newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch {
            // Refresh échoué (token révoqué ou expiré) → déconnexion.
          }
        }

        tokenStore.clear();
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
