import {
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CommerceCheckoutService } from '../commerce-checkout.service';
import { ShippingQuoteService } from '@modules/oms/application/services/shipping-quote.service';

describe('BE-03: CommerceCheckoutService - Real Shipping Quotes Integration', () => {
  let service: CommerceCheckoutService;
  let mockDb: any;
  let mockPricing: any;
  let mockCommands: any;
  let availableStock = 10;
  let mockStores: any;
  let mockShippingQuoteService: any;
  let mockOutbox: { createMany: jest.Mock };

  const validQuoteVersion = 'a'.repeat(64);
  const inputOrder = {
    customerId: 'cust-123',
    quoteVersion: validQuoteVersion,
    quoteGroupId: 'quote-group-uuid',
    shippingOptionId: 'GHN_STANDARD',
    paymentMethod: 'COD',
    shippingAddress: {
      recipientName: 'Test Recipient',
      phone: '0901234567',
      addressLine: '123 Test St',
      city: 'Ho Chi Minh',
    },
    items: [{ variantId: 'variant-1', quantity: 2 }],
  };

  beforeEach(() => {
    availableStock = 10;
    mockOutbox = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    mockDb = {
      customer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ userId: 'user-123' }),
      },
      cart: {
        findFirst: jest.fn().mockResolvedValue({
          items: [{ productVariantId: 'variant-1', quantity: 2, isSelected: true }],
        }),
      },
    };

    mockPricing = {
      quote: jest.fn().mockResolvedValue({
        quoteVersion: validQuoteVersion,
        subtotal: 500000,
        lineDiscount: 0,
        couponDiscount: 0,
        pointsDiscount: 0,
        pointsUsed: 0,
        shippingFee: 40000, // Initial estimate before real quote
        totalAmount: 540000,
        items: [
          {
            variantId: 'variant-1',
            quantity: 2,
            originalPrice: 250000,
            cashValue: 500000,
            lineDiscount: 0,
            couponDiscount: 0,
            pointsValue: 0,
          },
        ],
        variants: [
          {
            id: 'variant-1',
            costPrice: 150000,
            product: { name: 'Serum Glow' },
          },
        ],
      }),
      assertQuote: jest.fn(),
    };

    mockCommands = {
      execute: jest.fn((userId, op, key, input, callback) => {
        const tx = {
          $queryRaw: jest.fn().mockImplementation((query: any) => {
            const sqlText =
              query?.sql ||
              query?.text ||
              (query?.strings ? query.strings.join('') : '') ||
              String(query);
            if (sqlText.includes('customer_order_seq')) {
              return [{ value: BigInt(100) }];
            }
            if (sqlText.includes('cart_items')) {
              return [{ id: 'cart-item-1' }];
            }
            return [
              {
                id: 'inv-1',
                product_variant_id: 'variant-1',
                quantity: 10,
                reserved_quantity: 0,
                available_quantity: availableStock,
              },
            ];
          }),
          outboxEvent: mockOutbox,
          inventory: { update: jest.fn().mockResolvedValue({}) },
          order: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: 'ord-123',
              orderNumber: data.orderNumber,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...data,
            })),
          },
          orderItem: {
            create: jest.fn().mockResolvedValue({ id: 'item-1' }),
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'item-1',
                orderId: 'ord-123',
                productVariantId: 'variant-1',
                productName: 'Serum Glow',
                variantName: '50ml',
                quantity: 2,
                unitPrice: 250000,
                discountAmount: 0,
                totalPrice: 500000,
              },
            ]),
          },
          fulfillmentOrder: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: 'fo-123',
              ...data,
            })),
          },
          fulfillmentOrderItem: {
            create: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          cart: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'cart-123',
              items: [{ productVariantId: 'variant-1', quantity: 2, isSelected: true }],
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          customer: {
            findUnique: jest.fn().mockResolvedValue({ loyaltyTier: 'SILVER' }),
            update: jest.fn().mockResolvedValue({}),
          },
          customerEvent: { create: jest.fn().mockResolvedValue({}) },
          payment: { create: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        };
        return callback(tx, 'cust-123');
      }),
    };

    mockStores = {
      resolveStoreForOrder: jest.fn().mockResolvedValue('store-dn-id'),
    };

    mockShippingQuoteService = {
      validateQuote: jest.fn(),
    };

    service = new CommerceCheckoutService(
      mockDb,
      mockPricing,
      mockCommands,
      mockStores,
      mockShippingQuoteService,
    );
  });

  it('1. should validate real shipping quote and replace shippingFee and totalAmount', async () => {
    mockShippingQuoteService.validateQuote.mockResolvedValue({
      quoteGroupId: 'quote-group-uuid',
      quoteId: 'quote-opt-1',
      carrierCode: 'GHN',
      serviceCode: 'GHN_STANDARD',
      estimatedFee: 22000,
    });

    const result = await service.create(inputOrder as any);
    expect(mockOutbox.createMany).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
      data: [expect.objectContaining({ eventType: 'RECOMMENDATION_PURCHASE', aggregateId: 'ord-123' })],
    }));

    expect(mockShippingQuoteService.validateQuote).toHaveBeenCalledWith(
      'quote-group-uuid',
      'GHN_STANDARD',
      'store-dn-id',
    );
    expect(result.shippingFee).toBe(22000);
    expect(result.totalAmount).toBe(522000); // 500000 + 22000
  });

  it('2. should reject order creation with 422 when quote has expired', async () => {
    mockShippingQuoteService.validateQuote.mockRejectedValue(
      new HttpException(
        {
          code: 'SHIPPING_QUOTE_EXPIRED',
          message: 'Báo giá vận chuyển đã hết hạn (quá 15 phút), vui lòng tính lại cước',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
    );

    try {
      await service.create(inputOrder as any);
      fail('Should have thrown HttpException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(err.getResponse()).toMatchObject({ code: 'SHIPPING_QUOTE_EXPIRED' });
    }
  });

  it.each([[15000, 7000], [5000, 0], [0, 0]])(
    'applies shipping benefits (%i policy fee) to the carrier quote', async (policyFee, charged) => {
      const quote = await mockPricing.quote();
      mockPricing.quote.mockResolvedValue({ ...quote, shippingFee: policyFee });
      mockShippingQuoteService.validateQuote.mockResolvedValue({
        quoteGroupId: 'quote-group-uuid', quoteId: 'quote-opt-1', carrierCode: 'GHN',
        serviceCode: 'GHN_STANDARD', estimatedFee: 22000,
      });
      const order = await service.create(inputOrder as any);
      expect(order.shippingFee).toBe(charged);
      expect(order.totalAmount).toBe(500000 + charged);
    },
  );

  it('3. should throw BadRequestException if quoteGroupId is provided without shippingOptionId', async () => {
    const invalidInput = { ...inputOrder, shippingOptionId: undefined };

    await expect(service.create(invalidInput as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an order when sellable inventory is lower than physical minus reserved stock', async () => {
    availableStock = 1;
    await expect(service.create({ ...inputOrder, quoteGroupId: undefined, shippingOptionId: undefined } as any))
      .rejects.toThrow('INSUFFICIENT_STOCK');
    expect(mockOutbox.createMany).not.toHaveBeenCalled();
  });

  it('4. should fall back to default pricing shipping fee when quoteGroupId is omitted (backward compatibility)', async () => {
    const legacyInput = {
      ...inputOrder,
      quoteGroupId: undefined,
      shippingOptionId: undefined,
    };

    const result = await service.create(legacyInput as any);

    expect(mockShippingQuoteService.validateQuote).not.toHaveBeenCalled();
    expect(result.shippingFee).toBe(40000);
    expect(result.totalAmount).toBe(540000);
  });
});
