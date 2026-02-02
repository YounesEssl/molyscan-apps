import type { UserRole } from '@/schemas/auth.schema';
import { PERMISSIONS, type RolePermissions } from '@/constants/roles';

export const getPermissions = (role: UserRole): RolePermissions => PERMISSIONS[role];

export const hasPermission = (
  role: UserRole,
  permission: keyof RolePermissions,
): boolean => PERMISSIONS[role][permission];
