import axios from 'axios';
import { API_CONFIG } from '@/constants/api';
import { storage } from '@/lib/storage';

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
  (response) => response,
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

        const { data } = await axios.post(
          `${API_CONFIG.baseURL}/auth/refresh`,
          { refreshToken },
        );

        await storage.setToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch {
        await storage.clearTokens();
        return Promise.reject(error);
      }
    }

    if (__DEV__) {
      console.error('[API Error]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  },
);
