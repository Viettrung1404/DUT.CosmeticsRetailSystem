import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';

export interface JwtPayload {
  sid?: string;
  sessionId?: string;
  userId: string;
  roleId: number;
  roleName: string;
  dataScope: string;
  permissionCodes: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly sessionCache = new Map<
    string,
    {
      user: {
        userId: string;
        sessionId: string;
        sid: string;
        roleId: number;
        roleName: string;
        dataScope: string;
      };
      expiresAt: number;
    }
  >();

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
    const sessionId = payload.sessionId ?? payload.sid;
    if (!payload.userId || !sessionId) throw new UnauthorizedException('SESSION_REQUIRED');

    const cacheKey = `${payload.userId}:${sessionId}`;
    const now = Date.now();
    const cached = this.sessionCache.get(cacheKey);

    let sessionUser: {
      userId: string;
      sessionId: string;
      sid: string;
      roleId: number;
      roleName: string;
      dataScope: string;
    };

    if (cached && cached.expiresAt > now) {
      sessionUser = cached.user;
    } else {
      const session = await this.db.userSession.findFirst({
        where: {
          id: sessionId,
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
      sessionUser = {
        userId: session.user.id,
        sessionId,
        sid: sessionId,
        roleId: session.user.roleId,
        roleName: session.user.role.name,
        dataScope: session.user.role.dataScope,
      };
      // Keep session verified for 15s to collapse bursts of parallel requests
      this.sessionCache.set(cacheKey, { user: sessionUser, expiresAt: now + 15000 });
      if (this.sessionCache.size > 2000) {
        for (const [k, v] of this.sessionCache.entries()) {
          if (v.expiresAt <= now) this.sessionCache.delete(k);
        }
      }
    }

    return {
      userId: sessionUser.userId,
      sessionId,
      sid: sessionId,
      roleId: sessionUser.roleId,
      roleName: sessionUser.roleName,
      dataScope: sessionUser.dataScope,
      permissionCodes: await this.permissions.execute(sessionUser.userId),
    };
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
