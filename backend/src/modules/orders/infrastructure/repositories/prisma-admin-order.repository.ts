import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import { OrderStateMachine } from '@core/domain/orders/order-state-machine';
import {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderListQuery,
  AdminOrderScopeFilter,
  ConfirmOrderInput,
  IAdminOrderRepository,
  OrderAccessInfo,
  OrderCustomerSummary,
  OrderStatusChangeResult,
  UpdateOrderStatusInput,
} from '../../domain/repositories/admin-order.repository.interface';
import {
  findStockShortages,
  formatShortages,
} from '../../application/utils/stock-check.util';
import { allocateFefo, minExpiryForOnline } from '../../application/utils/fefo.util';
import {
  calculateCommission,
  calculateEarnedPoints,
  readPointRate,
  resolveTier,
} from '../../application/utils/loyalty.util';

const LOYALTY_SETTING_KEY = 'loyalty_config';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const CUSTOMER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  user: { select: { fullName: true, phone: true, email: true } },
} satisfies Prisma.CustomerSelect;

type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof CUSTOMER_SELECT }>;

interface LockedOrderRow {
  id: string;
  status: string;
  store_id: string;
  order_type: string;
  order_number: string;
  customer_id: string | null;
  sales_staff_id: string | null;
  coupon_id: string | null;
  loyalty_points_used: number;
  total_amount: Prisma.Decimal;
}

interface LockedInventoryRow {
  id: string;
  product_variant_id: string;
  quantity: number;
  reserved_quantity: number;
}

@Injectable()
export class PrismaAdminOrderRepository implements IAdminOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccessInfo(orderId: string): Promise<OrderAccessInfo | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, storeId: true, salesStaffId: true },
    });
  }

  async findDetail(orderId: string): Promise<AdminOrderDetail | null> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: CUSTOMER_SELECT },
        store: { select: { id: true, name: true, code: true } },
        coupon: { select: { code: true } },
        salesStaff: {
          select: { id: true, employeeCode: true, user: { select: { fullName: true } } },
        },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            variant: {
              select: {
                sku: true,
                images: { select: { imageUrl: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
                product: {
                  select: {
                    images: {
                      where: { isPrimary: true },
                      select: { imageUrl: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        payments: { orderBy: { createdAt: 'asc' } },
        refunds: { orderBy: { createdAt: 'asc' } },
        shipments: { orderBy: { createdAt: 'asc' } },
        statusHistories: {
          orderBy: { createdAt: 'asc' },
          include: { changer: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      orderType: row.orderType,
      status: row.status,
      subtotal: Number(row.subtotal),
      discountAmount: Number(row.discountAmount),
      shippingFee: Number(row.shippingFee),
      taxAmount: Number(row.taxAmount),
      totalAmount: Number(row.totalAmount),
      loyaltyPointsUsed: row.loyaltyPointsUsed,
      shippingAddress: row.shippingAddress as Record<string, unknown> | null,
      note: row.note,
      couponCode: row.coupon?.code ?? null,
      salesStaff: row.salesStaff
        ? {
            id: row.salesStaff.id,
            employeeCode: row.salesStaff.employeeCode,
            fullName: row.salesStaff.user.fullName,
          }
        : null,
      customer: this.toCustomerSummary(row.customer),
      store: row.store,
      items: row.items.map((item) => ({
        id: item.id,
        productVariantId: item.productVariantId,
        sku: item.variant.sku,
        productName: item.productName,
        variantName: item.variantName,
        // Ưu tiên ảnh riêng của biến thể, không có thì lấy ảnh chính của sản phẩm
        imageUrl:
          item.variant.images[0]?.imageUrl ?? item.variant.product.images[0]?.imageUrl ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        totalPrice: Number(item.totalPrice),
      })),
      payments: row.payments.map((p) => ({
        id: p.id,
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount),
        status: p.status,
        transactionId: p.transactionId,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      refunds: row.refunds.map((r) => ({
        id: r.id,
        paymentId: r.paymentId,
        amount: Number(r.amount),
        reason: r.reason,
        status: r.status,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      shipments: row.shipments.map((s) => ({
        id: s.id,
        shipmentCode: s.shipmentCode,
        carrierCode: s.carrierCode,
        trackingCode: s.trackingCode,
        status: s.status,
        createdAt: s.createdAt,
      })),
      statusHistory: row.statusHistories.map((h) => ({
        id: h.id,
        status: h.status,
        note: h.note,
        changedBy: h.changer,
        createdAt: h.createdAt,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async confirm(input: ConfirmOrderInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, input.orderId);
      OrderStateMachine.assertValidTransition(
        order.status as OrderStatus,
        OrderStatus.CONFIRMED,
        'ADMIN',
      );

      const items = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { productVariantId: true, productName: true, variantName: true, quantity: true },
      });
      const inventories = await this.lockInventories(
        tx,
        order.store_id,
        items.map((i) => i.productVariantId),
      );

      const shortages = findStockShortages(
        items,
        inventories.map((inv) => ({
          productVariantId: inv.product_variant_id,
          quantity: inv.quantity,
          reservedQuantity: inv.reserved_quantity,
        })),
        order.order_type === 'ONLINE',
      );
      if (shortages.length > 0) {
        throw new BadRequestException(
          `Không đủ tồn kho để xác nhận đơn: ${formatShortages(shortages)}`,
        );
      }

      await this.changeStatus(
        tx,
        order.id,
        OrderStatus.CONFIRMED,
        input.changedBy,
        input.note || 'Đơn hàng đã được xác nhận',
      );
    });
  }

  async updateStatus(input: UpdateOrderStatusInput): Promise<OrderStatusChangeResult> {
    // Xuất kho nhiều dòng tốn nhiều câu lệnh, mặc định 5 giây của Prisma dễ hết giờ với Neon
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, input.orderId);
      const target = input.target as OrderStatus;
      OrderStateMachine.assertValidTransition(order.status as OrderStatus, target, 'ADMIN');

      const result: OrderStatusChangeResult = {
        stockDeducted: false,
        codPaymentsCompleted: 0,
        loyalty: null,
        commissionAmount: null,
      };

      if (target === OrderStatus.SHIPPING) {
        await this.deductStockForShipping(tx, order, input.changedBy);
        result.stockDeducted = true;
      }

      if (target === OrderStatus.DELIVERED) {
        const paid = await tx.payment.updateMany({
          where: { orderId: order.id, paymentMethod: 'COD', status: 'PENDING' },
          data: { status: 'COMPLETED', paidAt: new Date() },
        });
        result.codPaymentsCompleted = paid.count;
      }

      if (target === OrderStatus.COMPLETED) {
        result.loyalty = await this.rewardCustomer(tx, order);
        result.commissionAmount = await this.createCommission(tx, order);
      }

      await this.changeStatus(
        tx,
        order.id,
        target,
        input.changedBy,
        input.note || `Chuyển trạng thái sang ${target}`,
      );
      return result;
    }, { timeout: 15000 });
  }

  // Tài liệu 04 mục 7: xuất kho giao vận trừ cả quantity lẫn reserved_quantity, trừ lô theo FEFO và ghi order_item_batches
  private async deductStockForShipping(
    tx: Prisma.TransactionClient,
    order: LockedOrderRow,
    changedBy: string,
  ): Promise<void> {
    const items = await tx.orderItem.findMany({
      where: { orderId: order.id },
      select: { id: true, productVariantId: true, productName: true, variantName: true, quantity: true },
    });
    const inventories = await this.lockInventories(
      tx,
      order.store_id,
      items.map((i) => i.productVariantId),
    );
    const reservedByOrder = order.order_type === 'ONLINE';
    const minExpiry = minExpiryForOnline(new Date());
    const note = `Xuất kho giao đơn ${order.order_number}`;

    for (const item of items) {
      const inv = inventories.find((i) => i.product_variant_id === item.productVariantId);
      if (!inv || inv.quantity < item.quantity) {
        throw new BadRequestException(
          `Không đủ tồn kho để xuất: ${item.productName} (${item.variantName}), cần ${item.quantity}, còn ${inv?.quantity ?? 0}`,
        );
      }

      const batches = await tx.$queryRaw<{ id: string; quantity: number; expiry_date: Date }[]>`
        SELECT id, quantity, expiry_date
        FROM batches
        WHERE store_id = ${order.store_id}::uuid
          AND product_variant_id = ${item.productVariantId}::uuid
          AND is_active = true
        ORDER BY id
        FOR UPDATE
      `;

      // Dữ liệu cũ chưa nhập lô (trước luồng nhập kho Sprint 3): chỉ trừ tồn tổng
      if (batches.length === 0) {
        await tx.inventoryTransaction.create({
          data: {
            storeId: order.store_id,
            productVariantId: item.productVariantId,
            transactionType: 'OUT',
            quantity: -item.quantity,
            referenceType: 'ORDER',
            referenceId: order.id,
            note,
            createdBy: changedBy,
          },
        });
      } else {
        const { allocations, shortfall } = allocateFefo(
          batches.map((b) => ({ id: b.id, quantity: b.quantity, expiryDate: b.expiry_date })),
          item.quantity,
          minExpiry,
        );
        if (shortfall > 0) {
          throw new BadRequestException(
            `Không đủ hàng còn hạn từ 3 tháng trở lên để giao đơn online: ${item.productName} (${item.variantName}), thiếu ${shortfall}`,
          );
        }
        for (const a of allocations) {
          await tx.batch.update({ where: { id: a.batchId }, data: { quantity: { decrement: a.quantity } } });
          await tx.orderItemBatch.create({
            data: { orderItemId: item.id, batchId: a.batchId, quantity: a.quantity },
          });
          await tx.inventoryTransaction.create({
            data: {
              storeId: order.store_id,
              productVariantId: item.productVariantId,
              batchId: a.batchId,
              transactionType: 'OUT',
              quantity: -a.quantity,
              referenceType: 'ORDER',
              referenceId: order.id,
              note,
              createdBy: changedBy,
            },
          });
        }
      }

      await tx.inventory.update({
        where: { id: inv.id },
        data: {
          quantity: { decrement: item.quantity },
          ...(reservedByOrder ? { reservedQuantity: { decrement: item.quantity } } : {}),
        },
      });
    }
  }

  private async rewardCustomer(
    tx: Prisma.TransactionClient,
    order: LockedOrderRow,
  ): Promise<OrderStatusChangeResult['loyalty']> {
    if (!order.customer_id) {
      return null;
    }

    const totalAmount = Number(order.total_amount);
    const [customer, setting, tiers] = await Promise.all([
      tx.customer.findUniqueOrThrow({
        where: { id: order.customer_id },
        select: { totalPoints: true, loyaltyTierId: true, loyaltyTier: { select: { pointMultiplier: true } } },
      }),
      tx.setting.findUnique({ where: { key: LOYALTY_SETTING_KEY } }),
      tx.loyaltyTier.findMany({ select: { id: true, name: true, minPoints: true } }),
    ]);

    const pointRate = readPointRate(setting?.value);
    const multiplier = Number(customer.loyaltyTier?.pointMultiplier ?? 1);
    const pointsEarned = pointRate ? calculateEarnedPoints(totalAmount, pointRate, multiplier) : 0;
    const newTier = resolveTier(tiers, customer.totalPoints + pointsEarned);
    const tierChanged = newTier !== null && newTier.id !== customer.loyaltyTierId;

    await tx.customer.update({
      where: { id: order.customer_id },
      data: {
        totalPoints: { increment: pointsEarned },
        totalSpent: { increment: totalAmount },
        totalOrders: { increment: 1 },
        ...(tierChanged ? { loyaltyTierId: newTier.id } : {}),
      },
    });

    if (pointsEarned > 0) {
      await tx.loyaltyPointsTransaction.create({
        data: {
          customerId: order.customer_id,
          orderId: order.id,
          points: pointsEarned,
          type: 'EARN',
          description: `Tích điểm đơn hàng ${order.order_number}`,
        },
      });
    }

    return {
      configured: pointRate !== null,
      pointsEarned,
      newTierName: tierChanged ? newTier.name : null,
    };
  }

  private async createCommission(
    tx: Prisma.TransactionClient,
    order: LockedOrderRow,
  ): Promise<number | null> {
    if (!order.sales_staff_id) {
      return null;
    }
    const employee = await tx.employee.findUnique({
      where: { id: order.sales_staff_id },
      select: { commissionRate: true },
    });
    const rate = Number(employee?.commissionRate ?? 0);
    if (rate <= 0) {
      return null;
    }

    const amount = calculateCommission(Number(order.total_amount), rate);
    const vnNow = new Date(Date.now() + VN_OFFSET_MS);
    await tx.commission.create({
      data: {
        employeeId: order.sales_staff_id,
        orderId: order.id,
        amount,
        rate,
        periodMonth: vnNow.getUTCMonth() + 1,
        periodYear: vnNow.getUTCFullYear(),
      },
    });
    return amount;
  }

  // SELECT ... FOR UPDATE: giữ khóa dòng đơn tới hết transaction, hai người thao tác cùng lúc sẽ phải xếp hàng
  private async lockOrder(tx: Prisma.TransactionClient, orderId: string): Promise<LockedOrderRow> {
    const rows = await tx.$queryRaw<LockedOrderRow[]>`
      SELECT id, status, store_id, order_type, order_number, customer_id, sales_staff_id,
             coupon_id, loyalty_points_used, total_amount
      FROM orders
      WHERE id = ${orderId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return rows[0];
  }

  private async lockInventories(
    tx: Prisma.TransactionClient,
    storeId: string,
    variantIds: string[],
  ): Promise<LockedInventoryRow[]> {
    if (variantIds.length === 0) {
      return [];
    }
    // Khóa theo thứ tự id cố định để hai giao dịch cùng khóa nhiều dòng không chờ nhau vòng tròn (deadlock)
    return tx.$queryRaw<LockedInventoryRow[]>`
      SELECT id, product_variant_id, quantity, reserved_quantity
      FROM inventory
      WHERE store_id = ${storeId}::uuid
        AND product_variant_id = ANY(${variantIds}::uuid[])
      ORDER BY id
      FOR UPDATE
    `;
  }

  private async changeStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
    status: OrderStatus,
    changedBy: string,
    note: string,
  ): Promise<void> {
    await tx.order.update({ where: { id: orderId }, data: { status } });
    await tx.orderStatusHistory.create({ data: { orderId, status, note, changedBy } });
  }

  async findMany(
    query: AdminOrderListQuery,
  ): Promise<{ items: AdminOrderListItem[]; total: number }> {
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ [query.sortBy]: query.order }, { id: 'asc' }],
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: { select: CUSTOMER_SELECT },
          store: { select: { id: true, name: true, code: true } },
          payments: {
            select: { paymentMethod: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      orderType: row.orderType,
      status: row.status,
      totalAmount: Number(row.totalAmount),
      itemCount: row._count.items,
      paymentMethod: row.payments[0]?.paymentMethod ?? null,
      paymentStatus: row.payments[0]?.status ?? null,
      customer: this.toCustomerSummary(row.customer),
      store: row.store,
      createdAt: row.createdAt,
    }));

    return { items, total };
  }

  private buildWhere(query: AdminOrderListQuery): Prisma.OrderWhereInput {
    const conditions: Prisma.OrderWhereInput[] = [this.scopeWhere(query.scope)];

    if (query.status) conditions.push({ status: query.status });
    if (query.orderType) conditions.push({ orderType: query.orderType });
    if (query.storeId) conditions.push({ storeId: query.storeId });
    if (query.customerId) conditions.push({ customerId: query.customerId });
    if (query.from || query.to) {
      conditions.push({ createdAt: { gte: query.from, lt: query.to } });
    }
    if (query.search) {
      conditions.push({ orderNumber: { contains: query.search, mode: 'insensitive' } });
    }

    return { AND: conditions };
  }

  private scopeWhere(scope: AdminOrderScopeFilter): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (scope.storeIds) where.storeId = { in: scope.storeIds };
    if (scope.salesStaffId) where.salesStaffId = scope.salesStaffId;
    return where;
  }

  private toCustomerSummary(customer: CustomerRow | null): OrderCustomerSummary | null {
    if (!customer) {
      return null;
    }
    // Khách POS có thể chưa có tài khoản, nên ưu tiên thông tin trên hồ sơ khách rồi mới tới tài khoản
    return {
      id: customer.id,
      fullName: customer.fullName ?? customer.user?.fullName ?? null,
      phone: customer.phone ?? customer.user?.phone ?? null,
      email: customer.user?.email ?? null,
    };
  }
}
