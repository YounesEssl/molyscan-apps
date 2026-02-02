import { z } from 'zod';
import { api } from '@/lib/axios';
import { storage } from '@/lib/storage';
import { ENDPOINTS } from '@/constants/api';
import {
  UserSchema,
  type LoginRequest,
  type User,
} from '@/schemas/auth.schema';

const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthTokens> => {
    const { data } = await api.post(ENDPOINTS.auth.login, credentials);
    const tokens = AuthTokensSchema.parse(data);
    await storage.setToken(tokens.accessToken);
    await storage.setRefreshToken(tokens.refreshToken);
    return tokens;
  },

  register: async (credentials: LoginRequest): Promise<AuthTokens> => {
    const { data } = await api.post(ENDPOINTS.auth.register, credentials);
    const tokens = AuthTokensSchema.parse(data);
    await storage.setToken(tokens.accessToken);
    await storage.setRefreshToken(tokens.refreshToken);
    return tokens;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get(ENDPOINTS.auth.me);
    return UserSchema.parse(data);
  },

  logout: async (): Promise<void> => {
    await storage.clearTokens();
  },
} as const;
