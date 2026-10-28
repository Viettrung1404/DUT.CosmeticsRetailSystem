import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { notifyCustomer } from '@core/services/customer-events';
import { Tx, lockCustomer } from '../infrastructure/commands';
import { configuration } from '../domain/policy';
import { evaluateTier } from './loyalty.service';
import { allocateMoney } from '../domain/money';
import { availableFunding } from '../infrastructure/exchange-funding';

/** Internal integration surface. Admin controllers must enforce permissions and store scope.
 * Call with the SAME tx used to inspect/restock, write provider results or update shipments.
 * No client-facing method can manufacture a successful refund or a carrier event.
 */
@Injectable()
export class CustomerEventIntegration {
  async returnStatusChanged(
    tx: Tx,
    returnId: string,
    actorId: string,
    eventId: string,
    publicNote?: string,
  ) {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { status: true, roleId: true },
    });
    if (!actor || actor.status !== 'ACTIVE' || actor.roleId === 6)
      throw new ForbiddenException('ADMIN_WORKFLOW_REQUIRED');
    const row = await tx.returnOrder.findUniqueOrThrow({
      where: { id: returnId },
    });
    const eventKey = `${returnId}:${eventId}`;
    const existing = await tx.returnStatusHistory.findUnique({
      where: { eventKey },
    });
    if (existing && existing.status !== row.status)
      throw new ConflictException('RETURN_EVENT_MISMATCH');
    await tx.returnStatusHistory.upsert({
      where: { eventKey },
      update: {},
      create: {
        eventKey,
        returnOrderId: returnId,
        status: row.status,
        changedBy: actorId,
        note: publicNote?.slice(0, 500),
      },
    });
    await notifyCustomer(
      tx,
      row.customerId,
      `RETURN:${returnId}:${eventId}`,
      `Yêu cầu đổi trả: ${row.status}`,
      'RETURN',
      { returnId, status: row.status },
    );
  }
  async shipmentChanged(
    tx: Tx,
    input: {
      shipmentId: string;
      carrierCode: string;
      eventId: string;
      status: string;
      occurredAt: Date;
    },
  ) {
    await tx.$queryRaw`SELECT id FROM shipments WHERE id=${input.shipmentId}::uuid FOR UPDATE`;
    const row = await tx.shipment.findUniqueOrThrow({
      where: { id: input.shipmentId },
      include: { order: true },
    });
    if (row.carrierCode !== input.carrierCode)
      throw new ConflictException('CARRIER_MISMATCH');
    const previous = await tx.shipmentEvent.findUnique({
      where: {
        carrierCode_eventId: {
          carrierCode: input.carrierCode,
          eventId: input.eventId,
        },
      },
    });
    if (previous) {
      if (
        previous.shipmentId !== input.shipmentId ||
        previous.status !== input.status ||
        previous.occurredAt.getTime() !== input.occurredAt.getTime()
      ) {
        throw new ConflictException('CARRIER_EVENT_MISMATCH');
      }
      return;
    }
    const latest = await tx.shipmentEvent.findFirst({
      where: { shipmentId: row.id },
      orderBy: { occurredAt: 'desc' },
    });
    await tx.shipmentEvent.create({ data: input });
    if (!latest || input.occurredAt >= latest.occurredAt) {
      await tx.shipment.update({
        where: { id: row.id },
        data: { status: input.status },
      });
      await notifyCustomer(
        tx,
        row.order.customerId,
        `SHIPMENT:${row.id}:${input.eventId}`,
        'Trạng thái giao hàng đã thay đổi',
        'SHIPMENT',
        { orderId: row.orderId, shipmentId: row.id, status: input.status },
      );
    }
  }
  async refundCompleted(tx: Tx, refundId: string) {
    const refund = await tx.refund.findUniqueOrThrow({
      where: { id: refundId },
      include: { order: true },
    });
    if (refund.status !== 'COMPLETED' || !refund.processedAt)
      throw new ConflictException('REFUND_NOT_COMPLETED');
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${refund.orderId}::uuid FOR UPDATE`;
    const payment = refund.paymentId
      ? await tx.payment.findUnique({ where: { id: refund.paymentId } })
      : null;
    if (
      !payment ||
      payment.orderId !== refund.orderId ||
      payment.status !== 'COMPLETED'
    )
      throw new ConflictException('REFUND_PAYMENT_MISMATCH');
    const refunded = await tx.refund.aggregate({
      where: { paymentId: payment.id, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    if (new Prisma.Decimal(refunded._sum.amount ?? 0).gt(payment.amount))
      throw new ConflictException('REFUND_LIMIT_EXCEEDED');
    await notifyCustomer(
      tx,
      refund.order.customerId,
      `REFUND:${refundId}:COMPLETED`,
      'Hoàn tiền thành công',
      'REFUND',
      { orderId: refund.orderId, refundId, returnId: refund.returnOrderId },
    );
  }
  /** Reserve actual cash refunds against original completed payments. Safe to retry. */
  async reserveRefund(
    tx: Tx,
    returnId: string,
    amount: number,
    operation = 'RMA',
  ) {
    const row = await tx.returnOrder.findUniqueOrThrow({
      where: { id: returnId },
    });
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${row.orderId}::uuid FOR UPDATE`;
    const prefix = `${operation}:${returnId}:PAYMENT:`;
    const existing = await tx.refund.findMany({
      where: { returnOrderId: returnId, eventKey: { startsWith: prefix } },
    });
    if (existing.length) {
      if (existing.some((refund) => refund.status === 'FAILED'))
        throw new ConflictException('REFUND_RETRY_REQUIRES_ADMIN');
      const reserved = existing.reduce(
        (sum, item) => sum.add(item.amount),
        new Prisma.Decimal(0),
      );
      if (!reserved.eq(amount))
        throw new ConflictException('REFUND_AMOUNT_CHANGED');
      return;
    }
    let remaining = new Prisma.Decimal(amount);
    for (const source of await availableFunding(tx, row.orderId)) {
      const value = Prisma.Decimal.min(source.available, remaining);
      if (value.gt(0)) {
        await tx.refund.create({
          data: {
            orderId: source.orderId,
            returnOrderId: returnId,
            paymentId: source.paymentId,
            amount: value,
            reason: row.reason,
            status: 'PENDING',
            eventKey: `${prefix}${source.paymentId}`,
          },
        });
        remaining = remaining.minus(value);
      }
    }
    if (remaining.gt(0))
      throw new ConflictException('REFUND_EXCEEDS_AVAILABLE_PAYMENTS');
  }
  /** Finalize only after inspection/restock and actual refunds, using explicit configured accounting policy. */
  async completeReturn(tx: Tx, returnId: string, actorId: string) {
    const identity = await tx.returnOrder.findUniqueOrThrow({
      where: { id: returnId },
      select: { orderId: true },
    });
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${identity.orderId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM return_orders WHERE id=${returnId}::uuid FOR UPDATE`;
    const row = await tx.returnOrder.findUniqueOrThrow({
      where: { id: returnId },
      include: {
        items: true,
        settlement: true,
        order: true,
        refunds: true,
      },
    });
    if (row.status === 'COMPLETED') return;
    if (
      row.status !== 'INSPECTED' ||
      row.items.some(
        (item) => !['RESALEABLE', 'DAMAGED'].includes(item.condition ?? ''),
      )
    )
      throw new ConflictException('INSPECTION_REQUIRED');
    const config = await tx.setting.findUnique({
      where: { key: 'return_accounting' },
    });
    const policy = configuration<{ totalOrdersMode: string }>(
      config?.value,
      (v) =>
        v.earnedPointsReversal === 'PROPORTIONAL' &&
        v.allowPointDebt === true &&
        v.stats === 'NET_CASH_VALUE' &&
        ['KEEP_COMPLETED_PURCHASES', 'REMOVE_FULLY_RETURNED_ORDERS'].includes(
          v.totalOrdersMode,
        ),
      'return_accounting',
    );
    const credit = row.items.reduce(
      (sum, item) => sum.add(item.refundAmount),
      new Prisma.Decimal(0),
    );
    const cashDue =
      row.returnType === 'EXCHANGE'
        ? row.settlement?.status === 'CANCELLED'
          ? row.settlement.returnCredit
          : row.settlement?.refundDue
        : credit;
    if (cashDue === undefined || cashDue === null)
      throw new ConflictException('EXCHANGE_NOT_ACCEPTED');
    const successful = row.refunds
      .filter((refund) => refund.status === 'COMPLETED')
      .reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
    if (!successful.eq(cashDue)) throw new ConflictException('REFUND_PENDING');
    if (
      row.items.some(
        (item) =>
          item.condition === 'RESALEABLE' &&
          (!item.restockBatchId || !item.restockStoreId),
      )
    ) {
      throw new ConflictException('RESTOCK_TRACEABILITY_REQUIRED');
    }
    await lockCustomer(tx, row.customerId);
    const previous = await tx.loyaltyPointsTransaction.findUnique({
      where: { eventKey: `RETURN:${row.id}:ACCOUNTING` },
    });
    if (!previous) {
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: row.customerId },
      });
      if (customer.totalSpent.lt(credit))
        throw new ConflictException('CUSTOMER_TOTALS_RECONCILIATION_REQUIRED');
      const value = row.items.reduce(
        (sum, item) => sum.add(item.pointsValue),
        new Prisma.Decimal(0),
      );
      const completedValue = await tx.returnOrderItem.aggregate({
        where: { returnOrder: { orderId: row.orderId, status: 'COMPLETED' } },
        _sum: { pointsValue: true, pointsToRestore: true },
      });
      const pointRate = (
        row.order.pricingSnapshot as { pointsValueVnd?: number } | null
      )?.pointsValueVnd;
      if (value.gt(0) && (!pointRate || pointRate <= 0))
        throw new ConflictException('HISTORICAL_POINT_VALUE_REQUIRED');
      const restored = value.gt(0)
        ? Math.min(
            row.order.loyaltyPointsUsed -
              (completedValue._sum.pointsToRestore ?? 0),
            new Prisma.Decimal(completedValue._sum.pointsValue ?? 0)
              .add(value)
              .div(pointRate!)
              .floor()
              .toNumber() - (completedValue._sum.pointsToRestore ?? 0),
          )
        : 0;
      const shares = allocateMoney(
        restored / 100,
        row.items.map((item) => item.pointsValue),
      ).map((n) => Math.round(n * 100));
      for (let i = 0; i < row.items.length; i++)
        await tx.returnOrderItem.update({
          where: { id: row.items[i].id },
          data: { pointsToRestore: shares[i] },
        });
      const earned = await tx.loyaltyPointsTransaction.aggregate({
        where: {
          orderId: row.orderId,
          customerId: row.customerId,
          type: 'EARN',
        },
        _sum: { points: true },
      });
      const earlier = await tx.returnOrderItem.aggregate({
        where: { returnOrder: { orderId: row.orderId, status: 'COMPLETED' } },
        _sum: { refundAmount: true },
      });
      const before = new Prisma.Decimal(earlier._sum.refundAmount ?? 0);
      const points =
        Number(row.order.totalAmount) > 0
          ? new Prisma.Decimal(earned._sum.points ?? 0)
              .mul(before.add(credit))
              .div(row.order.totalAmount)
              .floor()
              .minus(
                new Prisma.Decimal(earned._sum.points ?? 0)
                  .mul(before)
                  .div(row.order.totalAmount)
                  .floor(),
              )
              .toNumber()
          : 0;
      await tx.loyaltyPointsTransaction.create({
        data: {
          customerId: row.customerId,
          orderId: row.orderId,
          type: 'REFUND',
          points: restored,
          eventKey: `RETURN:${row.id}:RESTORE`,
          description: 'Hoàn điểm đã sử dụng',
        },
      });
      await tx.loyaltyPointsTransaction.create({
        data: {
          customerId: row.customerId,
          orderId: row.orderId,
          type: 'ADJUST',
          points: -points,
          eventKey: `RETURN:${row.id}:EARN_REVERSAL`,
          description: 'Thu hồi điểm tích từ hàng trả',
        },
      });
      await tx.loyaltyPointsTransaction.create({
        data: {
          customerId: row.customerId,
          orderId: row.orderId,
          type: 'ADJUST',
          points: 0,
          eventKey: `RETURN:${row.id}:ACCOUNTING`,
          description: 'Đã đối soát điểm đổi/trả hàng',
        },
      });
      const [originalQuantity, earlierQuantity] = await Promise.all([
        tx.orderItem.aggregate({
          where: { orderId: row.orderId },
          _sum: { quantity: true },
        }),
        tx.returnOrderItem.aggregate({
          where: { returnOrder: { orderId: row.orderId, status: 'COMPLETED' } },
          _sum: { quantity: true },
        }),
      ]);
      const fullyReturned =
        (earlierQuantity._sum.quantity ?? 0) +
          row.items.reduce((sum, item) => sum + item.quantity, 0) ===
        originalQuantity._sum.quantity;
      if (
        fullyReturned &&
        policy.totalOrdersMode === 'REMOVE_FULLY_RETURNED_ORDERS' &&
        customer.totalOrders < 1
      ) {
        throw new ConflictException('CUSTOMER_TOTALS_RECONCILIATION_REQUIRED');
      }
      await tx.customer.update({
        where: { id: row.customerId },
        data: {
          totalPoints: { increment: restored - points },
          totalSpent: { decrement: credit },
          ...(fullyReturned &&
          policy.totalOrdersMode === 'REMOVE_FULLY_RETURNED_ORDERS'
            ? { totalOrders: { decrement: 1 } }
            : {}),
        },
      });
      await evaluateTier(tx, row.customerId);
    }
    await tx.returnOrder.update({
      where: { id: row.id },
      data: { status: 'COMPLETED', refundAmount: cashDue },
    });
    await this.returnStatusChanged(tx, row.id, actorId, 'COMPLETED');
    await notifyCustomer(
      tx,
      row.customerId,
      `RETURN:${row.id}:POINTS`,
      'Điểm thưởng đã điều chỉnh theo đổi trả',
      'LOYALTY',
      { returnId },
    );
  }
}

/** Caller has locked the replacement order and validated a pre-fulfillment cancellation. */
export async function cancelReplacementCredit(
  tx: Tx,
  replacementOrderId: string,
) {
  const exchange = await tx.exchangeSettlement.findUnique({
    where: { replacementOrderId },
  });
  if (!exchange || exchange.status === 'CANCELLED') return;
  const source = await tx.returnOrder.findUniqueOrThrow({
    where: { id: exchange.returnOrderId },
  });
  await tx.$queryRaw`SELECT id FROM orders WHERE id=${source.orderId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM return_orders WHERE id=${source.id}::uuid FOR UPDATE`;
  await tx.exchangeSettlement.update({
    where: { id: exchange.id },
    data: { status: 'CANCELLED' },
  });
  await new CustomerEventIntegration().reserveRefund(
    tx,
    source.id,
    Number(exchange.creditApplied),
    'EXCHANGE_CANCEL',
  );
  await notifyCustomer(
    tx,
    source.customerId,
    `RETURN:${source.id}:EXCHANGE_CANCELLED`,
    'Đơn đổi hàng đã hủy; giá trị đối trừ chuyển sang yêu cầu hoàn tiền',
    'RETURN',
    { returnId: source.id, orderId: replacementOrderId },
  );
}
