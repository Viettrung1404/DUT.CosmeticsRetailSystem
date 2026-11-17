import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubmitReturnRequestUseCase } from '../submit-return-request.use-case';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../../async-infrastructure/outbox/outbox-writer.service';
import { RmaEligibilityService } from '../../services/rma-eligibility.service';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnReasonCode,
  ShippingFeeBearer,
} from '../../../domain/entities/return-policy.entity';
import { SubmitReturnRequestDto } from '../../../presentation/dtos/submit-return-request.dto';

describe('EP13-T03: SubmitReturnRequestUseCase Unit Tests', () => {
  let useCase: SubmitReturnRequestUseCase;
  let prisma: any;
  let eligibilityService: any;
  let outboxWriter: any;

  const mockCustomerId = 'cust-123';
  const mockOrderId = 'order-456';
  const mockOrderItemId1 = 'order-item-789';
  const mockVariantId1 = 'variant-101';
  const mockStoreId = 'store-202';

  const mockValidEligibility = {
    orderId: mockOrderId,
    orderCode: 'ORD-2026-9999',
    deliveredAt: new Date(),
    policyVersionName: 'POLICY-V1-2026',
    isEligible: true,
    ineligibleReasons: [],
    items: [
      {
        orderItemId: mockOrderItemId1,
        productId: 'prod-1',
        productVariantId: mockVariantId1,
        productName: 'Kem Dưỡng Phục Hồi B5 GlowUp',
        variantName: '50ml',
        sku: 'SKU-B5-50',
        thumbnailUrl: 'https://cdn.glowup.vn/b5.png',
        unitPrice: 420000,
        purchasedQuantity: 2,
        alreadyReturnedQuantity: 0,
        availableReturnQuantity: 2,
        isEligible: true,
        allowedRules: [
          {
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
            windowDays: 7,
            daysRemaining: 5,
            requiresOriginalSeal: true,
            maxUsagePercentage: 0,
            shippingFeeBearer: ShippingFeeBearer.CUSTOMER,
            requiresEvidenceVideo: false,
            requiresEvidenceImage: true,
            allowStoreDropoff: true,
            allowCarrierPickup: true,
            requiresManualReview: false,
          },
          {
            reasonCode: ReturnReasonCode.DAMAGED_IN_TRANSIT,
            windowDays: 2,
            daysRemaining: 1,
            requiresOriginalSeal: false,
            maxUsagePercentage: 0,
            shippingFeeBearer: ShippingFeeBearer.GLOWUP,
            requiresEvidenceVideo: true,
            requiresEvidenceImage: true,
            allowStoreDropoff: true,
            allowCarrierPickup: true,
            requiresManualReview: false,
          },
          {
            reasonCode: ReturnReasonCode.ALLERGIC,
            windowDays: 14,
            daysRemaining: 12,
            requiresOriginalSeal: false,
            maxUsagePercentage: 20,
            shippingFeeBearer: ShippingFeeBearer.GLOWUP,
            requiresEvidenceVideo: false,
            requiresEvidenceImage: true,
            allowStoreDropoff: true,
            allowCarrierPickup: true,
            requiresManualReview: true,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue({ id: mockStoreId, name: 'Showroom Quận 1' }),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockOrderId,
          orderNumber: 'ORD-2026-9999',
          storeId: mockStoreId,
          policyVersionId: 'pol-ver-1',
        }),
      },
      returnOrder: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        return callback(prisma);
      }),
    };

    eligibilityService = {
      checkOrderEligibility: jest.fn().mockResolvedValue(mockValidEligibility),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-uuid-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitReturnRequestUseCase,
        { provide: PrismaService, useValue: prisma },
        { provide: RmaEligibilityService, useValue: eligibilityService },
        { provide: OutboxWriterService, useValue: outboxWriter },
      ],
    }).compile();

    useCase = module.get<SubmitReturnRequestUseCase>(SubmitReturnRequestUseCase);
  });

  it('1. should throw BadRequestException when order is not eligible', async () => {
    eligibilityService.checkOrderEligibility.mockResolvedValue({
      ...mockValidEligibility,
      isEligible: false,
      ineligibleReasons: ['ORDER_NOT_DELIVERED'],
    });

    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('2. should throw BadRequestException when an item does not belong to the order', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      items: [
        {
          orderItemId: 'foreign-item-id',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      /không thuộc đơn hàng này/,
    );
  });

  it('3. should throw BadRequestException when requested quantity exceeds available quantity', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 5, // Exceeds available return quantity of 2
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      /vượt quá số lượng tối đa khả dụng/,
    );
  });

  it('4. should throw BadRequestException when DAMAGED_IN_TRANSIT lacks evidence video', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.DAMAGED_IN_TRANSIT,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
          // Missing evidenceVideoUrl!
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      /bắt buộc phải có video/,
    );
  });

  it('5. should throw BadRequestException when reason code is not allowed for the item', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.EXPIRED, // Not in allowed rules for this item
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      /không áp dụng được cho sản phẩm/,
    );
  });

  it('6. should throw BadRequestException or NotFoundException when STORE_DROPOFF has invalid showroom', async () => {
    prisma.store.findUnique.mockResolvedValue(null);

    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: 'invalid-store-id',
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('7. should throw BadRequestException when CARRIER_PICKUP lacks pickupAddress', async () => {
    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.CARRIER_PICKUP,
      // Missing pickupAddress!
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
        },
      ],
    };

    await expect(useCase.execute(mockCustomerId, dto)).rejects.toThrow(
      /Vui lòng cung cấp địa chỉ chi tiết/,
    );
  });

  it('8. should successfully submit return claim, create ReturnOrder and write Outbox Event (ACID)', async () => {
    const mockCreatedReturn = {
      id: 'ret-order-123',
      returnCode: 'RET-20261117-1234',
      orderId: mockOrderId,
      customerId: mockCustomerId,
      storeId: mockStoreId,
      status: ReturnOrderStatus.SUBMITTED,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      createdAt: new Date(),
      items: [
        {
          id: 'ret-item-1',
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        },
      ],
      order: {
        orderNumber: 'ORD-2026-9999',
      },
    };

    prisma.returnOrder.create.mockResolvedValue(mockCreatedReturn);

    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.STORE_DROPOFF,
      dropoffLocationId: mockStoreId,
      customerNote: 'Sản phẩm nguyên seal chưa bóc cần đổi trả',
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          evidenceImages: ['https://cdn.glowup.vn/evidence1.jpg'],
          customerNote: 'Hộp còn mới nguyên vẹn',
        },
      ],
    };

    const result = await useCase.execute(mockCustomerId, dto);

    expect(result).toBeDefined();
    expect(result.id).toBe('ret-order-123');
    expect(result.status).toBe(ReturnOrderStatus.SUBMITTED);

    // Verify Prisma create called with correct structure
    expect(prisma.returnOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: mockOrderId,
          customerId: mockCustomerId,
          status: ReturnOrderStatus.SUBMITTED,
          returnChannel: ReturnChannel.STORE_DROPOFF,
          dropoffLocationId: mockStoreId,
        }),
      }),
    );

    // Verify Outbox Event recorded (AC3)
    expect(outboxWriter.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        aggregateType: 'RETURN_ORDER',
        aggregateId: 'ret-order-123',
        eventType: 'RMA_REQUEST_SUBMITTED',
        payload: expect.objectContaining({
          returnOrderId: 'ret-order-123',
          customerId: mockCustomerId,
          orderId: mockOrderId,
          returnChannel: ReturnChannel.STORE_DROPOFF,
        }),
      }),
    );
  });

  it('9. should successfully submit ALLERGIC claim (DEC-05) with evidence image', async () => {
    const mockCreatedReturn = {
      id: 'ret-allergic-456',
      returnCode: 'RET-20261117-5678',
      orderId: mockOrderId,
      customerId: mockCustomerId,
      storeId: mockStoreId,
      status: ReturnOrderStatus.SUBMITTED,
      returnChannel: ReturnChannel.CARRIER_PICKUP,
      createdAt: new Date(),
      items: [
        {
          id: 'ret-item-2',
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
        },
      ],
      order: {
        orderNumber: 'ORD-2026-9999',
      },
    };

    prisma.returnOrder.create.mockResolvedValue(mockCreatedReturn);

    const dto: SubmitReturnRequestDto = {
      orderId: mockOrderId,
      returnChannel: ReturnChannel.CARRIER_PICKUP,
      pickupAddress: {
        recipientName: 'Nguyễn Văn A',
        phone: '0901234567',
        street: '123 Lê Lợi',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
      },
      customerNote: 'Da bị kích ứng mẩn đỏ sau khi dùng lần đầu',
      items: [
        {
          orderItemId: mockOrderItemId1,
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
          customerNote: 'Đã dùng dưới 20% dung tích chai',
          evidenceImages: [
            'https://cdn.glowup.vn/skin-irritation.jpg',
            'https://cdn.glowup.vn/bottle-usage.jpg',
          ],
        },
      ],
    };

    const result = await useCase.execute(mockCustomerId, dto);

    expect(result).toBeDefined();
    expect(result.id).toBe('ret-allergic-456');
    expect(outboxWriter.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'RMA_REQUEST_SUBMITTED',
      }),
    );
  });
});
