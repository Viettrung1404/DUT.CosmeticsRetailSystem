import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import {
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
} from '@core/decorators/require-permissions.decorator';

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
  describe('RequireAnyPermission', () => {
    const mockAnyOf = (anyOf: string[]) =>
      reflector.getAllAndOverride.mockImplementation((key: unknown) =>
        key === ANY_PERMISSIONS_KEY ? anyOf : undefined,
      );

    it('cho qua khi người dùng có một trong các quyền', () => {
      mockAnyOf(['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_CATEGORY_MANAGE']);
      const context = createMockContext({ userId: 'user-1', permissionCodes: ['PRODUCT_CREATE'] });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('chặn khi người dùng không có quyền nào trong danh sách', () => {
      mockAnyOf(['PRODUCT_CREATE', 'PRODUCT_UPDATE']);
      const context = createMockContext({ userId: 'user-1', permissionCodes: ['PRODUCT_VIEW'] });

      expect(() => guard.canActivate(context)).toThrow('Yêu cầu một trong các quyền');
    });

    it('vẫn đòi đủ quyền của RequirePermissions khi dùng chung', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) =>
        key === PERMISSIONS_KEY ? ['PRODUCT_VIEW'] : ['PRODUCT_CREATE', 'PRODUCT_UPDATE'],
      );
      const context = createMockContext({ userId: 'user-1', permissionCodes: ['PRODUCT_UPDATE'] });

      expect(() => guard.canActivate(context)).toThrow('Yêu cầu quyền: PRODUCT_VIEW');
    });
  });
});
