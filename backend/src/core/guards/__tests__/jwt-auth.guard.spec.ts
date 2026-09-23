import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { IS_PUBLIC_KEY } from '@core/decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as any;

    guard = new JwtAuthGuard(reflector, configService);
  });

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      user: null,
    };

    return {
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class MockController {}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;
  };

  it('should return true if route is marked as public', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('should throw UnauthorizedException if no token is provided on protected route', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should attach user payload to request if token is valid', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const payload = {
      userId: 'user-123',
      roleId: 1,
      roleName: 'Customer',
      dataScope: 'self',
      permissionCodes: ['READ_PRODUCTS'],
    };
    const token = jwt.sign(payload, 'test-secret');
    const context = createMockContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toMatchObject({
      userId: 'user-123',
      roleName: 'Customer',
    });
  });

  it('should throw UnauthorizedException if token is invalid or expired', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext('Bearer invalid.token.here');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
