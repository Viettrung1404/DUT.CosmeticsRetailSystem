import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { JwtPayload } from '@core/guards/jwt-auth.guard';

@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: ConfigService) {}

  generateAccessToken(payload: JwtPayload): string {
    const secret = this.configService.get<string>('JWT_SECRET', 'glowup-secret-key');
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    return jwt.sign(payload, secret, { expiresIn });
  }

  generateRefreshToken(userId: string): string {
    return crypto.randomBytes(64).toString('hex');
  }

  verifyAccessToken(token: string): JwtPayload {
    const secret = this.configService.get<string>('JWT_SECRET', 'glowup-secret-key');
    return jwt.verify(token, secret) as JwtPayload;
  }
}
