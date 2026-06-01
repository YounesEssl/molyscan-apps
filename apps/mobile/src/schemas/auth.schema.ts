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
  avatarUrl: z.string().nullish(),
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
  // Requis uniquement pour les distributeurs (email hors @molydal.com) ;
  // le serveur fait foi sur le rôle et la validation.
  departmentId: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const DepartmentSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string(),
});

export type Department = z.infer<typeof DepartmentSchema>;

export const DepartmentsResponseSchema = z.array(DepartmentSchema);

// L'inscription ne renvoie plus de tokens : le compte est créé en attente de
// validation par un administrateur.
export const RegisterResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
});

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
