import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { startOfVnToday } from '@core/utils/expiry-policy.util';
import { allocateFefo, FefoAllocation } from '@modules/orders/application/utils/fefo.util';
import {
  calculateCommission,
  calculateEarnedPoints,
  readPointRate,
  resolveTier,
} from '@modules/orders/application/utils/loyalty.util';
import {
  CreatePosSaleCommand,
  PosCreatedSale,
  PosDiscountType,
  PosPromotionRule,
  PosReceipt,
  PosSaleContext,
  PosSaleVariant,
} from '../../domain/entities/pos-sale.entity';
import {
  IPosOrderRepository,
  PosSaleContextQuery,
} from '../../domain/repositories/pos-order.repository.interface';
import { vnDay } from '../../application/utils/vn-day.util';

const LOYALTY_SETTING_KEY = 'loyalty_config';
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const toIdList = (value: Prisma.JsonValue | null): string[] | null =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : null;

const variantNameOf = (v: {
  option1Value: string | null;
  option2Value: string | null;
  option3Value: string | null;
}): string | null => {
  const options = [v.option1Value, v.option2Value, v.option3Value].filter(Boolean);
  return options.length ? options.join(' / ') : null;
};

interface LockedInventoryRow {
  id: string;
  product_variant_id: string;
  quantity: number;
  reserved_quantity: number;
}

interface LockedBatchRow {
  id: string;
  quantity: number;
  expiry_date: Date;
}

@Injectable()
export class PrismaPosOrderRepository implements IPosOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadSaleContext(query: PosSaleContextQuery): Promise<PosSaleContext> {
    const [variantRows, promotionRows, coupon, customer, employee, setting] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: query.variantIds } },
        include: {
          product: { select: { id: true, name: true, isActive: true, categoryId: true } },
          inventory: {
            where: { storeId: query.storeId },
            select: { quantity: true, reservedQuantity: true },
          },
          batches: {
            where: { storeId: query.storeId, isActive: true, quantity: { gt: 0 } },
            select: { quantity: true, expiryDate: true },
          },
        },
      }),
      this.prisma.promotion.findMany({
        where: {
          isActive: true,
          type: { in: ['PERCENTAGE', 'FIXED_AMOUNT'] },
          startDate: { lte: query.now },
          endDate: { gte: query.now },
        },
        orderBy: { id: 'asc' },
      }),
      query.couponCode
        ? this.prisma.coupon.findFirst({
            where: { code: { equals: query.couponCode, mode: 'insensitive' } },
          })
        : Promise.resolve(null),
      query.customerId
        ? this.prisma.customer.findUnique({
            where: { id: query.customerId },
            include: { loyaltyTier: { select: { pointMultiplier: true } } },
          })
        : Promise.resolve(null),
      this.prisma.employee.findUnique({
        where: { userId: query.cashierUserId },
        select: { id: true, commissionRate: true },
      }),
      this.prisma.setting.findUnique({ where: { key: LOYALTY_SETTING_KEY } }),
    ]);

    const today = startOfVnToday(query.now);
    const variants: PosSaleVariant[] = variantRows.map((row) => ({
      variantId: row.id,
      productId: row.product.id,
      categoryId: row.product.categoryId,
      productName: row.product.name,
      variantName: variantNameOf(row),
      sku: row.sku,
      price: Number(row.price),
      cost: Number(row.costPrice),
      isActive: row.isActive,
      productActive: row.product.isActive,
      onHand: row.inventory[0]?.quantity ?? 0,
      reserved: row.inventory[0]?.reservedQuantity ?? 0,
      expiredQuantity: row.batches
        .filter((b) => b.expiryDate.getTime() < today.getTime())
        .reduce((sum, b) => sum + b.quantity, 0),
    }));

    const promotions: PosPromotionRule[] = promotionRows.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type as PosDiscountType,
      value: Number(p.value),
      minOrderAmount: Number(p.minOrderAmount),
      maxDiscountAmount: p.maxDiscountAmount === null ? null : Number(p.maxDiscountAmount),
      productIds: toIdList(p.applicableProducts),
      categoryIds: toIdList(p.applicableCategories),
      usageLimit: p.usageLimit,
      usedCount: p.usedCount,
    }));

    const couponUsageCount =
      coupon && customer
        ? await this.prisma.couponUsage.count({
            where: { couponId: coupon.id, customerId: customer.id },
          })
        : 0;

    return {
      variants,
      promotions,
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            customerId: coupon.customerId,
            discountType: coupon.discountType as PosDiscountType,
            discountValue: Number(coupon.discountValue),
            minOrderAmount: Number(coupon.minOrderAmount),
            maxUses: coupon.maxUses,
            usedCount: coupon.usedCount,
            maxUsesPerCustomer: coupon.maxUsesPerCustomer,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            isActive: coupon.isActive,
          }
        : null,
      couponUsageCount,
      customer: customer
        ? {
            id: customer.id,
            fullName: customer.fullName,
            phone: customer.phone,
            totalPoints: customer.totalPoints,
            pointMultiplier: Number(customer.loyaltyTier?.pointMultiplier ?? 1),
          }
        : null,
      employee: employee
        ? { id: employee.id, commissionRate: Number(employee.commissionRate) }
        : null,
      pointRate: readPointRate(setting?.value),
    };
  }

  createSale(command: CreatePosSaleCommand): Promise<PosCreatedSale> {
    return this.prisma.$transaction((tx) => this.writeSale(tx, command), { timeout: 20000 });
  }

  private async writeSale(
    tx: Prisma.TransactionClient,
    cmd: CreatePosSaleCommand,
  ): Promise<PosCreatedSale> {
    const { pricing, settlement } = cmd;
    const now = new Date();
    const cashApplied = settlement.payments.find((p) => p.method === 'CASH')?.amount ?? 0;

    // Cập nhật ca trước tiên: vừa khóa dòng ca, vừa chứng minh ca còn mở lúc ghi (chưa bị đóng giữa chừng)
    const { count: sessionRows } = await tx.posSession.updateMany({
      where: {
        id: cmd.sessionId,
        status: 'OPEN',
        storeId: cmd.storeId,
        cashierId: cmd.cashierUserId,
      },
      data: { systemCash: { increment: cashApplied } },
    });
    if (sessionRows === 0) {
      throw new ConflictException('Ca POS đã đóng hoặc không còn hiệu lực, vui lòng tải lại');
    }

    let customerState: { totalPoints: number; multiplier: number } | null = null;
    if (cmd.customerId) {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${cmd.customerId}::uuid FOR UPDATE`;
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: cmd.customerId },
        include: { loyaltyTier: { select: { pointMultiplier: true } } },
      });
      if (customer.totalPoints < pricing.pointsUsed) {
        throw new ConflictException('Điểm thưởng của khách không còn đủ, vui lòng tải lại');
      }
      customerState = {
        totalPoints: customer.totalPoints,
        multiplier: Number(customer.loyaltyTier?.pointMultiplier ?? 1),
      };
    }

    if (cmd.couponId && cmd.customerId) {
      const coupon = await tx.coupon.findUniqueOrThrow({ where: { id: cmd.couponId } });
      const used = await tx.couponUsage.count({
        where: { couponId: cmd.couponId, customerId: cmd.customerId },
      });
      if (used >= coupon.maxUsesPerCustomer) {
        throw new ConflictException('Khách đã dùng hết lượt cho mã giảm giá này');
      }
      const updated = await tx.$executeRaw`
        UPDATE coupons SET used_count = used_count + 1
        WHERE id = ${cmd.couponId}::uuid AND is_active = true
          AND (max_uses IS NULL OR used_count < max_uses)`;
      if (updated === 0) {
        throw new ConflictException('Mã giảm giá vừa hết lượt sử dụng');
      }
    }

    for (const promotionId of cmd.promotionIds) {
      const updated = await tx.$executeRaw`
        UPDATE promotions SET used_count = used_count + 1
        WHERE id = ${promotionId}::uuid
          AND (usage_limit IS NULL OR used_count < usage_limit)`;
      if (updated === 0) {
        throw new ConflictException('Chương trình khuyến mãi vừa hết lượt, vui lòng tính lại đơn');
      }
    }

    const variantIds = pricing.lines.map((l) => l.variantId);
    // Khóa theo thứ tự id cố định để hai giao dịch cùng khóa nhiều dòng không chờ nhau vòng tròn
    const inventories = await tx.$queryRaw<LockedInventoryRow[]>`
      SELECT id, product_variant_id, quantity, reserved_quantity
      FROM inventory
      WHERE store_id = ${cmd.storeId}::uuid
        AND product_variant_id = ANY(${variantIds}::uuid[])
      ORDER BY id
      FOR UPDATE`;

    const today = startOfVnToday(now);
    const allocationsByVariant = new Map<string, FefoAllocation[]>();
    for (const line of pricing.lines) {
      const inv = inventories.find((i) => i.product_variant_id === line.variantId);
      const available = inv ? inv.quantity - inv.reserved_quantity : 0;
      if (!inv || available < line.quantity) {
        throw new ConflictException(
          `Không đủ hàng: ${line.productName}${line.variantName ? ` (${line.variantName})` : ''}, cần ${line.quantity}, còn bán được ${Math.max(available, 0)}`,
        );
      }
      const batches = await tx.$queryRaw<LockedBatchRow[]>`
        SELECT id, quantity, expiry_date
        FROM batches
        WHERE store_id = ${cmd.storeId}::uuid
          AND product_variant_id = ${line.variantId}::uuid
          AND is_active = true
        ORDER BY id
        FOR UPDATE`;
      if (batches.length === 0) {
        allocationsByVariant.set(line.variantId, []);
        continue;
      }
      // BR-04/05: lô hết hạn bị loại, lô cận date vẫn bán được ở POS
      const { allocations, shortfall } = allocateFefo(
        batches.map((b) => ({ id: b.id, quantity: b.quantity, expiryDate: b.expiry_date })),
        line.quantity,
        today,
      );
      if (shortfall > 0) {
        throw new ConflictException(
          `Không đủ hàng còn hạn: ${line.productName}${line.variantName ? ` (${line.variantName})` : ''}, thiếu ${shortfall}`,
        );
      }
      allocationsByVariant.set(line.variantId, allocations);
    }

    const orderNumber = await this.nextOrderNumber(tx, cmd.orderNumberDate);
    const discountTotal = pricing.promotionDiscount + pricing.couponDiscount + pricing.pointsDiscount;
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: cmd.customerId,
        storeId: cmd.storeId,
        orderType: 'POS',
        posSessionId: cmd.sessionId,
        status: 'COMPLETED',
        subtotal: pricing.subtotal,
        discountAmount: discountTotal,
        shippingFee: 0,
        taxAmount: 0,
        totalAmount: pricing.total,
        note: cmd.note,
        couponId: cmd.couponId,
        loyaltyPointsUsed: pricing.pointsUsed,
        salesStaffId: cmd.employee?.id ?? null,
      },
    });

    const note = `Bán tại quầy ${orderNumber}`;
    for (const line of pricing.lines) {
      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productVariantId: line.variantId,
          promotionId: line.promotionId,
          productName: line.productName,
          variantName: line.variantName ?? line.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost,
          discountAmount: line.discountAmount,
          pointsDiscount: line.pointsDiscount,
          totalPrice: line.lineTotal,
        },
      });

      const allocations = allocationsByVariant.get(line.variantId) ?? [];
      if (allocations.length === 0) {
        await tx.inventoryTransaction.create({
          data: {
            storeId: cmd.storeId,
            productVariantId: line.variantId,
            transactionType: 'OUT',
            quantity: -line.quantity,
            referenceType: 'ORDER',
            referenceId: order.id,
            note,
            createdBy: cmd.cashierUserId,
          },
        });
      }
      for (const a of allocations) {
        await tx.batch.update({
          where: { id: a.batchId },
          data: { quantity: { decrement: a.quantity } },
        });
        await tx.orderItemBatch.create({
          data: { orderItemId: item.id, batchId: a.batchId, quantity: a.quantity },
        });
        await tx.inventoryTransaction.create({
          data: {
            storeId: cmd.storeId,
            productVariantId: line.variantId,
            batchId: a.batchId,
            transactionType: 'OUT',
            quantity: -a.quantity,
            referenceType: 'ORDER',
            referenceId: order.id,
            note,
            createdBy: cmd.cashierUserId,
          },
        });
      }

      const inv = inventories.find((i) => i.product_variant_id === line.variantId)!;
      await tx.inventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: line.quantity } },
      });
    }

    for (const p of settlement.payments) {
      await tx.payment.create({
        data: {
          orderId: order.id,
          posSessionId: cmd.sessionId,
          paymentMethod: p.method,
          amount: p.amount,
          tenderedAmount: p.tenderedAmount,
          status: 'COMPLETED',
          paidAt: now,
        },
      });
    }

    if (cmd.couponId && cmd.customerId) {
      await tx.couponUsage.create({
        data: {
          couponId: cmd.couponId,
          customerId: cmd.customerId,
          orderId: order.id,
          discountAmount: pricing.couponDiscount,
        },
      });
    }

    let pointsEarned = 0;
    let pointsNote: string | null = null;
    let tierName: string | null = null;
    let tierChanged = false;
    if (cmd.customerId && customerState) {
      if (cmd.pointRate) {
        pointsEarned = calculateEarnedPoints(pricing.total, cmd.pointRate, customerState.multiplier);
      } else {
        pointsNote = 'Chưa cấu hình tỷ lệ tích điểm (settings: loyalty_config) nên chưa cộng điểm.';
      }

      if (pricing.pointsUsed > 0) {
        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId: cmd.customerId,
            orderId: order.id,
            points: -pricing.pointsUsed,
            type: 'REDEEM',
            description: `Sử dụng điểm cho đơn hàng ${orderNumber}`,
          },
        });
      }
      if (pointsEarned > 0) {
        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId: cmd.customerId,
            orderId: order.id,
            points: pointsEarned,
            type: 'EARN',
            description: `Tích điểm đơn hàng ${orderNumber}`,
          },
        });
      }

      const tiers = await tx.loyaltyTier.findMany({
        select: { id: true, name: true, minPoints: true },
      });
      const newTotalPoints = customerState.totalPoints - pricing.pointsUsed + pointsEarned;
      const newTier = resolveTier(tiers, newTotalPoints);
      const current = await tx.customer.findUniqueOrThrow({
        where: { id: cmd.customerId },
        select: { loyaltyTierId: true },
      });
      tierChanged = newTier !== null && newTier.id !== current.loyaltyTierId;
      tierName = newTier?.name ?? null;
      await tx.customer.update({
        where: { id: cmd.customerId },
        data: {
          totalPoints: newTotalPoints,
          totalSpent: { increment: pricing.total },
          totalOrders: { increment: 1 },
          ...(tierChanged && newTier ? { loyaltyTierId: newTier.id } : {}),
        },
      });
    }

    let commissionAmount = 0;
    if (cmd.employee && cmd.employee.commissionRate > 0) {
      commissionAmount = calculateCommission(pricing.total, cmd.employee.commissionRate);
      if (commissionAmount > 0) {
        const vn = new Date(now.getTime() + VN_OFFSET_MS);
        await tx.commission.create({
          data: {
            employeeId: cmd.employee.id,
            orderId: order.id,
            amount: commissionAmount,
            rate: cmd.employee.commissionRate,
            periodMonth: vn.getUTCMonth() + 1,
            periodYear: vn.getUTCFullYear(),
          },
        });
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'COMPLETED',
        note: 'Bán tại quầy POS, hoàn tất ngay',
        changedBy: cmd.cashierUserId,
      },
    });

    return {
      orderId: order.id,
      orderNumber,
      createdAt: order.createdAt,
      pointsEarned,
      pointsNote,
      tierName,
      tierChanged,
      commissionAmount,
    };
  }

  // Khóa advisory để hai đơn POS cùng lúc không lấy trùng số; lấy số lớn nhất trong ngày + 1
  private async nextOrderNumber(tx: Prisma.TransactionClient, at: Date): Promise<string> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('order_number'))`;
    const prefix = `POS${vnDay(at).ymd}`;
    const last = await tx.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const seq = last ? Number(last.orderNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async findReceipt(orderId: string): Promise<PosReceipt | null> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, orderType: 'POS' },
      include: {
        store: { select: { code: true, name: true } },
        posSession: {
          select: { id: true, sessionCode: true, cashierId: true, cashier: { select: { fullName: true } } },
        },
        customer: { select: { id: true, fullName: true, phone: true } },
        items: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
        couponUsage: { include: { coupon: { select: { code: true } } } },
        loyaltyTransactions: { where: { type: 'EARN' } },
      },
    });
    if (!order) {
      return null;
    }

    const items = order.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      discountAmount: Number(i.discountAmount),
      pointsDiscount: Number(i.pointsDiscount),
      lineTotal: Number(i.totalPrice),
      lineNetTotal: Number(i.totalPrice) - Number(i.pointsDiscount),
    }));
    const couponDiscount = Number(order.couponUsage?.discountAmount ?? 0);
    const itemDiscounts = items.reduce((s, i) => s + i.discountAmount, 0);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      storeId: order.storeId,
      store: order.store,
      session: order.posSession
        ? {
            id: order.posSession.id,
            code: order.posSession.sessionCode,
            cashierId: order.posSession.cashierId,
          }
        : null,
      cashierName: order.posSession?.cashier.fullName ?? null,
      customer: order.customer,
      items,
      subtotal: Number(order.subtotal),
      promotionDiscount: itemDiscounts - couponDiscount,
      couponDiscount,
      couponCode: order.couponUsage?.coupon.code ?? null,
      pointsUsed: order.loyaltyPointsUsed,
      pointsDiscount: items.reduce((s, i) => s + i.pointsDiscount, 0),
      total: Number(order.totalAmount),
      pointsEarned: order.loyaltyTransactions.reduce((s, t) => s + t.points, 0),
      payments: order.payments.map((p) => ({
        method: p.paymentMethod,
        amount: Number(p.amount),
        tenderedAmount: p.tenderedAmount === null ? null : Number(p.tenderedAmount),
      })),
    };
  }
}
