import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { ShippingQuoteService } from '../services/shipping-quote.service';
import { HybridOrderRouter } from '../routing/hybrid-order-router';
import { InventoryReservationService } from '@modules/inventory/application/services/inventory-reservation.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { randomUUID } from 'crypto';

export interface CreateOrderOmsItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateOrderOmsInput {
  customerId?: string;
  orderType?: 'ONLINE' | 'POS';
  paymentMethod?: string; // 'COD', 'VNPAY', 'ONLINE', etc.
  shippingServiceCode: 'EXPRESS_2H' | 'STANDARD';
  quoteGroupId?: string;
  shippingAddress: {
    provinceCity: string;
    district: string;
    ward?: string;
    addressLine: string;
    receiverName?: string;
    phoneNumber?: string;
    latitude?: number;
    longitude?: number;
  };
  items: CreateOrderOmsItemInput[];
  note?: string;
  idempotencyKey?: string;
}

export interface FulfillmentOrderResultDto {
  id: string;
  fulfillmentOrderNumber: string;
  sourceLocationId: string;
  sourceLocationName: string;
  status: string;
  shippingServiceCode: string;
  totalItemsCount: number;
  reservationId?: string;
  items: {
    variantId: string;
    quantity: number;
  }[];
}

export interface CreateOrderResultDto {
  orderId: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  isSplit: boolean;
  fulfillmentOrders: FulfillmentOrderResultDto[];
}

@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingQuoteService: ShippingQuoteService,
    private readonly hybridOrderRouter: HybridOrderRouter,
    private readonly inventoryReservationService: InventoryReservationService,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
  ) {}

  /**
   * Khởi tạo đơn hàng với kiến trúc phân tuyến đa kho (Split Fulfillment) và Transactional Outbox
   */
  async execute(input: CreateOrderOmsInput): Promise<CreateOrderResultDto> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // 1. Xác thực báo giá vận chuyển nếu có quoteGroupId (chống khách can thiệp cước phí)
    let validatedFee: number | undefined;
    if (input.quoteGroupId) {
      const quote = await this.shippingQuoteService.validateQuote(
        input.quoteGroupId,
        input.shippingServiceCode,
      );
      validatedFee = quote.estimatedFee;
    }

    // 2. Tra cứu thông tin các biến thể sản phẩm và kiểm tra tính hợp lệ
    const variantIds = input.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: {
        product: { select: { id: true, name: true } },
      },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new NotFoundException('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng kinh doanh');
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 3. Tính toán tiền hàng thực tế
    let subtotal = 0;
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Số lượng sản phẩm ${item.variantId} không hợp lệ`);
      }
      const v = variantMap.get(item.variantId)!;
      subtotal += Number(v.price) * item.quantity;
    }

    const netMerchandiseAmount = subtotal;

    // 4. Phân tuyến đơn hàng qua HybridOrderRouter
    const routingPlan = await this.hybridOrderRouter.routeOrder({
      shippingServiceCode: input.shippingServiceCode,
      shippingAddress: input.shippingAddress,
      items: input.items,
      netMerchandiseAmount,
    });

    if (routingPlan.planType === 'INTERNAL_TRANSFER_REQUIRED') {
      const reason =
        routingPlan.transferDetails?.reason ||
        'Đơn hàng không đủ tồn kho và không thỏa mãn điều kiện tách đơn (DEC-02). Yêu cầu điều chuyển nội bộ.';
      throw new ConflictException(reason);
    }

    const finalShippingFee = validatedFee !== undefined
      ? validatedFee
      : routingPlan.customerShippingFee;

    const totalAmount = subtotal + finalShippingFee;

    // 5. THỰC THI GIAO DỊCH DATABASE ACID NGUYÊN TỬ (TRANSACTION)
    return await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const orderNumber = this.generateOrderNumber(now);
      const isCod = (input.paymentMethod || 'COD').toUpperCase() === 'COD';
      const orderStatus = isCod ? 'CONFIRMED' : 'PENDING_PAYMENT';

      // 5.1 Tạo bản ghi Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: input.customerId || null,
          storeId: routingPlan.fulfillmentOrders[0].sourceLocationId,
          orderType: input.orderType || 'ONLINE',
          status: orderStatus,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(0),
          shippingFee: new Prisma.Decimal(finalShippingFee),
          taxAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(totalAmount),
          shippingAddress: input.shippingAddress as any,
          note: input.note || null,
        },
      });

      // 5.2 Tạo các bản ghi OrderItem
      const orderItemMap = new Map<string, any>();
      for (const item of input.items) {
        const v = variantMap.get(item.variantId)!;
        const lineTotal = Number(v.price) * item.quantity;
        const createdOrderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productVariantId: item.variantId,
            productName: v.product.name,
            variantName: v.sku,
            quantity: item.quantity,
            unitPrice: v.price,
            unitCost: v.costPrice,
            totalPrice: new Prisma.Decimal(lineTotal),
          },
        });
        orderItemMap.set(item.variantId, createdOrderItem);
      }

      // 5.3 Tạo các Fulfillment Orders và Giữ Chỗ Tồn Kho Nguyên Tử (FEFO Atomic Reservation)
      const createdFos: FulfillmentOrderResultDto[] = [];

      for (let idx = 0; idx < routingPlan.fulfillmentOrders.length; idx++) {
        const plannedFo = routingPlan.fulfillmentOrders[idx];
        const foNumber = `${orderNumber}-FO${(idx + 1).toString().padStart(2, '0')}`;
        const totalItemsCount = plannedFo.items.reduce((sum, i) => sum + i.quantity, 0);

        // Tạo bản ghi Header FulfillmentOrder
        const createdFo = await tx.fulfillmentOrder.create({
          data: {
            orderId: order.id,
            fulfillmentOrderNumber: foNumber,
            sourceLocationId: plannedFo.sourceLocationId,
            status: 'PENDING_ALLOCATION',
            shippingServiceCode: plannedFo.shippingServiceCode,
            totalItemsCount,
          },
        });

        // Tạo các bản ghi FulfillmentOrderItem
        for (const foItem of plannedFo.items) {
          const matchedOrderItem = orderItemMap.get(foItem.variantId);
          await tx.fulfillmentOrderItem.create({
            data: {
              fulfillmentOrderId: createdFo.id,
              orderItemId: matchedOrderItem.id,
              productVariantId: foItem.variantId,
              quantityRequested: foItem.quantity,
            },
          });
        }

        // BƯỚC QUAN TRỌNG: Giữ chỗ tồn kho nguyên tử cho từng FO qua InventoryReservationService
        // Bất kỳ lỗi nào (như thiếu hàng theo lô) sẽ throw ConflictException và rollback toàn bộ transaction!
        const reservation = await this.inventoryReservationService.createReservation(
          tx,
          {
            orderId: order.id,
            fulfillmentOrderId: createdFo.id,
            locationId: plannedFo.sourceLocationId,
            items: plannedFo.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
            paymentMethod: input.paymentMethod || 'ONLINE',
          },
        );

        // Chuyển trạng thái FO sang ALLOCATED
        const allocatedAt = new Date();
        await tx.fulfillmentOrder.update({
          where: { id: createdFo.id },
          data: {
            status: 'ALLOCATED',
            allocatedAt,
          },
        });

        createdFos.push({
          id: createdFo.id,
          fulfillmentOrderNumber: foNumber,
          sourceLocationId: plannedFo.sourceLocationId,
          sourceLocationName: plannedFo.sourceLocationName,
          status: 'ALLOCATED',
          shippingServiceCode: plannedFo.shippingServiceCode,
          totalItemsCount,
          reservationId: reservation.id,
          items: plannedFo.items,
        });
      }

      // 5.4 Ghi sự kiện miền vào Transactional Outbox (ORDER_RESERVED)
      await this.outboxWriter.record(tx, {
        aggregateType: 'ORDER',
        aggregateId: order.id,
        eventType: 'ORDER_RESERVED',
        payload: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          status: order.status,
          subtotal,
          shippingFee: finalShippingFee,
          companySubsidizedFee: routingPlan.companySubsidizedFee,
          totalAmount,
          isSplit: routingPlan.isSplit,
          fulfillmentOrdersCount: createdFos.length,
          fulfillmentOrders: createdFos.map((fo) => ({
            id: fo.id,
            number: fo.fulfillmentOrderNumber,
            locationId: fo.sourceLocationId,
            itemsCount: fo.totalItemsCount,
            reservationId: fo.reservationId,
          })),
        },
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal,
        shippingFee: finalShippingFee,
        totalAmount,
        isSplit: routingPlan.isSplit,
        fulfillmentOrders: createdFos,
      };
    });
  }

  private generateOrderNumber(date: Date): string {
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const randomHex = randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase();
    return `ORD${yyyy}${mm}${dd}-${randomHex}`;
  }
}
