import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  Reflect.metadata(PERMISSIONS_KEY, permissions);

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
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

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const rolePerms = ROLE_PERMISSIONS[user.role] || {};
    return requiredPermissions.every((p) => rolePerms[p]);
  }
}
