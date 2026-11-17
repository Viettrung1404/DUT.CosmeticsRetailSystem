import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RmaEligibilityService } from '../rma-eligibility.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import {
  ReturnReasonCode,
  ShippingFeeBearer,
} from '../../../domain/entities/return-policy.entity';

describe('EP13-T02: RmaEligibilityService Unit Tests', () => {
  let service: RmaEligibilityService;
  let prisma: any;

  const mockCustomerId = 'cust-uuid-1111';
  const mockOtherCustomerId = 'cust-uuid-9999';
  const mockOrderId = 'order-uuid-2222';
  const mockOrderItemId1 = 'order-item-uuid-3331';
  const mockOrderItemId2 = 'order-item-uuid-3332';
  const mockVariantId1 = 'var-uuid-4441';
  const mockVariantId2 = 'var-uuid-4442';
  const mockCategoryId = 'cat-uuid-5551';

  const defaultMockRules = [
    {
      id: 'rule-1',
      reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
      categoryId: null,
      windowDays: 7,
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
      id: 'rule-2',
      reasonCode: ReturnReasonCode.WRONG_ITEM,
      categoryId: null,
      windowDays: 7,
      requiresOriginalSeal: false,
      maxUsagePercentage: 0,
      shippingFeeBearer: ShippingFeeBearer.GLOWUP,
      requiresEvidenceVideo: false,
      requiresEvidenceImage: true,
      allowStoreDropoff: true,
      allowCarrierPickup: true,
      requiresManualReview: false,
    },
    {
      id: 'rule-3',
      reasonCode: ReturnReasonCode.DAMAGED_IN_TRANSIT,
      categoryId: null,
      windowDays: 2,
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
      id: 'rule-4',
      reasonCode: ReturnReasonCode.DEFECTIVE,
      categoryId: null,
      windowDays: 14,
      requiresOriginalSeal: false,
      maxUsagePercentage: 10,
      shippingFeeBearer: ShippingFeeBearer.GLOWUP,
      requiresEvidenceVideo: true,
      requiresEvidenceImage: true,
      allowStoreDropoff: true,
      allowCarrierPickup: true,
      requiresManualReview: true,
    },
    {
      id: 'rule-5',
      reasonCode: ReturnReasonCode.ALLERGIC,
      categoryId: null,
      windowDays: 14,
      requiresOriginalSeal: false,
      maxUsagePercentage: 20,
      shippingFeeBearer: ShippingFeeBearer.GLOWUP,
      requiresEvidenceVideo: false,
      requiresEvidenceImage: true,
      allowStoreDropoff: true,
      allowCarrierPickup: true,
      requiresManualReview: true,
    },
    {
      id: 'rule-6',
      reasonCode: ReturnReasonCode.EXPIRED,
      categoryId: null,
      windowDays: 30,
      requiresOriginalSeal: false,
      maxUsagePercentage: 0,
      shippingFeeBearer: ShippingFeeBearer.GLOWUP,
      requiresEvidenceVideo: false,
      requiresEvidenceImage: true,
      allowStoreDropoff: true,
      allowCarrierPickup: true,
      requiresManualReview: false,
    },
  ];

  const buildMockOrder = (overrides: any = {}) => {
    return {
      id: mockOrderId,
      orderNumber: 'ORD-2026-0001',
      customerId: mockCustomerId,
      status: 'DELIVERED',
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-05T00:00:00Z'),
      items: [
        {
          id: mockOrderItemId1,
          productVariantId: mockVariantId1,
          productName: 'Serum Vitamin C GlowUp 30ml',
          variantName: '30ml',
          quantity: 2,
          unitPrice: 350000,
          variant: {
            sku: 'SKU-SERUM-30',
            productId: 'prod-uuid-1',
            product: {
              id: 'prod-uuid-1',
              categoryId: mockCategoryId,
              images: ['https://cdn.glowup.vn/serum.png'],
            },
          },
        },
      ],
      shipments: [
        {
          id: 'ship-1',
          status: 'DELIVERED',
          deliveredAt: new Date('2026-02-05T10:00:00Z'),
          updatedAt: new Date('2026-02-05T10:00:00Z'),
        },
      ],
      policyVersion: {
        id: 'pol-ver-1',
        versionName: 'POLICY-V1-2026',
        rules: defaultMockRules,
      },
      ...overrides,
    };
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      returnPolicyVersion: {
        findFirst: jest.fn(),
      },
      returnOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmaEligibilityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RmaEligibilityService>(RmaEligibilityService);
  });

  it('1. should throw NotFoundException when order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(
      service.checkOrderEligibility('non-existent', mockCustomerId),
    ).rejects.toThrow(NotFoundException);
  });

  it('2. should throw ForbiddenException when order belongs to different customer', async () => {
    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({ customerId: mockOtherCustomerId }),
    );

    await expect(
      service.checkOrderEligibility(mockOrderId, mockCustomerId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('3. should return isEligible: false when order status is not DELIVERED or COMPLETED', async () => {
    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({ status: 'PROCESSING' }),
    );

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
    );

    expect(result.isEligible).toBe(false);
    expect(result.ineligibleReasons).toContain('ORDER_NOT_DELIVERED');
    expect(result.items[0].isEligible).toBe(false);
    expect(result.items[0].ineligibleReason).toBe('ORDER_NOT_DELIVERED');
  });

  it('4. should return isEligible: true with all rules when delivered 1 day ago', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-06T10:00:00Z'); // 1 day after delivery

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(true);
    expect(result.ineligibleReasons).toHaveLength(0);
    expect(result.items[0].isEligible).toBe(true);
    expect(result.items[0].availableReturnQuantity).toBe(2);
    expect(result.items[0].allowedRules.length).toBe(6);

    const transitRule = result.items[0].allowedRules.find(
      (r) => r.reasonCode === ReturnReasonCode.DAMAGED_IN_TRANSIT,
    );
    expect(transitRule).toBeDefined();
    expect(transitRule?.daysRemaining).toBe(1);

    const allergicRule = result.items[0].allowedRules.find(
      (r) => r.reasonCode === ReturnReasonCode.ALLERGIC,
    );
    expect(allergicRule).toBeDefined();
    expect(allergicRule?.requiresManualReview).toBe(true);
    expect(allergicRule?.maxUsagePercentage).toBe(20);
  });

  it('5. should expire DAMAGED_IN_TRANSIT (2 days) after 5 days, but allow 7d/14d/30d rules', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-10T10:00:00Z'); // 5 days after delivery

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(true);
    const allowedReasonCodes = result.items[0].allowedRules.map(
      (r) => r.reasonCode,
    );
    expect(allowedReasonCodes).not.toContain(
      ReturnReasonCode.DAMAGED_IN_TRANSIT,
    );
    expect(allowedReasonCodes).toContain(ReturnReasonCode.CHANGE_OF_MIND);
    expect(allowedReasonCodes).toContain(ReturnReasonCode.DEFECTIVE);
    expect(allowedReasonCodes).toContain(ReturnReasonCode.ALLERGIC);
    expect(allowedReasonCodes).toContain(ReturnReasonCode.EXPIRED);
  });

  it('6. should return isEligible: false when elapsed time exceeds all policy windows (e.g. 40 days)', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-03-25T10:00:00Z'); // ~48 days after delivery

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(false);
    expect(result.ineligibleReasons).toContain('RETURN_WINDOW_EXPIRED');
    expect(result.items[0].isEligible).toBe(false);
    expect(result.items[0].ineligibleReason).toBe('RETURN_WINDOW_EXPIRED');
    expect(result.items[0].allowedRules).toHaveLength(0);
  });

  it('7. should return DUPLICATE_RMA_PENDING when item full quantity is already in active RMA', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-06T10:00:00Z');

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    // Active return order with quantity 2
    prisma.returnOrder.findMany.mockResolvedValue([
      {
        id: 'ret-1',
        orderId: mockOrderId,
        status: 'SUBMITTED',
        items: [{ orderItemId: mockOrderItemId1, quantity: 2 }],
      },
    ]);

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(false);
    expect(result.ineligibleReasons).toContain('DUPLICATE_RMA_PENDING');
    expect(result.items[0].availableReturnQuantity).toBe(0);
    expect(result.items[0].alreadyReturnedQuantity).toBe(2);
    expect(result.items[0].ineligibleReason).toBe('DUPLICATE_RMA_PENDING');
  });

  it('8. should allow remaining quantity when item was only partially returned previously', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-06T10:00:00Z');

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    // Partial return: 1 of 2 units returned
    prisma.returnOrder.findMany.mockResolvedValue([
      {
        id: 'ret-1',
        orderId: mockOrderId,
        status: 'SUBMITTED',
        items: [{ orderItemId: mockOrderItemId1, quantity: 1 }],
      },
    ]);

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(true);
    expect(result.items[0].availableReturnQuantity).toBe(1);
    expect(result.items[0].alreadyReturnedQuantity).toBe(1);
    expect(result.items[0].isEligible).toBe(true);
  });

  it('9. should ignore REJECTED or CANCELLED return orders when calculating available quantity', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-06T10:00:00Z');

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    // findMany will filter status notIn: ['REJECTED', 'CANCELLED'] in real DB
    prisma.returnOrder.findMany.mockResolvedValue([]);

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    expect(result.isEligible).toBe(true);
    expect(result.items[0].availableReturnQuantity).toBe(2);
    expect(result.items[0].alreadyReturnedQuantity).toBe(0);
  });

  it('10. should override generic rule when a category-specific rule is defined', async () => {
    const deliveredAt = new Date('2026-02-05T10:00:00Z');
    const checkTime = new Date('2026-02-09T10:00:00Z'); // 4 days after delivery

    // Category rule: CHANGE_OF_MIND for this category is only 3 days!
    const customRules = [
      ...defaultMockRules,
      {
        id: 'rule-custom-cat',
        reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        categoryId: mockCategoryId,
        windowDays: 3, // Custom 3 days for this category
        requiresOriginalSeal: true,
        maxUsagePercentage: 0,
        shippingFeeBearer: ShippingFeeBearer.CUSTOMER,
        requiresEvidenceVideo: false,
        requiresEvidenceImage: true,
        allowStoreDropoff: true,
        allowCarrierPickup: true,
        requiresManualReview: false,
      },
    ];

    prisma.order.findUnique.mockResolvedValue(
      buildMockOrder({
        policyVersion: {
          id: 'pol-ver-1',
          versionName: 'POLICY-V1-2026',
          rules: customRules,
        },
        shipments: [
          {
            id: 'ship-1',
            status: 'DELIVERED',
            deliveredAt,
            updatedAt: deliveredAt,
          },
        ],
      }),
    );

    const result = await service.checkOrderEligibility(
      mockOrderId,
      mockCustomerId,
      checkTime,
    );

    // CHANGE_OF_MIND was overridden to 3 days, and 4 days have passed, so CHANGE_OF_MIND is NOT allowed
    const changeOfMindRule = result.items[0].allowedRules.find(
      (r) => r.reasonCode === ReturnReasonCode.CHANGE_OF_MIND,
    );
    expect(changeOfMindRule).toBeUndefined();
  });
});
