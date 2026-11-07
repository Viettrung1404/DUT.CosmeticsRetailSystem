import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard live account/session authorization', () => {
  let guard: JwtAuthGuard;
  const reflector = { getAllAndOverride: jest.fn() };
  const db = { userSession: { findFirst: jest.fn() } };
  const permissions = { execute: jest.fn() };
  const context = (token?: string) => {
    const req = {
      headers: { authorization: token ? `Bearer ${token}` : undefined },
      user: undefined,
    };
    return {
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  };
  const token = (data = {}) =>
    jwt.sign(
      {
        userId: 'user-1',
        sessionId: 'session-1',
        roleId: 1,
        permissionCodes: ['STALE_ADMIN'],
        ...data,
      },
      'test-secret',
    );
  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    db.userSession.findFirst.mockResolvedValue({
      user: {
        id: 'user-1',
        roleId: 6,
        role: { name: 'Customer', dataScope: 'SELF' },
      },
    });
    permissions.execute.mockResolvedValue(['CURRENT_PERMISSION']);
    guard = new JwtAuthGuard(
      reflector as unknown as Reflector,
      { getOrThrow: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      db as any,
      permissions as any,
    );
  });
  it('rejects missing token on protected route', async () => {
    await expect(guard.canActivate(context())).rejects.toThrow(UnauthorizedException);
  });
  it('rejects invalid signature, expired tokens and legacy sessionless tokens', async () => {
    for (const value of [
      jwt.sign({ userId: 'user-1' }, 'wrong'),
      jwt.sign({ userId: 'user-1', sessionId: 'session-1' }, 'test-secret', {
        expiresIn: -1,
      }),
      jwt.sign({ userId: 'user-1' }, 'test-secret'),
    ]) {
      await expect(guard.canActivate(context(value))).rejects.toThrow(UnauthorizedException);
    }
    expect(db.userSession.findFirst).not.toHaveBeenCalled();
  });
  it('replaces stale JWT roles/permissions with current database authorization', async () => {
    const ctx = context(token());
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toMatchObject({
      roleId: 6,
      roleName: 'Customer',
      permissionCodes: ['CURRENT_PERMISSION'],
    });
    expect(db.userSession.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'session-1',
      userId: 'user-1',
      isRevoked: false,
      user: { status: 'ACTIVE', emailVerified: true },
    });
  });
  it('rejects revoked/expired session or disabled/unverified account', async () => {
    db.userSession.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context(token()))).rejects.toThrow(UnauthorizedException);
  });
  it('accepts the sid claim and normalizes both session claim names', async () => {
    const ctx = context(token({ sessionId: undefined, sid: 'session-1' }));
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toMatchObject({
      sessionId: 'session-1',
      sid: 'session-1',
    });
    expect(db.userSession.findFirst.mock.calls[0][0].where.id).toBe('session-1');
  });
  it('allows guest public reads but never enriches using revoked identity', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    db.userSession.findFirst.mockResolvedValue(null);
    const ctx = context(token());
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toBeUndefined();
  });
  it('enriches public routes with current account when session is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = context(token());
    await guard.canActivate(ctx);
    expect(ctx.switchToHttp().getRequest().user.userId).toBe('user-1');
  });
});
