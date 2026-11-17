import { ExecutionContext, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LocationScopeGuard } from '../location-scope.guard';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';

describe('LocationScopeGuard (EP11-T01)', () => {
  let guard: LocationScopeGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: any;
  let userDataScope: jest.Mocked<GetUserDataScopeUseCase>;

  const storeQ1 = '11111111-1111-1111-1111-111111111111';
  const storeQ10 = '22222222-2222-2222-2222-222222222222';
  const foQ1Id = '33333333-3333-3333-3333-333333333333';
  const shipmentQ1Id = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    prisma = {
      fulfillmentOrder: {
        findUnique: jest.fn(),
      },
      shipment: {
        findUnique: jest.fn(),
      },
    };

    userDataScope = {
      execute: jest.fn(),
    } as any;

    guard = new LocationScopeGuard(reflector, prisma as unknown as PrismaService, userDataScope);
  });

  const createMockContext = (requestData: {
    user?: any;
    params?: any;
    body?: any;
    query?: any;
  }): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(requestData),
      }),
    } as any;
  };

  it('1. Bỏ qua kiểm tra và trả về true nếu route không đánh dấu @LocationScoped', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ user: { userId: 'u1' } });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('2. Ném lỗi UnauthorizedException nếu không có user đăng nhập', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'FULFILLMENT_ORDER' });
    const context = createMockContext({ user: null });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('3. Admin tối cao (role ADMIN hoặc dataScope ALL) được bypass toàn quyền', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'FULFILLMENT_ORDER', allowAdminOverride: true });
    
    // User ADMIN
    const adminContext = createMockContext({
      user: { userId: 'admin-1', roleName: 'ADMIN' },
      params: { id: foQ1Id },
    });
    expect(await guard.canActivate(adminContext)).toBe(true);

    // User OPERATIONS_MGR
    const opsContext = createMockContext({
      user: { userId: 'ops-1', roleName: 'OPERATIONS_MGR' },
      params: { id: foQ1Id },
    });
    expect(await guard.canActivate(opsContext)).toBe(true);

    // User có dataScope = ALL
    const globalContext = createMockContext({
      user: { userId: 'global-1', roleName: 'STAFF', dataScope: 'ALL' },
      params: { id: foQ1Id },
    });
    expect(await guard.canActivate(globalContext)).toBe(true);
  });

  it('4. Ném lỗi NotFoundException nếu không tìm thấy FulfillmentOrder', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'FULFILLMENT_ORDER' });
    prisma.fulfillmentOrder.findUnique.mockResolvedValue(null);

    const context = createMockContext({
      user: { userId: 'staff-1', roleName: 'STAFF', dataScope: 'STORE' },
      params: { id: foQ1Id },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('5. AC1: Nhân viên Showroom Q10 thao tác trên đơn hàng của Showroom Q1 -> Ném 403 Forbidden (LOCATION_SCOPE_UNAUTHORIZED)', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'FULFILLMENT_ORDER' });
    
    // Đơn hàng thuộc Showroom Q1
    prisma.fulfillmentOrder.findUnique.mockResolvedValue({
      id: foQ1Id,
      sourceLocationId: storeQ1,
    });

    // Nhân viên chỉ được phân quyền tại Showroom Q10
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ10],
      employeeId: null,
    });

    const context = createMockContext({
      user: { userId: 'staff-q10', roleName: 'STAFF', dataScope: 'STORE' },
      params: { id: foQ1Id },
    });

    try {
      await guard.canActivate(context);
      fail('Cần ném ra ForbiddenException nhưng không ném');
    } catch (error: any) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const response = error.getResponse();
      expect(response.errorCode).toBe('LOCATION_SCOPE_UNAUTHORIZED');
      expect(response.statusCode).toBe(403);
    }
  });

  it('6. AC2: Quản lý vùng phụ trách cả Q1 và Q10 thao tác trên đơn hàng Q1 -> Thành công (true)', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'FULFILLMENT_ORDER' });

    // Đơn hàng thuộc Showroom Q1
    prisma.fulfillmentOrder.findUnique.mockResolvedValue({
      id: foQ1Id,
      sourceLocationId: storeQ1,
    });

    // Quản lý vùng có quyền cả Q1 và Q10
    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ1, storeQ10],
      employeeId: null,
    });

    const context = createMockContext({
      user: { userId: 'regional-mgr', roleName: 'STORE_MGR', dataScope: 'STORE' },
      params: { id: foQ1Id },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('7. Hỗ trợ kiểm tra tài nguyên SHIPMENT', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'shipmentId', resourceType: 'SHIPMENT' });

    prisma.shipment.findUnique.mockResolvedValue({
      id: shipmentQ1Id,
      fulfillmentOrder: { sourceLocationId: storeQ1 },
    });

    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ1],
      employeeId: null,
    });

    const context = createMockContext({
      user: { userId: 'staff-q1', roleName: 'STAFF', dataScope: 'STORE' },
      params: { shipmentId: shipmentQ1Id },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('8. Hỗ trợ kiểm tra tài nguyên RETURN_ORDER theo dropoffLocationId', async () => {
    reflector.getAllAndOverride.mockReturnValue({ paramName: 'id', resourceType: 'RETURN_ORDER' });
    const returnOrderId = '55555555-5555-5555-5555-555555555555';

    prisma.returnOrder = {
      findUnique: jest.fn().mockResolvedValue({
        id: returnOrderId,
        dropoffLocationId: storeQ1,
        storeId: storeQ10,
      }),
    };

    userDataScope.execute.mockResolvedValue({
      type: 'STORE',
      storeIds: [storeQ1],
      employeeId: null,
    });

    const context = createMockContext({
      user: { userId: 'staff-q1', roleName: 'STAFF', dataScope: 'STORE' },
      params: { id: returnOrderId },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
