import type { UserRole } from '@/schemas/auth.schema';

export interface RolePermissions {
  canScan: boolean;
  canRequestPrice: boolean;
  canValidatePrice: boolean;
  canAccessChat: boolean;
  canExportData: boolean;
  canAccessAnalytics: boolean;
  canUpdateCRM: boolean;
}

export const PERMISSIONS: Record<UserRole, RolePermissions> = {
  commercial: {
    canScan: true,
    canRequestPrice: true,
    canValidatePrice: false,
    canAccessChat: true,
    canExportData: true,
    canAccessAnalytics: false,
    canUpdateCRM: true,
  },
  distributor: {
    canScan: true,
    canRequestPrice: true,
    canValidatePrice: false,
    canAccessChat: true,
    canExportData: false,
    canAccessAnalytics: false,
    canUpdateCRM: false,
  },
  admin: {
    canScan: true,
    canRequestPrice: true,
    canValidatePrice: true,
    canAccessChat: true,
    canExportData: true,
    canAccessAnalytics: true,
    canUpdateCRM: true,
  },
};
