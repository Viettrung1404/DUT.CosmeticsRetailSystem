import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ShippingQuoteService } from '../../services/shipping-quote.service';
import { HybridOrderRouter } from '../../routing/hybrid-order-router';
import { InventoryReservationService } from '@modules/inventory/application/services/inventory-reservation.service';
import { OUTBOX_WRITER } from '@modules/async-infrastructure';
import { CreateOrderUseCase, CreateOrderOmsInput } from '../create-order.use-case';

describe('CreateOrderUseCase (OMS Multi-Fulfillment & ACID Reservation)', () => {
  let useCase: CreateOrderUseCase;
  let prisma: any;
  let shippingQuoteService: any;
  let hybridOrderRouter: any;
  let inventoryReservationService: any;
  let outboxWriter: any;

  const mockVariantA = {
    id: 'var-a-id',
    sku: 'SKU-SERUM-A',
    price: 300000,
    costPrice: 150000,
    isActive: true,
    product: { id: 'prod-1', name: 'Serum Dưỡng Trắng' },
  };

  const mockVariantB = {
    id: 'var-b-id',
    sku: 'SKU-KEM-B',
    price: 350000,
    costPrice: 180000,
    isActive: true,
    product: { id: 'prod-2', name: 'Kem Dưỡng Ẩm' },
  };

  beforeEach(async () => {
    // Mock Transaction Client
    const txMock = {
      order: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'order-123-uuid',
          ...args.data,
        })),
      },
      orderItem: {
        create: jest.fn().mockImplementation((args) => ({
          id: `item-${Math.random()}`,
          ...args.data,
        })),
      },
      fulfillmentOrder: {
        create: jest.fn().mockImplementation((args) => ({
          id: `fo-${Math.random()}`,
          ...args.data,
        })),
        update: jest.fn().mockImplementation((args) => ({
          id: args.where.id,
          ...args.data,
        })),
      },
      fulfillmentOrderItem: {
        create: jest.fn().mockImplementation((args) => ({
          id: `foi-${Math.random()}`,
          ...args.data,
        })),
      },
    };

    prisma = {
      productVariant: {
        findMany: jest.fn().mockImplementation((args) => {
          const ids = args?.where?.id?.in || [];
          return [mockVariantA, mockVariantB].filter((v) => ids.includes(v.id));
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(txMock);
      }),
      _txMock: txMock,
    };

    shippingQuoteService = {
      validateQuote: jest.fn().mockResolvedValue({
        quoteGroupId: 'quote-group-id',
        estimatedFee: 22000,
        isAvailable: true,
      }),
    };

    hybridOrderRouter = {
      routeOrder: jest.fn(),
    };

    inventoryReservationService = {
      createReservation: jest.fn(),
    };

    outboxWriter = {
      record: jest.fn().mockResolvedValue({ id: 'outbox-event-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: PrismaService, useValue: prisma },
        { provide: ShippingQuoteService, useValue: shippingQuoteService },
        { provide: HybridOrderRouter, useValue: hybridOrderRouter },
        { provide: InventoryReservationService, useValue: inventoryReservationService },
        { provide: OUTBOX_WRITER, useValue: outboxWriter },
      ],
    }).compile();

    useCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
  });

  // =========================================================================
  // ACCEPTANCE CRITERIA 1: Split Fulfillment -> 1 Parent Order, 2 Child FOs
  // =========================================================================
  describe('Acceptance Criteria 1: Đơn hàng tách kho (Split Fulfillment)', () => {
    it('phải tạo thành công 1 Order cha và 2 Fulfillment Orders con, mỗi FO có mã reservation riêng', async () => {
      // Giả lập HybridOrderRouter trả về kế hoạch chia 2 kho: Kho Tân Bình + Showroom Quận 1
      hybridOrderRouter.routeOrder.mockResolvedValue({
        planType: 'SPLIT_FULFILLMENT',
        isSplit: true,
        fulfillmentOrders: [
          {
            sourceLocationId: 'wh-tb-id',
            sourceLocationName: 'Tổng kho Tân Bình',
            sourceLocationType: 'WAREHOUSE',
            shippingServiceCode: 'STANDARD',
            items: [{ variantId: 'var-a-id', quantity: 2 }],
            estimatedShippingFee: 22000,
          },
          {
            sourceLocationId: 'store-q1-id',
            sourceLocationName: 'GlowUp Showroom Quận 1',
            sourceLocationType: 'STORE',
            shippingServiceCode: 'STANDARD',
            items: [{ variantId: 'var-b-id', quantity: 1 }],
            estimatedShippingFee: 22000,
          },
        ],
        totalShippingFee: 44000,
        companySubsidizedFee: 22000,
        customerShippingFee: 22000,
      });

      // Mock reservation cho từng FO
      inventoryReservationService.createReservation
        .mockResolvedValueOnce({
          id: 'res-fo-1-id',
          orderId: 'order-123-uuid',
          fulfillmentOrderId: 'fo-1',
          locationId: 'wh-tb-id',
          status: 'ACTIVE',
        })
        .mockResolvedValueOnce({
          id: 'res-fo-2-id',
          orderId: 'order-123-uuid',
          fulfillmentOrderId: 'fo-2',
          locationId: 'store-q1-id',
          status: 'ACTIVE',
        });

      const input: CreateOrderOmsInput = {
        customerId: 'cust-123',
        paymentMethod: 'COD',
        shippingServiceCode: 'STANDARD',
        quoteGroupId: 'quote-group-123',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
          addressLine: '123 Nguyễn Huệ',
        },
        items: [
          { variantId: 'var-a-id', quantity: 2 },
          { variantId: 'var-b-id', quantity: 1 },
        ],
      };

      const result = await useCase.execute(input);

      // 1. Kiểm tra Order cha
      expect(result.orderId).toBe('order-123-uuid');
      expect(result.status).toBe('CONFIRMED'); // COD
      expect(result.isSplit).toBe(true);
      expect(result.subtotal).toBe(950000); // 300k * 2 + 350k * 1 = 950.000đ
      expect(result.shippingFee).toBe(22000); // Khách chỉ trả 1 lần cước
      expect(result.totalAmount).toBe(972000);

      // 2. Kiểm tra 2 Fulfillment Orders con
      expect(result.fulfillmentOrders.length).toBe(2);

      const fo1 = result.fulfillmentOrders[0];
      expect(fo1.sourceLocationId).toBe('wh-tb-id');
      expect(fo1.status).toBe('ALLOCATED');
      expect(fo1.reservationId).toBe('res-fo-1-id');
      expect(fo1.fulfillmentOrderNumber).toContain('-FO01');
      expect(fo1.totalItemsCount).toBe(2);

      const fo2 = result.fulfillmentOrders[1];
      expect(fo2.sourceLocationId).toBe('store-q1-id');
      expect(fo2.status).toBe('ALLOCATED');
      expect(fo2.reservationId).toBe('res-fo-2-id');
      expect(fo2.fulfillmentOrderNumber).toContain('-FO02');
      expect(fo2.totalItemsCount).toBe(1);

      // 3. Kiểm tra Outbox Event ORDER_RESERVED
      expect(outboxWriter.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          aggregateType: 'ORDER',
          aggregateId: 'order-123-uuid',
          eventType: 'ORDER_RESERVED',
          payload: expect.objectContaining({
            isSplit: true,
            fulfillmentOrdersCount: 2,
            companySubsidizedFee: 22000,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // ACCEPTANCE CRITERIA 2: Rollback on Reservation Failure (ACID Protection)
  // =========================================================================
  describe('Acceptance Criteria 2: Rollback toàn bộ đơn hàng khi lỗi giữ chỗ kho con', () => {
    it('phải rollback 100% giao dịch khi FO thứ 2 bị lỗi thiếu tồn kho (ConflictException)', async () => {
      hybridOrderRouter.routeOrder.mockResolvedValue({
        planType: 'SPLIT_FULFILLMENT',
        isSplit: true,
        fulfillmentOrders: [
          {
            sourceLocationId: 'wh-tb-id',
            sourceLocationName: 'Tổng kho Tân Bình',
            sourceLocationType: 'WAREHOUSE',
            shippingServiceCode: 'STANDARD',
            items: [{ variantId: 'var-a-id', quantity: 1 }],
            estimatedShippingFee: 22000,
          },
          {
            sourceLocationId: 'store-q1-id',
            sourceLocationName: 'GlowUp Showroom Quận 1',
            sourceLocationType: 'STORE',
            shippingServiceCode: 'STANDARD',
            items: [{ variantId: 'var-b-id', quantity: 1 }],
            estimatedShippingFee: 22000,
          },
        ],
        totalShippingFee: 44000,
        companySubsidizedFee: 22000,
        customerShippingFee: 22000,
      });

      // Kho 1 giữ chỗ thành công
      inventoryReservationService.createReservation.mockResolvedValueOnce({
        id: 'res-fo-1-id',
        status: 'ACTIVE',
      });

      // Kho 2 giữ chỗ THẤT BẠI (ví dụ: bị tranh chấp tồn kho đồng thời)
      inventoryReservationService.createReservation.mockRejectedValueOnce(
        new ConflictException('LOT_SHORTAGE_FOR_VARIANT_var-b-id'),
      );

      const input: CreateOrderOmsInput = {
        customerId: 'cust-123',
        paymentMethod: 'ONLINE',
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
          addressLine: '123 Nguyễn Huệ',
        },
        items: [
          { variantId: 'var-a-id', quantity: 1 },
          { variantId: 'var-b-id', quantity: 1 },
        ],
      };

      // Giao dịch ném ra ngoại lệ và rollback
      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);

      // Outbox Event ORDER_RESERVED không được ghi nhận khi rollback
      expect(outboxWriter.record).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SCENARIO: Single Fulfillment Order
  // =========================================================================
  describe('Đơn hàng đơn lẻ xuất từ 1 kho (Single Fulfillment)', () => {
    it('phải tạo thành công 1 Order cha và 1 FO con duy nhất', async () => {
      hybridOrderRouter.routeOrder.mockResolvedValue({
        planType: 'SINGLE_FULFILLMENT',
        isSplit: false,
        fulfillmentOrders: [
          {
            sourceLocationId: 'wh-tb-id',
            sourceLocationName: 'Tổng kho Tân Bình',
            sourceLocationType: 'WAREHOUSE',
            shippingServiceCode: 'STANDARD',
            items: [{ variantId: 'var-a-id', quantity: 1 }],
            estimatedShippingFee: 22000,
          },
        ],
        totalShippingFee: 22000,
        companySubsidizedFee: 0,
        customerShippingFee: 22000,
      });

      inventoryReservationService.createReservation.mockResolvedValue({
        id: 'res-single-id',
        status: 'ACTIVE',
      });

      const input: CreateOrderOmsInput = {
        customerId: 'cust-123',
        paymentMethod: 'VNPAY',
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Tân Bình',
          addressLine: '456 Trường Chinh',
        },
        items: [{ variantId: 'var-a-id', quantity: 1 }],
      };

      const result = await useCase.execute(input);

      expect(result.status).toBe('PENDING_PAYMENT');
      expect(result.isSplit).toBe(false);
      expect(result.fulfillmentOrders.length).toBe(1);
      expect(result.fulfillmentOrders[0].fulfillmentOrderNumber).toContain('-FO01');
      expect(result.fulfillmentOrders[0].reservationId).toBe('res-single-id');
    });
  });

  // =========================================================================
  // SCENARIO: Internal Transfer Required -> Cannot fulfill directly
  // =========================================================================
  describe('Đơn hàng không đủ điều kiện phân tuyến trực tiếp (Yêu cầu gom hàng)', () => {
    it('phải từ chối tạo đơn và ném ConflictException với lý do chi tiết', async () => {
      hybridOrderRouter.routeOrder.mockResolvedValue({
        planType: 'INTERNAL_TRANSFER_REQUIRED',
        isSplit: false,
        fulfillmentOrders: [],
        transferDetails: {
          reason: 'Giá trị đơn hàng dưới 500.000đ, không cho phép chia đơn (DEC-02)',
        },
      });

      const input: CreateOrderOmsInput = {
        customerId: 'cust-123',
        shippingServiceCode: 'STANDARD',
        shippingAddress: {
          provinceCity: 'TP. Hồ Chí Minh',
          district: 'Quận 1',
          addressLine: '123 Lê Lợi',
        },
        items: [{ variantId: 'var-a-id', quantity: 1 }],
      };

      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
      expect(prisma._txMock.order.create).not.toHaveBeenCalled();
    });
  });
});
