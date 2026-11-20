import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomerReturnController } from '../customer-return.controller';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { RmaEligibilityService } from '../../../application/services/rma-eligibility.service';
import { SubmitReturnRequestUseCase } from '../../../application/use-cases/submit-return-request.use-case';
import { ReturnChannel, ReturnReasonCode } from '../../../domain/entities/return-policy.entity';
import { JwtAuthGuard } from '../../../../../core/guards/jwt-auth.guard';

describe('EP13-T03: CustomerReturnController Unit Tests', () => {
  let controller: CustomerReturnController;
  let prisma: any;
  let eligibilityService: any;
  let submitUseCase: any;

  const mockCustomerId = 'cust-uuid-111';
  const mockUserId = 'user-uuid-222';
  const mockOrderId = 'order-uuid-333';
  const mockReturnId = 'ret-uuid-444';

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({ id: mockCustomerId }),
      },
      returnOrder: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: mockReturnId, returnCode: 'RET-001' }]),
        findUnique: jest.fn(),
      },
    };

    eligibilityService = {
      checkOrderEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
    };

    submitUseCase = {
      execute: jest.fn().mockResolvedValue({ id: mockReturnId, returnCode: 'RET-001' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerReturnController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RmaEligibilityService, useValue: eligibilityService },
        { provide: SubmitReturnRequestUseCase, useValue: submitUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerReturnController>(CustomerReturnController);
  });

  it('1. should resolve customerId from header or token and call eligibility service', async () => {
    const req = { user: { customerId: mockCustomerId } };
    const result = await controller.checkEligibility(mockOrderId, req);

    expect(result).toBeDefined();
    expect(eligibilityService.checkOrderEligibility).toHaveBeenCalledWith(
      mockOrderId,
      mockCustomerId,
    );
  });

  it('2. should resolve customerId from userId via DB lookup when customerId not in token', async () => {
    const req = { user: { userId: mockUserId } };
    const result = await controller.checkEligibility(mockOrderId, req);

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserId }, select: { id: true } });
    expect(eligibilityService.checkOrderEligibility).toHaveBeenCalledWith(
      mockOrderId,
      mockCustomerId,
    );
  });

  it('3. should throw UnauthorizedException when customer identity cannot be resolved', async () => {
    const req = { user: {} };
    await expect(controller.checkEligibility(mockOrderId, req)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('4. should call submitReturnRequestUseCase upon submitReturn', async () => {
    const req = { user: { customerId: mockCustomerId } };
    const dto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: 'store-1',
      items: [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/img1.jpg'],
        },
      ],
    };

    const result = await controller.submitReturn(dto, req);
    expect(result).toBeDefined();
    expect(submitUseCase.execute).toHaveBeenCalledWith(mockCustomerId, dto);
  });

  it('5. should list customer returns with pagination', async () => {
    const req = { user: { customerId: mockCustomerId } };
    const result = await controller.listReturns(req, '1', '10');

    expect(result.data).toBeDefined();
    expect(result.meta.total).toBe(1);
    expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: mockCustomerId },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('6. should return return detail when customer owns the return record', async () => {
    const req = { user: { customerId: mockCustomerId } };
    prisma.returnOrder.findUnique.mockResolvedValue({
      id: mockReturnId,
      customerId: mockCustomerId,
      returnCode: 'RET-001',
    });

    const result = await controller.getReturnDetail(mockReturnId, req);
    expect(result).toBeDefined();
    expect(result.id).toBe(mockReturnId);
  });

  it('7. should throw ForbiddenException when return record belongs to another customer', async () => {
    const req = { user: { customerId: mockCustomerId } };
    prisma.returnOrder.findUnique.mockResolvedValue({
      id: mockReturnId,
      customerId: 'other-customer-id',
    });

    await expect(controller.getReturnDetail(mockReturnId, req)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('8. should throw NotFoundException when return record does not exist', async () => {
    const req = { user: { customerId: mockCustomerId } };
    prisma.returnOrder.findUnique.mockResolvedValue(null);

    await expect(controller.getReturnDetail('non-existent-id', req)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('9. should mount under both customers/me and root prefix without collision (BE-02)', () => {
    const path = Reflect.getMetadata('path', CustomerReturnController);
    expect(path).toEqual(['customers/me', '']);
  });

  it('10. should filter returns by status and provide backward-compatible items structure', async () => {
    const req = { user: { customerId: mockCustomerId } };
    const result = await controller.listReturns(req, '1', '10', 'SUBMITTED');

    expect(prisma.returnOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: mockCustomerId, status: 'SUBMITTED' },
      }),
    );
    expect(result.items).toBeDefined();
    expect(result.total).toBe(1);
  });
});
