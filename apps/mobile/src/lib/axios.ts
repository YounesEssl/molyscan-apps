import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { expireSession, getSessionRevision, isSessionRejection, replaceAccessToken } from '@/lib/session';

const PUBLIC_AUTH_ROUTES = new Set([
  '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/refresh',
]);
let refreshInFlight: { revision: number; promise: Promise<string> } | null = null;
type SessionRequest = InternalAxiosRequestConfig & { _sessionRevision?: number; _retry?: boolean };

async function refreshAccessToken(failedToken: string | undefined, revision: number): Promise<string> {
  if (revision !== getSessionRevision()) throw new Error('Session changed');
  const currentToken = await storage.getToken();
  if (revision !== getSessionRevision()) throw new Error('Session changed');
  // Another request may already have replaced the expired access token.
  if (currentToken && `Bearer ${currentToken}` !== failedToken) return currentToken;
  if (refreshInFlight?.revision === revision) return refreshInFlight.promise;

  const promise = (async () => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) {
      await expireSession(revision);
      throw new Error('No refresh token');
    }
    try {
      const { data } = await axios.post(
        `${API_CONFIG.baseURL}/auth/refresh`,
        { refreshToken },
        { timeout: API_CONFIG.timeout },
      );
      const accessToken = data?.data?.accessToken ?? data?.accessToken;
      if (typeof accessToken !== 'string' || !accessToken) throw new Error('Invalid refresh response');
      await replaceAccessToken(accessToken, revision);
      return accessToken;
    } catch (error) {
      // Offline, timeout, rate limiting and server failures must remain
      // retryable. Only a rejected refresh credential ends the session.
      if (isSessionRejection(error)) await expireSession(revision);
      throw error;
    }
  })();
  const flight = { revision, promise };
  refreshInFlight = flight;
  try {
    return await promise;
  } finally {
    if (refreshInFlight === flight) refreshInFlight = null;
  }
}

// One-time startup log so you can confirm which backend the bundle was built
// against. EXPO_PUBLIC_* vars are baked in at Metro start — reload isn't
// enough, Metro must be restarted (ideally with --clear).
const isLocal = API_CONFIG.baseURL.includes('localhost') || /192\.|10\.|172\./.test(API_CONFIG.baseURL);
logger.info(
  `API → ${API_CONFIG.baseURL} ${isLocal ? '🟢 LOCAL DEV' : '🔴 PROD'}`,
);

export const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const request = config as SessionRequest;
    const revision = request._sessionRevision ?? getSessionRevision();
    const token = await storage.getToken();
    if (revision !== getSessionRevision()) throw new Error('Session changed');
    request._sessionRevision = revision;
    if (token && !PUBLIC_AUTH_ROUTES.has(config.url ?? '')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    const revision = (response.config as SessionRequest)._sessionRevision;
    if (revision !== undefined && revision !== getSessionRevision()) throw new Error('Session changed');
    // Unwrap API envelope { data: T } from TransformInterceptor
    if (response.data && typeof response.data === 'object' && 'data' in response.data && !('meta' in response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry
      && !PUBLIC_AUTH_ROUTES.has(originalRequest.url ?? '')) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken(originalRequest.headers?.Authorization, originalRequest._sessionRevision);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        logger.warn('Session renewal unavailable');
        // Surface the refresh failure: a network failure must not look like
        // a definitive 401 to session restoration.
        return Promise.reject(refreshError);
      }
    }

    logger.error('API error', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(error);
  },
);
