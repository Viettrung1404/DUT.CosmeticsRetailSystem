import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentRefundGatewayService } from '../payment-refund-gateway.service';
import { ReturnOrderStatus } from '../../../domain/entities/return-policy.entity';

describe('EP16-T03: PaymentRefundGatewayService Unit Tests', () => {
  let service: PaymentRefundGatewayService;
  let mockPrisma: any;
  let mockGatewayAdapter: any;

  beforeEach(() => {
    mockPrisma = {
      refund: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        update: jest.fn(),
      },
      loyaltyPointsTransaction: {
        create: jest.fn(),
      },
      returnOrder: {
        update: jest.fn(),
      },
      returnStatusHistory: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockGatewayAdapter = {
      executeRefund: jest.fn(),
    };

    service = new PaymentRefundGatewayService(
      mockPrisma,
      mockGatewayAdapter,
    );
  });

  const sampleRefund = {
    id: 'ref-uuid-1',
    orderId: 'ord-uuid-1',
    returnOrderId: 'ret-uuid-1',
    amount: 180000,
    reason: 'Hoàn tiền sau KCS',
    status: 'PENDING',
    order: {
      id: 'ord-uuid-1',
      customerId: 'cust-uuid-1',
      payments: [{ status: 'PAID', paymentMethod: 'VNPAY', transactionId: 'VNP-123456' }],
    },
    returnOrder: {
      id: 'ret-uuid-1',
      returnCode: 'RET-20261117-0001',
    },
    items: [
      {
        id: 'ri-1',
        amount: 180000,
        pointsRestored: 20,
      },
    ],
  };

  it('1. should execute refund successfully and restore points (AC1, AC3)', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(sampleRefund);
    mockGatewayAdapter.executeRefund.mockResolvedValue({
      success: true,
      gatewayTransactionId: 'VNPAY-REF-999999',
      message: 'Thành công',
    });
    mockPrisma.refund.update.mockResolvedValue({
      ...sampleRefund,
      status: 'COMPLETED',
      refundTransactionId: 'VNPAY-REF-999999',
    });

    const result = await service.executeRefund(
      'ref-uuid-1',
      'staff-uuid-1',
      'IDEM-KEY-001',
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.status).toBe('COMPLETED');
    expect(result.gatewayTransactionId).toBe('VNPAY-REF-999999');

    // Verify adapter called with VNPAY
    expect(mockGatewayAdapter.executeRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        refundId: 'ref-uuid-1',
        paymentMethod: 'VNPAY',
        amount: 180000,
      }),
    );

    // Verify customer loyalty points restored
    expect(mockPrisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'cust-uuid-1' },
      data: {
        totalPoints: { increment: 20 },
      },
    });

    // Verify ReturnOrder transitioned to COMPLETED
    expect(mockPrisma.returnOrder.update).toHaveBeenCalledWith({
      where: { id: 'ret-uuid-1' },
      data: expect.objectContaining({
        status: ReturnOrderStatus.COMPLETED,
      }),
    });

    // Verify Outbox Event created
    expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'REFUND_COMPLETED',
        aggregateId: 'ref-uuid-1',
      }),
    });
  });

  it('2. should be idempotent: returns existing completed refund without re-calling gateway (TC-RMA-12, AC1)', async () => {
    const completedRefund = {
      ...sampleRefund,
      status: 'COMPLETED',
      refundTransactionId: 'VNPAY-REF-ALREADY-DONE',
    };
    mockPrisma.refund.findUnique.mockResolvedValue(completedRefund);

    const result = await service.executeRefund(
      'ref-uuid-1',
      'staff-uuid-1',
      'IDEM-KEY-001',
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe('COMPLETED');
    expect(result.gatewayTransactionId).toBe('VNPAY-REF-ALREADY-DONE');
    // Crucial: Gateway adapter was NOT called again
    expect(mockGatewayAdapter.executeRefund).not.toHaveBeenCalled();
  });

  it('3. should handle gateway network/5xx error safely without crashing (TC-RMA-11, AC2)', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(sampleRefund);
    mockGatewayAdapter.executeRefund.mockRejectedValue(
      new Error('Connection timeout to VNPay gateway (504)'),
    );
    mockPrisma.refund.update.mockResolvedValue({
      ...sampleRefund,
      status: 'PROCESSING',
    });

    const result = await service.executeRefund(
      'ref-uuid-1',
      'staff-uuid-1',
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe('PROCESSING');
    expect(result.message).toContain('Connection timeout to VNPay gateway');

    // Verify refund status updated to PROCESSING for reconciliation
    expect(mockPrisma.refund.update).toHaveBeenCalledWith({
      where: { id: 'ref-uuid-1' },
      data: expect.objectContaining({
        status: 'PROCESSING',
      }),
    });
  });

  it('4. should handle gateway decline gracefully', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(sampleRefund);
    mockGatewayAdapter.executeRefund.mockResolvedValue({
      success: false,
      message: 'Tài khoản nguồn không đủ số dư để hoàn tiền',
    });
    mockPrisma.refund.update.mockResolvedValue({
      ...sampleRefund,
      status: 'PROCESSING',
    });

    const result = await service.executeRefund(
      'ref-uuid-1',
      'staff-uuid-1',
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe('PROCESSING');
    expect(result.message).toContain('không đủ số dư');
  });

  it('5. should approve refund successfully when in PENDING status', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(sampleRefund);
    mockPrisma.refund.update.mockResolvedValue({
      ...sampleRefund,
      status: 'APPROVED',
      processedBy: 'manager-1',
    });

    const result = await service.approveRefund('ref-uuid-1', 'manager-1');
    expect(result.status).toBe('APPROVED');
  });

  it('6. should reject approveRefund if status is not PENDING', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue({
      ...sampleRefund,
      status: 'COMPLETED',
    });

    await expect(
      service.approveRefund('ref-uuid-1', 'manager-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('7. should throw NotFoundException when refund not found', async () => {
    mockPrisma.refund.findUnique.mockResolvedValue(null);

    await expect(
      service.executeRefund('unknown-id', 'staff-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
