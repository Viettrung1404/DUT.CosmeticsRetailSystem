import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
} from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets) ?? [];
    const anyOfPermissions =
      this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, targets) ?? [];

    // If no specific permissions are required, allow access
    if (requiredPermissions.length === 0 && anyOfPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || (!user.permissionCodes && !user.roleName)) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const normalizedRole = (user.roleName || '').toUpperCase();
    if (normalizedRole === 'ADMIN' || user.roleId === 1) {
      return true;
    }

    const effectiveCodes = user.permissionCodes || [];

    const hasPermission = requiredPermissions.every(
      (perm) =>
        effectiveCodes.includes(perm) ||
        normalizedRole === perm.toUpperCase() ||
        (perm === 'ORDER_RETURN_MANAGE' &&
          (effectiveCodes.includes('RETURN_MANAGE') ||
            effectiveCodes.includes('RETURN_VIEW'))),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Yêu cầu quyền: ${requiredPermissions.join(', ')}`,
      );
    }

    const hasAnyPermission =
      anyOfPermissions.length === 0 ||
      anyOfPermissions.some(
        (perm) =>
          effectiveCodes.includes(perm) ||
          normalizedRole === perm.toUpperCase() ||
          (normalizedRole.includes('MANAGER') && perm.toUpperCase() === 'MANAGER') ||
          (perm === 'RETURN_VIEW' && effectiveCodes.includes('ORDER_RETURN_MANAGE')) ||
          (perm === 'RETURN_MANAGE' && effectiveCodes.includes('ORDER_RETURN_MANAGE')),
      );

    if (!hasAnyPermission) {
      throw new ForbiddenException(
        `Yêu cầu một trong các quyền: ${anyOfPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
