import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import { PERMISSIONS_KEY } from '@core/decorators/require-permissions.decorator';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new PermissionGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    const request = { user };

    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;
  };

  it('should return true when no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is missing or has no permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(['MANAGE_USERS']);
    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['MANAGE_USERS']);
    const context = createMockContext({
      userId: 'user-1',
      permissionCodes: ['VIEW_PRODUCTS'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should return true if user has all required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([
      'VIEW_PRODUCTS',
      'EDIT_PRODUCTS',
    ]);
    const context = createMockContext({
      userId: 'user-1',
      permissionCodes: ['VIEW_PRODUCTS', 'EDIT_PRODUCTS', 'DELETE_PRODUCTS'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
