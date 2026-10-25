import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';

export interface JwtPayload {
  sessionId?: string;
  userId: string;
  roleId: number;
  roleName: string;
  dataScope: string;
  permissionCodes: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly db: PrismaService,
    private readonly permissions: GetUserEffectivePermissionsUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Bypass if route is marked as @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      // Route public (giỏ hàng...) vẫn cần biết khách đã đăng nhập nếu có token hợp lệ
      if (token) {
        try {
          request.user = await this.verify(token);
        } catch {
          // Token hỏng thì coi như khách vãng lai
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Token không được cung cấp');
    }

    try {
      request.user = await this.verify(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return true;
  }

  private async verify(token: string): Promise<JwtPayload> {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload;
    if (!payload.userId || !payload.sessionId) throw new UnauthorizedException('SESSION_REQUIRED');
    const session = await this.db.userSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        user: { status: 'ACTIVE', emailVerified: true },
      },
      select: {
        user: {
          select: {
            id: true,
            roleId: true,
            role: { select: { name: true, dataScope: true } },
          },
        },
      },
    });
    if (!session) throw new UnauthorizedException('SESSION_INVALID');
    return {
      userId: session.user.id,
      sessionId: payload.sessionId,
      roleId: session.user.roleId,
      roleName: session.user.role.name,
      dataScope: session.user.role.dataScope,
      permissionCodes: await this.permissions.execute(session.user.id),
    };
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
