import axios from 'axios';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// One-time startup log so you can confirm which backend the bundle was built
// against. EXPO_PUBLIC_* vars are baked in at Metro start — reload isn't
// enough, Metro must be restarted (ideally with --clear).
const isLocal = API_CONFIG.baseURL.includes('localhost') || /192\.168|10\.|172\./.test(API_CONFIG.baseURL);
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
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    // Unwrap API envelope { data: T } from TransformInterceptor
    if (response.data && typeof response.data === 'object' && 'data' in response.data && !('meta' in response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) {
          await storage.clearTokens();
          return Promise.reject(error);
        }

        const { data: refreshResponse } = await axios.post(
          `${API_CONFIG.baseURL}/auth/refresh`,
          { refreshToken },
        );
        // Unwrap envelope from raw axios call (not through our interceptor)
        const newAccessToken = refreshResponse?.data?.accessToken ?? refreshResponse?.accessToken;

        await storage.setToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        logger.error('Token refresh failed', refreshError);
        await storage.clearTokens();
        return Promise.reject(error);
      }
    }

    logger.error('API error', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(error);
  },
);
