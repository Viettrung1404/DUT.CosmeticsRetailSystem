import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IFinanceRepository,
  PaymentHistoryFilter,
  PaymentHistoryItem,
  ReconciliationGroup,
} from '../../domain/repositories/finance.repository.interface';

const INCLUDE = {
  order: { select: { orderNumber: true, storeId: true, store: { select: { name: true } } } },
  posSession: { select: { sessionCode: true } },
} satisfies Prisma.PaymentInclude;

type Row = Prisma.PaymentGetPayload<{ include: typeof INCLUDE }>;

const toItem = (p: Row): PaymentHistoryItem => ({
  id: p.id,
  orderId: p.orderId,
  orderNumber: p.order.orderNumber,
  storeId: p.order.storeId,
  storeName: p.order.store.name,
  channel: p.posSessionId ? 'POS' : 'ONLINE',
  posSessionId: p.posSessionId,
  posSessionCode: p.posSession?.sessionCode ?? null,
  paymentMethod: p.paymentMethod,
  amount: Number(p.amount),
  status: p.status,
  transactionId: p.transactionId,
  paidAt: p.paidAt,
  reconciledAt: p.reconciledAt,
  createdAt: p.createdAt,
});

@Injectable()
export class PrismaFinanceRepository implements IFinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPayments(filter: PaymentHistoryFilter) {
    const where: Prisma.PaymentWhereInput = {
      order: filter.storeIds ? { storeId: { in: filter.storeIds } } : undefined,
      posSession: filter.cashierId ? { cashierId: filter.cashierId } : undefined,
      paymentMethod: filter.paymentMethod,
      status: filter.status,
      createdAt: filter.from || filter.to ? { gte: filter.from, lt: filter.to } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: rows.map(toItem), total };
  }

  async summarize(dayStart: Date, dayEnd: Date, storeIds?: string[]): Promise<ReconciliationGroup[]> {
    const storeFilter = storeIds
      ? Prisma.sql`AND o.store_id IN (${Prisma.join(storeIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      {
        store_id: string;
        store_name: string;
        channel: 'POS' | 'ONLINE';
        payment_method: string;
        count: number;
        amount: string;
        reconciled_count: number;
        unreconciled_sessions: number;
      }[]
    >`
      SELECT o.store_id, s.name AS store_name,
        CASE WHEN p.pos_session_id IS NULL THEN 'ONLINE' ELSE 'POS' END AS channel,
        p.payment_method,
        count(*)::int AS count,
        sum(p.amount)::text AS amount,
        count(p.reconciled_at)::int AS reconciled_count,
        count(DISTINCT ps.id) FILTER (WHERE ps.status <> 'RECONCILED')::int AS unreconciled_sessions
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN pos_sessions ps ON ps.id = p.pos_session_id
      WHERE p.status = 'COMPLETED' AND p.paid_at >= ${dayStart} AND p.paid_at < ${dayEnd} ${storeFilter}
      GROUP BY o.store_id, s.name, channel, p.payment_method
      ORDER BY s.name, channel, p.payment_method`;
    return rows.map((r) => ({
      storeId: r.store_id,
      storeName: r.store_name,
      channel: r.channel,
      paymentMethod: r.payment_method,
      count: r.count,
      amount: Number(r.amount),
      reconciledCount: r.reconciled_count,
      unreconciledSessions: r.unreconciled_sessions,
    }));
  }

  markReconciled(input: {
    dayStart: Date;
    dayEnd: Date;
    storeId: string;
    channel: 'POS' | 'ONLINE';
    paymentMethod: string;
  }): Promise<{ ok: true; marked: number } | { ok: false; unreconciledSessions: number }> {
    return this.prisma.$transaction(async (tx) => {
      const where: Prisma.PaymentWhereInput = {
        status: 'COMPLETED',
        paymentMethod: input.paymentMethod,
        paidAt: { gte: input.dayStart, lt: input.dayEnd },
        order: { storeId: input.storeId },
        posSessionId: input.channel === 'POS' ? { not: null } : null,
      };
      if (input.channel === 'POS') {
        const open = await tx.posSession.count({
          where: { status: { not: 'RECONCILED' }, payments: { some: where } },
        });
        if (open > 0) return { ok: false as const, unreconciledSessions: open };
      }
      const result = await tx.payment.updateMany({
        where: { ...where, reconciledAt: null },
        data: { reconciledAt: new Date() },
      });
      return { ok: true as const, marked: result.count };
    });
  }
}
