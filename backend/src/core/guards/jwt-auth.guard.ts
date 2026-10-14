import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '@core/decorators/public.decorator';

export interface JwtPayload {
  sid?: string;
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
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
          request.user = this.verify(token);
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
      request.user = this.verify(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    return true;
  }

  private verify(token: string): JwtPayload {
    const secret = this.configService.get<string>('JWT_SECRET', 'glowup-secret-key');
    return jwt.verify(token, secret) as JwtPayload;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
