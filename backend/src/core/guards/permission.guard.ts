import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no specific permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.permissionCodes) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const hasPermission = requiredPermissions.every((perm) =>
      user.permissionCodes.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Yêu cầu quyền: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
