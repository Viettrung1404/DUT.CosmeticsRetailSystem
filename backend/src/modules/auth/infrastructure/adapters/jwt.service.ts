import { refreshTokenTtl } from '@core/config/runtime-config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { JwtPayload } from '@core/guards/jwt-auth.guard';

@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: ConfigService) {}

  generateAccessToken(payload: JwtPayload): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' });
  }

  generateRefreshToken(userId: string): string {
    return crypto.randomBytes(64).toString('hex');
  }

  refreshExpiresAt(): Date {
    const value = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    return new Date(Date.now() + refreshTokenTtl(value));
  }

  verifyAccessToken(token: string): JwtPayload {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  }
}
