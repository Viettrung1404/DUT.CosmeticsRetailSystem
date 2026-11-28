import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../domain/entities/return-policy.entity';
import {
  RefundCalculatorService,
  ItemToRefundInput,
  RefundCalculationResult,
} from './refund-calculator.service';

export interface CreateRefundOptions {
  deductedShippingFee?: number;
  notes?: string;
}

export interface CreateRefundResult {
  refund: any;
  calculation: RefundCalculationResult;
  returnOrder: any;
}

@Injectable()
export class RefundExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundCalculatorService: RefundCalculatorService,
  ) {}

  /**
   * Tạo lệnh hoàn tiền chi tiết từng dòng (EP16-T02, Anti-Duplication Protection)
   */
  async createRefundForReturn(
    returnOrderId: string,
    operatorUserId: string,
    options?: CreateRefundOptions,
  ): Promise<CreateRefundResult> {
    // 1. Kiểm tra đơn đổi trả
    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
            payments: true,
          },
        },
        items: true,
        receipts: true,
        inspections: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với mã: ${returnOrderId}`,
      );
    }

    // 2. Kiểm tra trạng thái hồ sơ (Phải ở trạng thái RESOLUTION_PENDING sau khi KCS duyệt)
    if (
      returnOrder.status !== ReturnOrderStatus.RESOLUTION_PENDING &&
      returnOrder.status !== ReturnOrderStatus.INSPECTING &&
      returnOrder.status !== ReturnOrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Không thể tạo lệnh hoàn tiền ở trạng thái '${returnOrder.status}'. Trạng thái hợp lệ phải là RESOLUTION_PENDING`,
      );
    }

    // 3. Lọc các mặt hàng đạt tiêu chuẩn kiểm định KCS (chỉ hoàn tiền các món PASSED)
    const passedItems = returnOrder.items.filter((item) => {
      return (
        item.inspectionStatus === ReturnInspectionStatus.PASSED ||
        item.inspectionStatus === 'PASSED'
      );
    });

    if (passedItems.length === 0) {
      throw new BadRequestException(
        'Không có sản phẩm nào đạt tiêu chuẩn kiểm định KCS (PASSED) để tạo lệnh hoàn tiền',
      );
    }

    // 4. Kiểm tra chống hoàn tiền trùng lặp hoặc hoàn vượt mức giá trị đơn gốc (AC1)
    for (const pItem of passedItems) {
      const existingRefundItems = await this.prisma.refundItem.findMany({
        where: { orderItemId: pItem.orderItemId },
      });

      const alreadyRefundedAmount = existingRefundItems.reduce(
        (sum, it) => sum + Number(it.amount),
        0,
      );
      const alreadyRefundedQty = existingRefundItems.reduce(
        (sum, it) => sum + it.quantity,
        0,
      );

      const orderItem = returnOrder.order.items.find(
        (oi) => oi.id === pItem.orderItemId,
      );
      if (!orderItem) continue;

      if (alreadyRefundedQty >= orderItem.quantity) {
        throw new BadRequestException(
          `Mặt hàng '${orderItem.productName}' đã được hoàn trả toàn bộ số lượng (${alreadyRefundedQty}/${orderItem.quantity}) trong các lệnh trước`,
        );
      }

      if (alreadyRefundedAmount >= Number(orderItem.totalPrice)) {
        throw new BadRequestException(
          `Mặt hàng '${orderItem.productName}' đã được hoàn đủ giá trị thực trả trước đó`,
        );
      }
    }

    // 5. Tính toán phân bổ tiền hoàn qua RefundCalculatorService (EP16-T01)
    const itemsToRefundInput: ItemToRefundInput[] = passedItems.map((pi) => ({
      orderItemId: pi.orderItemId,
      returnItemId: pi.id,
      quantity: pi.quantity,
      reasonCode: pi.reasonCode,
      inspectionStatus: pi.inspectionStatus,
    }));

    const calculation = this.refundCalculatorService.calculateRefund(
      returnOrder.order,
      itemsToRefundInput,
      returnOrder.returnChannel,
      {
        returnShippingFee: options?.deductedShippingFee,
      },
    );

    // 6. Thực thi Transaction ACID tạo Refund và RefundItem
    const result = await this.prisma.$transaction(async (tx) => {
      // 6.1 Tạo bản ghi Lệnh hoàn tiền (refunds)
      const refund = await tx.refund.create({
        data: {
          orderId: returnOrder.orderId,
          returnOrderId: returnOrder.id,
          amount: calculation.netRefundAmount,
          reason:
            options?.notes ||
            `Hoàn tiền đổi trả cho hồ sơ ${returnOrder.returnCode} sau kiểm định KCS đạt chuẩn`,
          status: 'PENDING',
          processedBy: operatorUserId,
          compensationKey: `REF-${returnOrder.returnCode}-${Date.now()}`,
        },
      });

      // 6.2 Tạo chi tiết từng mặt hàng được hoàn (refund_items)
      for (const calcItem of calculation.items) {
        await tx.refundItem.create({
          data: {
            refundId: refund.id,
            orderItemId: calcItem.orderItemId,
            returnItemId: calcItem.returnItemId,
            quantity: calcItem.quantity,
            amount: calcItem.lineRefundCash,
            pointsRestored: calcItem.pointsToRestore,
          },
        });

        // 6.3 Cập nhật thông tin hoàn tiền trên dòng return_order_items
        if (calcItem.returnItemId) {
          await tx.returnOrderItem.update({
            where: { id: calcItem.returnItemId },
            data: {
              refundAmount: calcItem.lineRefundCash,
              refundAmountPerUnit: calcItem.unitNetRefundPrice,
              pointsToRestore: calcItem.pointsToRestore,
            },
          });
        }
      }

      // 6.4 Cập nhật tổng tiền hoàn được phê duyệt trên hồ sơ ReturnOrder
      const updatedReturnOrder = await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          refundAmount: calculation.netRefundAmount,
          totalRefundApproved: calculation.netRefundAmount,
          handledBy: operatorUserId,
        },
      });

      // 6.5 Phát Outbox Event REFUND_ORDER_ITEM_RECORDED
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Refund',
          aggregateId: refund.id,
          eventType: 'REFUND_ORDER_ITEM_RECORDED',
          payload: {
            refundId: refund.id,
            returnOrderId: returnOrder.id,
            orderId: returnOrder.orderId,
            grossAmount: calculation.grossRefundAmount,
            deductedShippingFee: calculation.deductedShippingFee,
            netAmount: calculation.netRefundAmount,
            totalPointsToRestore: calculation.totalPointsToRestore,
            items: calculation.items.map((it) => ({
              orderItemId: it.orderItemId,
              returnItemId: it.returnItemId,
              quantity: it.quantity,
              amount: it.lineRefundCash,
              pointsRestored: it.pointsToRestore,
            })),
          },
        },
      });

      return {
        refund,
        calculation,
        returnOrder: updatedReturnOrder,
      };
    });

    return result;
  }

  /**
   * Lấy chi tiết lệnh hoàn tiền kèm danh sách món hoàn
   */
  async getRefundById(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        items: {
          include: {
            orderItem: true,
            returnItem: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customer: true,
          },
        },
        returnOrder: {
          select: {
            returnCode: true,
            status: true,
          },
        },
        processor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Không tìm thấy lệnh hoàn tiền: ${refundId}`);
    }

    return refund;
  }

  /**
   * Tính trước chi tiết tiền hoàn và điểm khôi phục cho một đơn đổi trả (Preview / EP16-T01)
   */
  async previewRefundForReturn(
    returnOrderId: string,
    deductedShippingFee?: number,
  ): Promise<RefundCalculationResult> {
    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
            payments: true,
          },
        },
        items: true,
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với mã: ${returnOrderId}`,
      );
    }

    const passedItems = returnOrder.items.filter(
      (item) =>
        item.inspectionStatus === ReturnInspectionStatus.PASSED ||
        item.inspectionStatus === 'PASSED',
    );
    const targetItems =
      passedItems.length > 0 ? passedItems : returnOrder.items;

    const itemsToRefundInput: ItemToRefundInput[] = targetItems.map((pi) => ({
      orderItemId: pi.orderItemId,
      returnItemId: pi.id,
      quantity: pi.quantity,
      reasonCode: pi.reasonCode,
      inspectionStatus: pi.inspectionStatus,
    }));

    return this.refundCalculatorService.calculateRefund(
      returnOrder.order,
      itemsToRefundInput,
      returnOrder.returnChannel,
      {
        returnShippingFee: deductedShippingFee,
      },
    );
  }
}
