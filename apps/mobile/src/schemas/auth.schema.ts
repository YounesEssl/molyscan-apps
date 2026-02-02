import { z } from 'zod';

export const UserRoleSchema = z.enum(['commercial', 'distributor', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: UserRoleSchema,
  company: z.string().nullish(),
  phone: z.string().nullish(),
  createdAt: z.coerce.string(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = LoginRequestSchema.extend({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: UserRoleSchema.optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
