import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../domain/entities/return-policy.entity';
import {
  RefundCalculatorService,
  ItemToRefundInput,
} from './refund-calculator.service';
import { AtpCalculatorService } from '../../../inventory/application/services/atp-calculator.service';
import {
  ReplacementItemDto,
  CreateExchangeOrderDto,
} from '../../presentation/dtos/exchange-quote.dto';

export interface ExchangeQuoteItem {
  productVariantId: string;
  sku: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface ReturnedCreditItem {
  returnItemId: string;
  orderItemId: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  netCredit: number;
}

export interface ExchangeQuoteResult {
  returnOrderId: string;
  returnCredit: number;
  replacementPayable: number;
  creditApplied: number;
  additionalDue: number;
  refundDue: number;
  replacementItems: ExchangeQuoteItem[];
  returnedItems: ReturnedCreditItem[];
}

export interface CreateReplacementOrderResult {
  settlement: any;
  replacementOrder: any;
  quote: ExchangeQuoteResult;
  excessRefund?: any;
}

@Injectable()
export class ExchangeSettlementService {
  private readonly logger = new Logger(ExchangeSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundCalculatorService: RefundCalculatorService,
    private readonly atpCalculatorService: AtpCalculatorService,
  ) {}

  /**
   * Tính toán báo giá bù trừ tài chính đổi hàng (EP17-T01, Quote Preview)
   */
  async calculateExchangeQuote(
    returnOrderId: string,
    replacementItems: ReplacementItemDto[],
    shippingFeeOverride?: number,
  ): Promise<ExchangeQuoteResult> {
    if (!replacementItems || replacementItems.length === 0) {
      throw new BadRequestException(
        'Danh sách sản phẩm mới muốn đổi không được để trống',
      );
    }

    // 1. Kiểm tra hồ sơ đổi trả
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

    // 2. Lọc các mặt hàng đạt tiêu chuẩn kiểm định KCS (PASSED)
    const passedItems = returnOrder.items.filter(
      (item) =>
        item.inspectionStatus === ReturnInspectionStatus.PASSED ||
        item.inspectionStatus === 'PASSED',
    );

    const eligibleItems =
      passedItems.length > 0 ? passedItems : returnOrder.items;

    if (eligibleItems.length === 0) {
      throw new BadRequestException(
        'Không có sản phẩm nào đạt tiêu chuẩn kiểm định KCS để thực hiện đổi hàng',
      );
    }

    // 3. Tính toán giá trị bảo lưu hàng trả (returnCredit) qua RefundCalculatorService
    const itemsToRefundInput: ItemToRefundInput[] = eligibleItems.map((pi) => ({
      orderItemId: pi.orderItemId,
      returnItemId: pi.id,
      quantity: pi.quantity,
      reasonCode: pi.reasonCode,
      inspectionStatus: pi.inspectionStatus,
    }));

    const refundCalc = this.refundCalculatorService.calculateRefund(
      returnOrder.order,
      itemsToRefundInput,
      returnOrder.returnChannel,
      {
        returnShippingFee: shippingFeeOverride,
      },
    );

    const returnCredit = refundCalc.netRefundAmount;

    const returnedItemsDetail: ReturnedCreditItem[] = refundCalc.items.map(
      (ci) => ({
        returnItemId: ci.returnItemId || '',
        orderItemId: ci.orderItemId,
        productVariantId: ci.productVariantId,
        productName: ci.productName,
        quantity: ci.quantity,
        netCredit: ci.lineRefundCash,
      }),
    );

    // 4. Tính toán giá trị hàng mới (replacementPayable)
    const variantIds = replacementItems.map((it) => it.productVariantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    let replacementPayable = 0;
    const replacementItemsDetail: ExchangeQuoteItem[] = [];

    for (const reqItem of replacementItems) {
      const variant = variantMap.get(reqItem.productVariantId);
      if (!variant) {
        throw new NotFoundException(
          `Không tìm thấy biến thể sản phẩm mới: ${reqItem.productVariantId}`,
        );
      }
      if (!variant.isActive) {
        throw new BadRequestException(
          `Sản phẩm '${variant.product.name} - ${variant.sku}' hiện đã ngừng kinh doanh`,
        );
      }

      const unitPrice = Math.round(Number(variant.price));
      const lineTotal = unitPrice * reqItem.quantity;
      replacementPayable += lineTotal;

      replacementItemsDetail.push({
        productVariantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.option1Value || 'Mặc định',
        unitPrice,
        quantity: reqItem.quantity,
        totalPrice: lineTotal,
      });
    }

    // 5. Thuật toán bù trừ tài chính (Financial Settlement Invariants, chk_exchange_amounts)
    // credit_applied + additional_due = replacement_payable
    // credit_applied + refund_due = return_credit
    // (additional_due = 0 OR refund_due = 0)
    let creditApplied = 0;
    let additionalDue = 0;
    let refundDue = 0;

    if (replacementPayable === returnCredit) {
      // Ca 1: Đổi ngang giá (TC-RMA-13)
      creditApplied = returnCredit;
      additionalDue = 0;
      refundDue = 0;
    } else if (replacementPayable > returnCredit) {
      // Ca 2: Đổi sản phẩm giá cao hơn -> Khách bù thêm tiền (TC-RMA-14)
      creditApplied = returnCredit;
      additionalDue = replacementPayable - returnCredit;
      refundDue = 0;
    } else {
      // Ca 3: Đổi sản phẩm giá thấp hơn -> Hoàn lại tiền thừa cho khách (TC-RMA-15)
      creditApplied = replacementPayable;
      additionalDue = 0;
      refundDue = returnCredit - replacementPayable;
    }

    return {
      returnOrderId: returnOrder.id,
      returnCredit,
      replacementPayable,
      creditApplied,
      additionalDue,
      refundDue,
      replacementItems: replacementItemsDetail,
      returnedItems: returnedItemsDetail,
    };
  }

  /**
   * Khởi tạo đơn hàng thay thế và quyết toán đổi hàng (EP17-T02)
   */
  async createReplacementOrder(
    returnOrderId: string,
    operatorUserId: string,
    dto: CreateExchangeOrderDto,
  ): Promise<CreateReplacementOrderResult> {
    // 1. Kiểm tra hồ sơ đổi trả
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
        settlement: true,
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy hồ sơ đổi trả với mã: ${returnOrderId}`,
      );
    }

    // 2. Chặn đổi trùng lặp nếu hồ sơ đã có ExchangeSettlement
    if (returnOrder.settlement) {
      throw new BadRequestException(
        `Hồ sơ đổi trả này đã được quyết toán đổi hàng với đơn thay thế ID: ${returnOrder.settlement.replacementOrderId}`,
      );
    }

    // 3. Kiểm tra trạng thái hồ sơ đổi trả
    if (
      returnOrder.status !== ReturnOrderStatus.RESOLUTION_PENDING &&
      returnOrder.status !== ReturnOrderStatus.INSPECTING &&
      returnOrder.status !== ReturnOrderStatus.RECEIVED
    ) {
      throw new BadRequestException(
        `Không thể tạo đơn đổi hàng ở trạng thái '${returnOrder.status}'. Trạng thái hợp lệ phải là RESOLUTION_PENDING`,
      );
    }

    // 4. Kiểm tra tồn kho ATP cho từng mặt hàng mới (TC-RMA-16, AC1)
    const variantIds = dto.replacementItems.map((it) => it.productVariantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // Kiểm tra số lượng tồn khả dụng (ATP) tại vị trí xuất hàng hoặc toàn hệ thống
    for (const reqItem of dto.replacementItems) {
      const variant = variantMap.get(reqItem.productVariantId);
      if (!variant) {
        throw new NotFoundException(
          `Không tìm thấy biến thể sản phẩm mới: ${reqItem.productVariantId}`,
        );
      }

      // Truy vấn tồn kho từ bảng inventory
      const inventories = await this.prisma.inventory.findMany({
        where: { productVariantId: reqItem.productVariantId },
      });

      const totalAtp = inventories.reduce((sum, inv) => {
        return (
          sum +
          this.atpCalculatorService.calculateAtp({
            physicalOnHand: inv.quantity,
            reservedQuantity: inv.reservedQuantity,
            safetyStock: inv.safetyStock,
            quarantinedQuantity: inv.quarantinedQuantity,
            damagedQuantity: inv.damagedQuantity,
          })
        );
      }, 0);

      // Nếu không có tồn kho khả dụng đáp ứng
      if (totalAtp < reqItem.quantity) {
        throw new BadRequestException(
          `Sản phẩm thay thế '${variant.product.name} (${variant.sku})' đã hết hàng khả dụng (ATP = ${totalAtp}, yêu cầu = ${reqItem.quantity}). Vui lòng chọn sản phẩm khác hoặc đổi hình thức hoàn tiền`,
        );
      }
    }

    // 5. Tính toán báo giá bù trừ công nợ (EP17-T01)
    const quote = await this.calculateExchangeQuote(
      returnOrderId,
      dto.replacementItems,
      dto.shippingFeeOverride,
    );

    // 6. Thực thi Transaction ACID khởi tạo đơn hàng thay thế và quyết toán
    const result = await this.prisma.$transaction(async (tx) => {
      // 6.1 Tạo mã đơn hàng thay thế
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const replacementOrderNumber = `EXC-${nowStr}-${randSuffix}`;

      // Địa chỉ giao hàng (lấy từ DTO hoặc địa chỉ nhận hàng của đơn gốc)
      const rawShippingAddress: any =
        dto.shippingAddress ||
        returnOrder.pickupAddress ||
        returnOrder.order.shippingAddress || {
          addressLine: 'Nhận tại quầy Showroom',
          provinceCity: 'Hồ Chí Minh',
          district: 'Quận 1',
        };

      // 6.2 Tạo đơn hàng thay thế mới trong bảng orders (order_type = 'EXCHANGE')
      const replacementOrder = await tx.order.create({
        data: {
          orderNumber: replacementOrderNumber,
          customerId: returnOrder.customerId,
          storeId: returnOrder.storeId,
          orderType: 'EXCHANGE',
          status:
            quote.additionalDue > 0 && dto.paymentMethod !== 'COD'
              ? 'PENDING'
              : 'CONFIRMED',
          subtotal: quote.replacementPayable,
          discountAmount: quote.creditApplied, // Ghi nhận giá trị bảo lưu hàng cũ khấu trừ
          totalAmount: quote.replacementPayable,
          policyVersionId: returnOrder.policyVersionId,
          shippingAddress: rawShippingAddress,
          note:
            dto.note ||
            `Đơn hàng thay thế đổi từ hồ sơ RMA ${returnOrder.returnCode}`,
          items: {
            create: quote.replacementItems.map((item) => {
              const v = variantMap.get(item.productVariantId)!;
              return {
                productVariantId: item.productVariantId,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCost: Number(v.costPrice || 0),
                totalPrice: item.totalPrice,
                discountAmount: 0,
              };
            }),
          },
        },
        include: { items: true },
      });

      // 6.3 Tạo bản ghi quyết toán đổi hàng exchange_settlements
      const settlement = await tx.exchangeSettlement.create({
        data: {
          returnOrderId: returnOrder.id,
          replacementOrderId: replacementOrder.id,
          returnCredit: quote.returnCredit,
          replacementPayable: quote.replacementPayable,
          creditApplied: quote.creditApplied,
          additionalDue: quote.additionalDue,
          refundDue: quote.refundDue,
          status: 'SETTLED',
        },
      });

      // 6.4 Lưu vết các sản phẩm mới vào bảng exchange_items
      await tx.exchangeItem.createMany({
        data: dto.replacementItems.map((item) => ({
          returnOrderId: returnOrder.id,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
        })),
      });

      // 6.5 Quản lý dòng tiền và công nợ (Payments / Refunds / Funding)
      // a) Nếu creditApplied > 0: Tạo bản ghi Payment ghi nhận bù trừ giá trị hàng cũ
      if (quote.creditApplied > 0) {
        await tx.payment.create({
          data: {
            orderId: replacementOrder.id,
            paymentMethod: 'EXCHANGE_CREDIT',
            amount: quote.creditApplied,
            status: 'COMPLETED',
            transactionId: `CREDIT-${returnOrder.returnCode}`,
          },
        });

        // Liên kết dòng tiền gốc (ExchangeFunding) nếu đơn gốc có thanh toán thành công
        const successfulPayment = returnOrder.order.payments.find(
          (p) => p.status === 'CAPTURED' || p.status === 'COMPLETED',
        );
        if (successfulPayment) {
          await tx.exchangeFunding.create({
            data: {
              settlementId: settlement.id,
              sourceOrderId: returnOrder.orderId,
              paymentId: successfulPayment.id,
              amount: quote.creditApplied,
            },
          });
        }
      }

      // b) Nếu có additionalDue > 0: Tạo Payment cho phần khách cần bù thêm (TC-RMA-14)
      if (quote.additionalDue > 0) {
        const payMethod = (dto.paymentMethod || 'COD').toUpperCase();
        await tx.payment.create({
          data: {
            orderId: replacementOrder.id,
            paymentMethod: payMethod,
            amount: quote.additionalDue,
            status: 'PENDING',
          },
        });
      }

      // c) Nếu có refundDue > 0: Tự động sinh Refund cho phần tiền thừa cần trả lại khách (TC-RMA-15)
      let excessRefund: any = null;
      if (quote.refundDue > 0) {
        excessRefund = await tx.refund.create({
          data: {
            orderId: returnOrder.orderId,
            returnOrderId: returnOrder.id,
            amount: quote.refundDue,
            status: 'PENDING',
            reason: `Hoàn tiền chênh lệch đổi hàng giá thấp hơn (RMA ${returnOrder.returnCode})`,
          },
        });
      }

      // 6.6 Cập nhật trạng thái ReturnOrder sang COMPLETED
      await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: ReturnOrderStatus.COMPLETED,
          handledBy: operatorUserId,
        },
      });

      // 6.7 Ghi nhật ký trạng thái ReturnStatusHistory
      await tx.returnStatusHistory.create({
        data: {
          returnOrderId: returnOrder.id,
          status: ReturnOrderStatus.COMPLETED,
          changedBy: operatorUserId,
          note: `Quyết toán đổi hàng thành công: Đơn mới ${replacementOrder.orderNumber}, Bù thêm: ${quote.additionalDue.toLocaleString()}đ, Hoàn lại: ${quote.refundDue.toLocaleString()}đ`,
        },
      });

      // 6.8 Ghi sự kiện Outbox EXCHANGE_REPLACEMENT_ORDER_CREATED
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'RETURN_ORDER',
          aggregateId: returnOrder.id,
          eventType: 'EXCHANGE_REPLACEMENT_ORDER_CREATED',
          payload: {
            returnOrderId: returnOrder.id,
            replacementOrderId: replacementOrder.id,
            orderNumber: replacementOrder.orderNumber,
            additionalDue: quote.additionalDue,
            refundDue: quote.refundDue,
            creditApplied: quote.creditApplied,
            operatorUserId,
          },
        },
      });

      return {
        settlement,
        replacementOrder,
        quote,
        excessRefund,
      };
    });

    this.logger.log(
      `[EXCHANGE_SETTLEMENT] Hoàn tất quyết toán đổi hàng cho RMA ${returnOrderId}: Đơn mới ${result.replacementOrder.orderNumber}`,
    );

    return result;
  }

  /**
   * Tra cứu thông tin quyết toán đổi hàng theo mã hồ sơ RMA
   */
  async getExchangeSettlementByReturnOrderId(returnOrderId: string) {
    const settlement = await this.prisma.exchangeSettlement.findUnique({
      where: { returnOrderId },
      include: {
        replacementOrder: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
            payments: true,
          },
        },
        returnOrder: {
          include: {
            items: true,
            customer: true,
          },
        },
        funding: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException(
        `Không tìm thấy biên bản quyết toán đổi hàng cho hồ sơ RMA: ${returnOrderId}`,
      );
    }

    return settlement;
  }
}
