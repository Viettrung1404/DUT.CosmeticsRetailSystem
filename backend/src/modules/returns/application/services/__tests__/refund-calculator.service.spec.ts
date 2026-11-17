import { BadRequestException } from '@nestjs/common';
import { RefundCalculatorService } from '../refund-calculator.service';
import {
  ReturnReasonCode,
  ReturnChannel,
  ShippingFeeBearer,
} from '../../../domain/entities/return-policy.entity';

describe('EP16-T01: RefundCalculatorService Unit Tests', () => {
  let service: RefundCalculatorService;

  beforeEach(() => {
    service = new RefundCalculatorService();
  });

  const sampleOrder = {
    id: 'ord-1',
    orderNumber: 'ORD-20261117-001',
    subtotal: 1000000,
    discountAmount: 100000, // Voucher 100k
    shippingFee: 30000,
    totalAmount: 930000,
    loyaltyPointsUsed: 50,
    items: [
      {
        id: 'item-1',
        productVariantId: 'var-1',
        productName: 'Kem Dưỡng Ban Đêm',
        quantity: 1,
        unitPrice: 200000,
        discountAmount: 0,
        pointsDiscount: 0,
        totalPrice: 180000, // Cash paid after 20k voucher share
      },
      {
        id: 'item-2',
        productVariantId: 'var-2',
        productName: 'Serum Tái Tạo Da',
        quantity: 2,
        unitPrice: 400000,
        discountAmount: 0,
        pointsDiscount: 0,
        totalPrice: 720000, // Cash paid after 80k voucher share (360k each)
      },
    ],
  };

  it('1. should calculate proportional refund for voucher discount accurately (TC-RMA-17, AC1)', () => {
    // Order 1M with 100k voucher: 200k item has 20k voucher share -> Cash refund = 180,000đ
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        },
      ],
      ReturnChannel.STORE_DROPOFF,
    );

    expect(result).toBeDefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].unitNetRefundPrice).toBe(180000);
    expect(result.items[0].lineRefundCash).toBe(180000);
    expect(result.grossRefundAmount).toBe(180000);
    expect(result.deductedShippingFee).toBe(0); // Store dropoff: free
    expect(result.netRefundAmount).toBe(180000);
  });

  it('2. should deduct return shipping fee for CHANGE_OF_MIND via CARRIER_PICKUP (DEC-04, AC4)', () => {
    // Khách đổi ý trả qua bưu tá GHN tận nhà -> Khấu trừ 25.000đ phí thu hồi
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        },
      ],
      ReturnChannel.CARRIER_PICKUP,
      { returnShippingFee: 25000 },
    );

    expect(result.grossRefundAmount).toBe(180000);
    expect(result.deductedShippingFee).toBe(25000);
    expect(result.netRefundAmount).toBe(155000); // 180k - 25k = 155k
    expect(result.shippingFeeBearer).toBe(ShippingFeeBearer.CUSTOMER);
  });

  it('3. should NOT deduct return shipping fee for STORE_DROPOFF even for CHANGE_OF_MIND', () => {
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        },
      ],
      ReturnChannel.STORE_DROPOFF,
    );

    expect(result.deductedShippingFee).toBe(0);
    expect(result.netRefundAmount).toBe(180000);
  });

  it('4. should NOT deduct return shipping fee for ALLERGIC (DEC-05) or DEFECTIVE reasons', () => {
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.ALLERGIC,
        },
      ],
      ReturnChannel.CARRIER_PICKUP,
    );

    expect(result.deductedShippingFee).toBe(0);
    expect(result.netRefundAmount).toBe(180000);
    expect(result.shippingFeeBearer).toBe(ShippingFeeBearer.GLOWUP);
  });

  it('5. should restore proportional loyalty points when loyalty points were used (AC3)', () => {
    // Item 1 is 20% of order subtotal (200k / 1M) -> 20% of 50 points = 10 points
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.WRONG_ITEM,
        },
      ],
      ReturnChannel.STORE_DROPOFF,
    );

    expect(result.items[0].pointsToRestore).toBe(10);
    expect(result.totalPointsToRestore).toBe(10);
  });

  it('6. should handle partial quantity refund correctly', () => {
    // Item 2 has 2 units (720k total, 360k each). Return 1 unit.
    const result = service.calculateRefund(
      sampleOrder,
      [
        {
          orderItemId: 'item-2',
          quantity: 1,
          reasonCode: ReturnReasonCode.DEFECTIVE,
        },
      ],
      ReturnChannel.STORE_DROPOFF,
    );

    expect(result.items[0].quantity).toBe(1);
    expect(result.items[0].unitNetRefundPrice).toBe(360000);
    expect(result.items[0].lineRefundCash).toBe(360000);
    expect(result.netRefundAmount).toBe(360000);
    // Item 2 is 800k / 1M = 80% of 50 points = 40 points total (20 points per unit)
    expect(result.items[0].pointsToRestore).toBe(20);
  });

  it('7. should enforce Financial Invariant: Gross refund cannot exceed order total amount (AC2)', () => {
    const cheapOrder = {
      ...sampleOrder,
      totalAmount: 100000, // Total paid was only 100k
    };

    const result = service.calculateRefund(
      cheapOrder,
      [
        {
          orderItemId: 'item-1',
          quantity: 1,
          reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
        },
      ],
      ReturnChannel.STORE_DROPOFF,
    );

    expect(result.grossRefundAmount).toBeLessThanOrEqual(100000);
  });

  it('8. should throw BadRequestException when requested quantity exceeds item quantity', () => {
    expect(() =>
      service.calculateRefund(
        sampleOrder,
        [
          {
            orderItemId: 'item-1',
            quantity: 5, // Order only has 1
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          },
        ],
        ReturnChannel.STORE_DROPOFF,
      ),
    ).toThrow('vượt quá số lượng đã mua');
  });

  it('9. should throw BadRequestException when item does not belong to order', () => {
    expect(() =>
      service.calculateRefund(
        sampleOrder,
        [
          {
            orderItemId: 'non-existent-item',
            quantity: 1,
            reasonCode: ReturnReasonCode.CHANGE_OF_MIND,
          },
        ],
        ReturnChannel.STORE_DROPOFF,
      ),
    ).toThrow('Không tìm thấy mặt hàng');
  });
});
