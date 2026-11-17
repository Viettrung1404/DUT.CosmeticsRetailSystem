import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ReturnReasonCode,
  ReturnChannel,
  ShippingFeeBearer,
} from '../../domain/entities/return-policy.entity';

export interface ItemToRefundInput {
  orderItemId: string;
  returnItemId?: string;
  quantity: number;
  reasonCode: ReturnReasonCode | string;
  inspectionStatus?: string;
}

export interface ItemRefundCalculation {
  orderItemId: string;
  returnItemId?: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  originalUnitPrice: number;
  voucherDiscountAllocated: number;
  pointsDiscountAllocated: number;
  unitNetRefundPrice: number;
  lineRefundCash: number;
  pointsToRestore: number;
}

export interface RefundCalculationResult {
  items: ItemRefundCalculation[];
  grossRefundAmount: number;
  deductedShippingFee: number;
  netRefundAmount: number;
  totalPointsToRestore: number;
  originalOrderTotal: number;
  shippingFeeBearer: string;
  returnChannel: string;
}

export interface CalculateRefundOptions {
  returnShippingFee?: number;
  shippingFeeBearer?: ShippingFeeBearer | string;
}

@Injectable()
export class RefundCalculatorService {
  /**
   * Tính toán phân bổ tiền hoàn thực trả từng phần (EP16-T01, TC-RMA-17)
   */
  calculateRefund(
    order: any,
    itemsToRefund: ItemToRefundInput[],
    returnChannel: ReturnChannel | string = ReturnChannel.STORE_DROPOFF,
    options?: CalculateRefundOptions,
  ): RefundCalculationResult {
    if (!order || !order.items || order.items.length === 0) {
      throw new BadRequestException('Đơn hàng không hợp lệ hoặc không có sản phẩm');
    }

    if (!itemsToRefund || itemsToRefund.length === 0) {
      throw new BadRequestException('Danh sách mặt hàng yêu cầu hoàn tiền không được rỗng');
    }

    const orderItemsMap = new Map<string, any>(
      order.items.map((i: any) => [i.id, i]),
    );

    // 1. Tính tổng giá trị niêm yết (subtotal) của toàn bộ đơn hàng
    const orderSubtotal = order.items.reduce((sum: number, item: any) => {
      const lineSubtotal = Number(item.unitPrice) * item.quantity;
      return sum + lineSubtotal;
    }, 0);

    const orderTotalAmount = Number(order.totalAmount);
    const orderDiscountAmount = Number(order.discountAmount || 0);
    const orderLoyaltyPointsUsed = Number(order.loyaltyPointsUsed || 0);

    // Kiểm tra xem discountAmount đã được phân bổ sẵn vào từng orderItem chưa
    const sumLineDiscounts = order.items.reduce(
      (sum: number, it: any) => sum + Number(it.discountAmount || 0),
      0,
    );
    const needOrderDiscountAllocation =
      orderDiscountAmount > 0 && sumLineDiscounts === 0;

    const calculatedItems: ItemRefundCalculation[] = [];
    let grossRefundAmount = 0;
    let totalPointsToRestore = 0;

    // 2. Tính toán cho từng món hàng yêu cầu hoàn
    for (const reqItem of itemsToRefund) {
      const orderItem = orderItemsMap.get(reqItem.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `Không tìm thấy mặt hàng orderItemId '${reqItem.orderItemId}' trong đơn hàng gốc`,
        );
      }

      if (reqItem.quantity <= 0) {
        throw new BadRequestException(
          `Số lượng hoàn tiền cho mặt hàng '${orderItem.productName}' phải lớn hơn 0`,
        );
      }

      if (reqItem.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Số lượng hoàn (${reqItem.quantity}) vượt quá số lượng đã mua (${orderItem.quantity}) cho mặt hàng '${orderItem.productName}'`,
        );
      }

      const unitPrice = Number(orderItem.unitPrice);
      const lineSubtotal = unitPrice * orderItem.quantity;
      const itemRatio = orderSubtotal > 0 ? lineSubtotal / orderSubtotal : 0;

      // Phân bổ Voucher/Discount
      let lineVoucherDiscount = 0;
      if (needOrderDiscountAllocation) {
        // Phân bổ tỉ lệ theo giá trị món hàng trong đơn gốc (TC-RMA-17)
        lineVoucherDiscount = Math.round(orderDiscountAmount * itemRatio);
      } else {
        lineVoucherDiscount = Number(orderItem.discountAmount || 0);
      }

      // Phân bổ Loyalty Points (nếu khách dùng điểm thưởng giảm giá đơn hàng)
      let linePointsUsed = 0;
      let linePointsDiscountVnd = Number(orderItem.pointsDiscount || 0);
      if (orderLoyaltyPointsUsed > 0) {
        linePointsUsed = Math.round(orderLoyaltyPointsUsed * itemRatio);
      }

      // Thành tiền thực tế của dòng sản phẩm sau khi trừ voucher & điểm
      let lineNetCash = 0;
      if (needOrderDiscountAllocation) {
        lineNetCash = Math.max(
          0,
          lineSubtotal - lineVoucherDiscount - linePointsDiscountVnd,
        );
      } else if (
        orderItem.totalPrice !== undefined &&
        Number(orderItem.totalPrice) > 0
      ) {
        lineNetCash = Math.max(
          0,
          Number(orderItem.totalPrice) - linePointsDiscountVnd,
        );
      } else {
        lineNetCash = Math.max(
          0,
          lineSubtotal - lineVoucherDiscount - linePointsDiscountVnd,
        );
      }

      // Giá trị thực tế trên 1 đơn vị sản phẩm (UnitNetPrice)
      const unitNetPrice = Math.floor(lineNetCash / orderItem.quantity);
      const unitVoucherAlloc = Math.round(lineVoucherDiscount / orderItem.quantity);
      const unitPointsDiscountAlloc = Math.round(
        linePointsDiscountVnd / orderItem.quantity,
      );
      const unitPointsRestore = Math.floor(linePointsUsed / orderItem.quantity);

      const refundCash = unitNetPrice * reqItem.quantity;
      const pointsRestore = unitPointsRestore * reqItem.quantity;

      calculatedItems.push({
        orderItemId: orderItem.id,
        returnItemId: reqItem.returnItemId,
        productVariantId: orderItem.productVariantId,
        productName: orderItem.productName,
        quantity: reqItem.quantity,
        originalUnitPrice: unitPrice,
        voucherDiscountAllocated: unitVoucherAlloc * reqItem.quantity,
        pointsDiscountAllocated: unitPointsDiscountAlloc * reqItem.quantity,
        unitNetRefundPrice: unitNetPrice,
        lineRefundCash: refundCash,
        pointsToRestore: pointsRestore,
      });

      grossRefundAmount += refundCash;
      totalPointsToRestore += pointsRestore;
    }

    // 3. Kiểm tra Giới Hạn Bất Biến Tài Chính (Financial Invariants)
    // Tổng tiền hoàn không được vượt quá số tiền thực tế khách đã trả cho đơn
    if (grossRefundAmount > orderTotalAmount) {
      grossRefundAmount = orderTotalAmount;
    }

    if (totalPointsToRestore > orderLoyaltyPointsUsed) {
      totalPointsToRestore = orderLoyaltyPointsUsed;
    }

    // 4. Khấu trừ phí vận chuyển thu hồi theo quyết định DEC-04
    // - Khách tự đem trả tại quầy Showroom (STORE_DROPOFF): Phí thu hồi = 0đ (miễn phí)
    // - Lỗi từ phía cửa hàng (WRONG_ITEM, DEFECTIVE, DAMAGED_IN_TRANSIT, EXPIRED) hoặc dị ứng da DEC-05 (ALLERGIC): GlowUp chịu phí
    // - Đổi ý (CHANGE_OF_MIND) và yêu cầu bưu tá GHN đến lấy tận nhà (CARRIER_PICKUP): Khách chịu phí thu hồi (DEC-04)
    let shippingFeeBearer = options?.shippingFeeBearer || ShippingFeeBearer.GLOWUP;
    const isChangeOfMind = itemsToRefund.some(
      (it) =>
        it.reasonCode === ReturnReasonCode.CHANGE_OF_MIND ||
        it.reasonCode === 'CHANGE_OF_MIND',
    );

    if (
      isChangeOfMind &&
      returnChannel === ReturnChannel.CARRIER_PICKUP &&
      !options?.shippingFeeBearer
    ) {
      shippingFeeBearer = ShippingFeeBearer.CUSTOMER;
    }

    let deductedShippingFee = 0;
    if (
      returnChannel === ReturnChannel.CARRIER_PICKUP &&
      shippingFeeBearer === ShippingFeeBearer.CUSTOMER
    ) {
      // Khấu trừ chi phí vận chuyển thu hồi thực tế (mặc định 25.000đ theo DEC-04)
      deductedShippingFee = options?.returnShippingFee ?? 25000;
    }

    // Số tiền thực chuyển hoàn cho khách sau khi khấu trừ phí thu hồi (không được âm)
    const netRefundAmount = Math.max(0, grossRefundAmount - deductedShippingFee);

    return {
      items: calculatedItems,
      grossRefundAmount,
      deductedShippingFee,
      netRefundAmount,
      totalPointsToRestore,
      originalOrderTotal: orderTotalAmount,
      shippingFeeBearer,
      returnChannel,
    };
  }
}
