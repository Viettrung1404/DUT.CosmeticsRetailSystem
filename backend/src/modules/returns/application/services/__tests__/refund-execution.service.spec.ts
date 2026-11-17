import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RefundExecutionService } from '../refund-execution.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
  ReturnReasonCode,
} from '../../../domain/entities/return-policy.entity';

describe('EP16-T02: RefundExecutionService Unit Tests', () => {
  let service: RefundExecutionService;
  let mockPrisma: any;
  let mockRefundCalculatorService: any;

  beforeEach(() => {
    mockPrisma = {
      returnOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refund: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      refundItem: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      returnOrderItem: {
        update: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockRefundCalculatorService = {
      calculateRefund: jest.fn(),
    };

    service = new RefundExecutionService(
      mockPrisma,
      mockRefundCalculatorService,
    );
  });

  const sampleReturnOrder = {
    id: 'ret-1',
    returnCode: 'RET-20261117-0001',
    orderId: 'ord-1',
    status: ReturnOrderStatus.RESOLUTION_PENDING,
    returnChannel: 'STORE_DROPOFF',
    order: {
      id: 'ord-1',
      totalAmount: 500000,
      items: [
        {
          id: 'order-item-1',
          productVariantId: 'var-1',
          productName: 'Kem Dưỡng Da',
          quantity: 2,
          unitPrice: 250000,
          totalPrice: 500000,
        },
      ],
      customer: { id: 'cust-1' },
      payments: [{ status: 'PAID', paymentMethod: 'VNPAY' }],
    },
    items: [
      {
        id: 'return-item-1',
        orderItemId: 'order-item-1',
        productVariantId: 'var-1',
        quantity: 1,
        reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        inspectionStatus: ReturnInspectionStatus.PASSED,
      },
    ],
  };

  it('1. should create refund and refund_items successfully for passed items', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);
    mockPrisma.refundItem.findMany.mockResolvedValue([]); // No previous refunds
    mockRefundCalculatorService.calculateRefund.mockReturnValue({
      items: [
        {
          orderItemId: 'order-item-1',
          returnItemId: 'return-item-1',
          quantity: 1,
          lineRefundCash: 250000,
          unitNetRefundPrice: 250000,
          pointsToRestore: 0,
        },
      ],
      grossRefundAmount: 250000,
      deductedShippingFee: 0,
      netRefundAmount: 250000,
      totalPointsToRestore: 0,
    });
    mockPrisma.refund.create.mockResolvedValue({
      id: 'ref-1',
      amount: 250000,
      status: 'PENDING',
    });
    mockPrisma.returnOrder.update.mockResolvedValue({
      ...sampleReturnOrder,
      refundAmount: 250000,
    });

    const result = await service.createRefundForReturn(
      'ret-1',
      'staff-user-1',
      { notes: 'Hoàn tiền 1 hũ kem' },
    );

    expect(result).toBeDefined();
    expect(result.refund.id).toBe('ref-1');
    expect(result.calculation.netRefundAmount).toBe(250000);

    // Verify refund created
    expect(mockPrisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'ord-1',
        returnOrderId: 'ret-1',
        amount: 250000,
        status: 'PENDING',
      }),
    });

    // Verify refund_items created
    expect(mockPrisma.refundItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        refundId: 'ref-1',
        orderItemId: 'order-item-1',
        returnItemId: 'return-item-1',
        quantity: 1,
        amount: 250000,
      }),
    });

    // Verify Outbox Event created
    expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'REFUND_ORDER_ITEM_RECORDED',
        aggregateId: 'ref-1',
      }),
    });
  });

  it('2. should reject duplicate refund when item is already fully refunded (AC1)', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue(sampleReturnOrder);
    // Already refunded 2 units previously
    mockPrisma.refundItem.findMany.mockResolvedValue([
      { orderItemId: 'order-item-1', quantity: 2, amount: 500000 },
    ]);

    await expect(
      service.createRefundForReturn('ret-1', 'staff-user-1'),
    ).rejects.toThrow('đã được hoàn trả toàn bộ số lượng');
  });

  it('3. should reject when ReturnOrder is not in RESOLUTION_PENDING', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue({
      ...sampleReturnOrder,
      status: ReturnOrderStatus.SUBMITTED,
    });

    await expect(
      service.createRefundForReturn('ret-1', 'staff-user-1'),
    ).rejects.toThrow(
      "Không thể tạo lệnh hoàn tiền ở trạng thái 'SUBMITTED'",
    );
  });

  it('4. should reject when no items passed KCS inspection', async () => {
    mockPrisma.returnOrder.findUnique.mockResolvedValue({
      ...sampleReturnOrder,
      items: [
        {
          id: 'return-item-1',
          orderItemId: 'order-item-1',
          quantity: 1,
          inspectionStatus: ReturnInspectionStatus.FAILED, // Failed!
        },
      ],
    });

    await expect(
      service.createRefundForReturn('ret-1', 'staff-user-1'),
    ).rejects.toThrow('Không có sản phẩm nào đạt tiêu chuẩn kiểm định KCS (PASSED)');
  });

  it('5. should get refund by ID with details', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue({
      id: 'ref-1',
      amount: 250000,
      items: [],
    });

    const res = await service.getRefundById('ref-1');
    expect(res).toBeDefined();
    expect(res.id).toBe('ref-1');
  });

  it('6. should throw NotFoundException when refund does not exist', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(null);

    await expect(service.getRefundById('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
