import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExchangeSettlementService } from '../exchange-settlement.service';
import { RefundCalculatorService } from '../refund-calculator.service';
import { AtpCalculatorService } from '../../../../inventory/application/services/atp-calculator.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../../domain/entities/return-policy.entity';

describe('ExchangeSettlementService Unit Tests', () => {
  let service: ExchangeSettlementService;
  let prisma: any;
  let refundCalculatorService: any;
  let atpCalculatorService: any;

  const mockReturnOrder = {
    id: 'ret-1',
    returnCode: 'RET-20261117-001',
    orderId: 'ord-src-1',
    customerId: 'cust-1',
    storeId: 'store-1',
    policyVersionId: 'pol-1',
    returnChannel: 'STORE_DROPOFF',
    status: ReturnOrderStatus.RESOLUTION_PENDING,
    order: {
      id: 'ord-src-1',
      orderNumber: 'ORD-SRC-001',
      payments: [
        {
          id: 'pay-src-1',
          paymentMethod: 'VNPAY',
          amount: 500000,
          status: 'CAPTURED',
        },
      ],
      items: [
        {
          id: 'oi-1',
          productVariantId: 'var-old-1',
          productName: 'Serum Cũ 200k',
          quantity: 1,
          unitPrice: 200000,
          totalPrice: 200000,
        },
      ],
    },
    items: [
      {
        id: 'ri-1',
        orderItemId: 'oi-1',
        productVariantId: 'var-old-1',
        quantity: 1,
        inspectionStatus: ReturnInspectionStatus.PASSED,
        reasonCode: 'DEFECTIVE',
      },
    ],
    settlement: null,
  };

  const mockVariant200k = {
    id: 'var-new-200k',
    sku: 'SKU-NEW-200K',
    price: 200000,
    costPrice: 80000,
    option1Value: '30ml',
    isActive: true,
    product: { name: 'Kem Mới 200k' },
  };

  const mockVariant350k = {
    id: 'var-new-350k',
    sku: 'SKU-NEW-350K',
    price: 350000,
    costPrice: 150000,
    option1Value: '50ml',
    isActive: true,
    product: { name: 'Kem Mới 350k' },
  };

  const mockVariant150k = {
    id: 'var-new-150k',
    sku: 'SKU-NEW-150K',
    price: 150000,
    costPrice: 60000,
    option1Value: '20ml',
    isActive: true,
    product: { name: 'Kem Mới 150k' },
  };

  beforeEach(async () => {
    prisma = {
      returnOrder: {
        findUnique: jest.fn().mockResolvedValue(mockReturnOrder),
        update: jest.fn().mockResolvedValue({
          ...mockReturnOrder,
          status: ReturnOrderStatus.COMPLETED,
        }),
      },
      productVariant: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const ids = where.id.in;
          const res: any[] = [];
          if (ids.includes('var-new-200k')) res.push(mockVariant200k);
          if (ids.includes('var-new-350k')) res.push(mockVariant350k);
          if (ids.includes('var-new-150k')) res.push(mockVariant150k);
          return Promise.resolve(res);
        }),
      },
      inventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            quantity: 50,
            reservedQuantity: 0,
            safetyStock: 0,
            quarantinedQuantity: 0,
            damagedQuantity: 0,
          },
        ]),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'ord-repl-1',
          ...data,
        })),
      },
      exchangeSettlement: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'stl-1',
          ...data,
        })),
        findUnique: jest.fn().mockResolvedValue({
          id: 'stl-1',
          returnOrderId: 'ret-1',
          replacementOrderId: 'ord-repl-1',
          returnCredit: 200000,
          replacementPayable: 200000,
          creditApplied: 200000,
          additionalDue: 0,
          refundDue: 0,
          status: 'SETTLED',
        }),
      },
      exchangeItem: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'pay-repl-1',
          ...data,
        })),
      },
      refund: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'ref-excess-1',
          ...data,
        })),
      },
      exchangeFunding: {
        create: jest.fn().mockResolvedValue({ id: 'fund-1' }),
      },
      returnStatusHistory: {
        create: jest.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    refundCalculatorService = {
      calculateRefund: jest.fn().mockReturnValue({
        netRefundAmount: 200000,
        items: [
          {
            orderItemId: 'oi-1',
            returnItemId: 'ri-1',
            productVariantId: 'var-old-1',
            productName: 'Serum Cũ 200k',
            quantity: 1,
            lineRefundCash: 200000,
          },
        ],
      }),
    };

    atpCalculatorService = {
      calculateAtp: jest.fn().mockReturnValue(50),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeSettlementService,
        { provide: PrismaService, useValue: prisma },
        { provide: RefundCalculatorService, useValue: refundCalculatorService },
        { provide: AtpCalculatorService, useValue: atpCalculatorService },
      ],
    }).compile();

    service = module.get<ExchangeSettlementService>(ExchangeSettlementService);
  });

  describe('calculateExchangeQuote (EP17-T01)', () => {
    it('1. Đổi ngang giá (P = C): additionalDue = 0, refundDue = 0 (TC-RMA-13)', async () => {
      const quote = await service.calculateExchangeQuote('ret-1', [
        { productVariantId: 'var-new-200k', quantity: 1 },
      ]);

      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(200000);
      expect(quote.creditApplied).toBe(200000);
      expect(quote.additionalDue).toBe(0);
      expect(quote.refundDue).toBe(0);
      expect(quote.replacementItems).toHaveLength(1);
    });

    it('2. Đổi sản phẩm giá cao hơn (P > C): additionalDue = P - C, refundDue = 0 (TC-RMA-14)', async () => {
      const quote = await service.calculateExchangeQuote('ret-1', [
        { productVariantId: 'var-new-350k', quantity: 1 },
      ]);

      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(350000);
      expect(quote.creditApplied).toBe(200000);
      expect(quote.additionalDue).toBe(150000);
      expect(quote.refundDue).toBe(0);
    });

    it('3. Đổi sản phẩm giá thấp hơn (P < C): refundDue = C - P, additionalDue = 0 (TC-RMA-15)', async () => {
      const quote = await service.calculateExchangeQuote('ret-1', [
        { productVariantId: 'var-new-150k', quantity: 1 },
      ]);

      expect(quote.returnCredit).toBe(200000);
      expect(quote.replacementPayable).toBe(150000);
      expect(quote.creditApplied).toBe(150000);
      expect(quote.additionalDue).toBe(0);
      expect(quote.refundDue).toBe(50000);
    });

    it('4. Ném BadRequestException nếu danh sách sản phẩm mới rỗng', async () => {
      await expect(service.calculateExchangeQuote('ret-1', [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('5. Ném NotFoundException nếu không tìm thấy ReturnOrder', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue(null);
      await expect(
        service.calculateExchangeQuote('non-existent', [
          { productVariantId: 'var-new-200k', quantity: 1 },
        ]),
      ).rejects.toThrow(NotFoundException);
    });

    it('6. Ném BadRequestException nếu sản phẩm mới đã ngừng kinh doanh', async () => {
      prisma.productVariant.findMany.mockResolvedValue([
        {
          ...mockVariant200k,
          isActive: false,
        },
      ]);

      await expect(
        service.calculateExchangeQuote('ret-1', [
          { productVariantId: 'var-new-200k', quantity: 1 },
        ]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReplacementOrder (EP17-T02)', () => {
    it('1. Đổi ngang giá: tạo đơn EXCHANGE, status SETTLED, creditApplied = 200k (TC-RMA-13)', async () => {
      const result = await service.createReplacementOrder(
        'ret-1',
        'operator-uuid',
        {
          replacementItems: [{ productVariantId: 'var-new-200k', quantity: 1 }],
        },
      );

      expect(result.settlement).toBeDefined();
      expect(result.settlement.creditApplied).toBe(200000);
      expect(result.settlement.additionalDue).toBe(0);
      expect(result.settlement.refundDue).toBe(0);
      expect(result.replacementOrder.orderType).toBe('EXCHANGE');
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: 'EXCHANGE_CREDIT',
            amount: 200000,
            status: 'COMPLETED',
          }),
        }),
      );
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'EXCHANGE_REPLACEMENT_ORDER_CREATED',
          }),
        }),
      );
    });

    it('2. Đổi giá cao hơn: tạo đơn EXCHANGE với Payment COD cho khoản additionalDue (TC-RMA-14)', async () => {
      const result = await service.createReplacementOrder(
        'ret-1',
        'operator-uuid',
        {
          replacementItems: [{ productVariantId: 'var-new-350k', quantity: 1 }],
          paymentMethod: 'COD',
        },
      );

      expect(result.settlement.additionalDue).toBe(150000);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: 'COD',
            amount: 150000,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('3. Đổi giá thấp hơn: tự động sinh Refund PENDING cho refundDue (TC-RMA-15)', async () => {
      const result = await service.createReplacementOrder(
        'ret-1',
        'operator-uuid',
        {
          replacementItems: [{ productVariantId: 'var-new-150k', quantity: 1 }],
        },
      );

      expect(result.settlement.refundDue).toBe(50000);
      expect(prisma.refund.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 50000,
            status: 'PENDING',
          }),
        }),
      );
      expect(result.excessRefund).toBeDefined();
    });

    it('4. Chặn tạo đơn khi hết hàng tồn ATP (TC-RMA-16, AC1)', async () => {
      atpCalculatorService.calculateAtp.mockReturnValue(0);

      await expect(
        service.createReplacementOrder('ret-1', 'operator-uuid', {
          replacementItems: [{ productVariantId: 'var-new-200k', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. Chặn tạo trùng lặp nếu hồ sơ đã có ExchangeSettlement', async () => {
      prisma.returnOrder.findUnique.mockResolvedValue({
        ...mockReturnOrder,
        settlement: { id: 'existing-stl-1', replacementOrderId: 'ord-old-repl' },
      });

      await expect(
        service.createReplacementOrder('ret-1', 'operator-uuid', {
          replacementItems: [{ productVariantId: 'var-new-200k', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getExchangeSettlementByReturnOrderId', () => {
    it('trả về bản ghi ExchangeSettlement kèm quan hệ', async () => {
      const result = await service.getExchangeSettlementByReturnOrderId('ret-1');
      expect(result.id).toBe('stl-1');
      expect(prisma.exchangeSettlement.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { returnOrderId: 'ret-1' },
        }),
      );
    });

    it('ném NotFoundException nếu không tìm thấy settlement', async () => {
      prisma.exchangeSettlement.findUnique.mockResolvedValue(null);
      await expect(
        service.getExchangeSettlementByReturnOrderId('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
