import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tokenHeader =
      request.headers['x-internal-token'] ||
      request.headers['x-internal-secret'] ||
      this.extractBearerToken(request.headers['authorization']);

    const expectedSecret =
      this.configService.get<string>('INTERNAL_DISPATCH_SECRET') ||
      'glowup-internal-auth-secret-key';

    if (!tokenHeader || tokenHeader !== expectedSecret) {
      this.logger.warn(
        `Unauthorized access attempt to internal endpoint from IP: ${request.ip}`,
      );
      throw new UnauthorizedException(
        'INVALID_INTERNAL_TOKEN: Unauthorized internal dispatcher access',
      );
    }

    return true;
  }

  private extractBearerToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const match = authHeader.match(/^Bearer\s+(.*)$/i);
    return match ? match[1].trim() : null;
  }
}
