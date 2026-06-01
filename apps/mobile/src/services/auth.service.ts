import { z } from 'zod';
import { api } from '@/lib/axios';
import { storage } from '@/lib/storage';
import { ENDPOINTS } from '@/constants/api';
import {
  UserSchema,
  RegisterResponseSchema,
  MessageResponseSchema,
  type LoginRequest,
  type RegisterRequest,
  type RegisterResponse,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type MessageResponse,
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

  // Crée une demande de compte. Aucun token n'est renvoyé : le compte reste
  // en attente jusqu'à validation d'un administrateur.
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await api.post(ENDPOINTS.auth.register, payload);
    return RegisterResponseSchema.parse(data);
  },

  // Demande un code de réinitialisation (réponse toujours générique).
  forgotPassword: async (
    payload: ForgotPasswordRequest,
  ): Promise<MessageResponse> => {
    const { data } = await api.post(ENDPOINTS.auth.forgotPassword, payload);
    return MessageResponseSchema.parse(data);
  },

  // Réinitialise le mot de passe avec le code reçu par email.
  resetPassword: async (
    payload: ResetPasswordRequest,
  ): Promise<MessageResponse> => {
    const { data } = await api.post(ENDPOINTS.auth.resetPassword, payload);
    return MessageResponseSchema.parse(data);
  },

  getMe: async (config?: { signal?: AbortSignal }): Promise<User> => {
    const { data } = await api.get(ENDPOINTS.auth.me, config);
    return UserSchema.parse(data);
  },

  logout: async (): Promise<void> => {
    await storage.clearTokens();
  },
} as const;
