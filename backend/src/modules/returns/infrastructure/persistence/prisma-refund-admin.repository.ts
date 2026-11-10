import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CustomerEventIntegration } from '@modules/customer-commerce/application/admin-integration.service';
import {
  IRefundAdminRepository,
  RefundAccessInfo,
  RefundDetail,
  RefundListItem,
  RefundListQuery,
  RefundProcessingRecord,
} from '../../domain/repositories/refund-admin.repository.interface';
import {
  RefundMethod,
  assertRefundProcessable,
  assertRefundRejectable,
} from '../../domain/refund-rules';
import { assertWithinCap, returnCashCap } from '../../domain/return-rules';

const TX_OPTIONS = { timeout: 30000, maxWait: 10000 };
const ACTIVE_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED'];
const AUDIT_ENTITY = 'refunds';

const listInclude = {
  order: {
    select: {
      orderNumber: true,
      storeId: true,
      store: { select: { name: true } },
      customer: { select: { fullName: true } },
    },
  },
  payment: { select: { paymentMethod: true } },
  returnOrder: { select: { returnCode: true } },
} satisfies Prisma.RefundInclude;

type ListRow = Prisma.RefundGetPayload<{ include: typeof listInclude }>;

const toListItem = (r: ListRow): RefundListItem => ({
  id: r.id,
  orderId: r.orderId,
  orderNumber: r.order.orderNumber,
  storeId: r.order.storeId,
  storeName: r.order.store.name,
  customerName: r.order.customer?.fullName ?? null,
  returnOrderId: r.returnOrderId,
  returnCode: r.returnOrder?.returnCode ?? null,
  amount: Number(r.amount),
  status: r.status,
  paymentMethod: r.payment?.paymentMethod ?? null,
  createdAt: r.createdAt,
  processedAt: r.processedAt,
  refundMethod: r.status === 'COMPLETED' ? (r.posSessionId ? 'CASH' : 'BANK_TRANSFER') : null,
  posSessionId: r.posSessionId,
  processedBy: r.processedBy,
});

@Injectable()
export class PrismaRefundAdminRepository implements IRefundAdminRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: CustomerEventIntegration,
  ) {}

  async findAccessInfo(id: string): Promise<RefundAccessInfo | null> {
    const r = await this.prisma.refund.findUnique({ where: { id }, include: listInclude });
    if (!r) return null;
    return {
      id: r.id,
      status: r.status,
      storeId: r.order.storeId,
      amount: Number(r.amount),
      paymentMethod: r.payment?.paymentMethod ?? null,
    };
  }

  async findOpenSessionId(cashierId: string, storeId: string): Promise<string | null> {
    const s = await this.prisma.posSession.findFirst({
      where: { cashierId, storeId, status: 'OPEN' },
      select: { id: true },
    });
    return s?.id ?? null;
  }

  async findOpenSessionStoreIds(cashierId: string): Promise<string[]> {
    const rows = await this.prisma.posSession.findMany({
      where: { cashierId, status: 'OPEN' },
      select: { storeId: true },
    });
    return rows.map((r) => r.storeId);
  }

  async list(query: RefundListQuery): Promise<{ items: RefundListItem[]; total: number }> {
    const where: Prisma.RefundWhereInput = {
      ...(query.storeIds ? { order: { storeId: { in: query.storeIds } } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.returnOrderId ? { returnOrderId: query.returnOrderId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
              { returnOrder: { returnCode: { contains: query.search, mode: 'insensitive' } } },
              { refundTransactionId: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: listInclude,
      }),
      this.prisma.refund.count({ where }),
    ]);
    return { items: rows.map(toListItem), total };
  }

  async findDetail(id: string): Promise<RefundDetail | null> {
    const r = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        order: listInclude.order,
        payment: true,
        returnOrder: { select: { id: true, returnCode: true, returnType: true, status: true } },
      },
    });
    if (!r) return null;
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType: AUDIT_ENTITY, entityId: id, action: { in: ['REFUND_PROCESS', 'REFUND_REJECT'] } },
      orderBy: { createdAt: 'asc' },
    });
    const processing: RefundProcessingRecord[] = logs.map((l) => {
      const d = (l.newData ?? {}) as Record<string, string | null>;
      return {
        action: l.action,
        method: d.method ?? null,
        reference: d.reference ?? null,
        note: d.note ?? null,
        userId: l.userId,
        at: l.createdAt,
      };
    });
    return {
      ...toListItem({ ...r, payment: r.payment, returnOrder: r.returnOrder }),
      reason: r.reason,
      refundTransactionId: r.refundTransactionId,
      payment: r.payment
        ? {
            id: r.payment.id,
            paymentMethod: r.payment.paymentMethod,
            amount: Number(r.payment.amount),
            transactionId: r.payment.transactionId,
            paidAt: r.payment.paidAt,
          }
        : null,
      returnOrder: r.returnOrder,
      processing,
    };
  }

  async process(input: {
    id: string;
    actorId: string;
    method: RefundMethod;
    posSessionId: string | null;
    reference?: string;
    note?: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const refund = await this.lock(tx, input.id);
      assertRefundProcessable(refund.status);
      await this.assertCaps(tx, refund);
      if (input.posSessionId) {
        // Khóa dòng ca: đóng ca chạy song song sẽ chờ, rồi tính cả khoản hoàn này vào tiền mặt hệ thống
        const rows = await tx.$queryRaw<{ status: string }[]>`
          SELECT status FROM pos_sessions WHERE id = ${input.posSessionId}::uuid FOR UPDATE`;
        if (rows[0]?.status !== 'OPEN') {
          throw new ConflictException('Ca POS vừa được đóng, vui lòng mở ca mới để hoàn tiền mặt');
        }
      }

      await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          refundTransactionId: input.reference?.trim() || null,
          posSessionId: input.posSessionId,
          processedBy: input.actorId,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: input.actorId,
          action: 'REFUND_PROCESS',
          entityType: AUDIT_ENTITY,
          entityId: refund.id,
          oldData: { status: refund.status },
          newData: {
            status: 'COMPLETED',
            method: input.method,
            reference: input.reference?.trim() ?? null,
            note: input.note ?? null,
          },
        },
      });
      if (refund.paymentId) await this.integration.refundCompleted(tx, refund.id);
    }, TX_OPTIONS);
  }

  async reject(input: { id: string; actorId: string; reason: string }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const refund = await this.lock(tx, input.id);
      assertRefundRejectable(refund.status);
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', processedBy: input.actorId, posSessionId: null },
      });
      await tx.auditLog.create({
        data: {
          userId: input.actorId,
          action: 'REFUND_REJECT',
          entityType: AUDIT_ENTITY,
          entityId: refund.id,
          oldData: { status: refund.status },
          newData: { status: 'FAILED', note: input.reason },
        },
      });
    }, TX_OPTIONS);
  }

  private async lock(tx: Prisma.TransactionClient, id: string) {
    const identity = await tx.refund.findUniqueOrThrow({ where: { id }, select: { orderId: true } });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${identity.orderId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM refunds WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.refund.findUniqueOrThrow({ where: { id } });
  }

  // Hoàn lại một phiếu từng bị từ chối phải kiểm lại hạn mức: không vượt khoản đã thu và không vượt giá trị hàng trả
  private async assertCaps(
    tx: Prisma.TransactionClient,
    refund: { id: string; amount: Prisma.Decimal; paymentId: string | null; returnOrderId: string | null },
  ) {
    const amount = Number(refund.amount);
    if (refund.paymentId) {
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: refund.paymentId } });
      if (payment.status !== 'COMPLETED') {
        throw new ConflictException('Khoản thanh toán gốc chưa hoàn tất nên chưa thể hoàn tiền');
      }
      const others = await tx.refund.aggregate({
        where: { paymentId: payment.id, id: { not: refund.id }, status: { in: ACTIVE_STATUSES } },
        _sum: { amount: true },
      });
      assertWithinCap({
        amount,
        othersActive: Number(others._sum.amount ?? 0),
        cap: Number(payment.amount),
        label: 'số tiền khách đã thanh toán',
      });
    }
    if (refund.returnOrderId) {
      const ret = await tx.returnOrder.findUniqueOrThrow({
        where: { id: refund.returnOrderId },
        include: { items: { select: { refundAmount: true } }, settlement: true },
      });
      const credit = ret.items.reduce((s, i) => s + Number(i.refundAmount), 0);
      const cap = returnCashCap(
        ret.returnType,
        credit,
        ret.settlement
          ? {
              status: ret.settlement.status,
              refundDue: Number(ret.settlement.refundDue),
              returnCredit: Number(ret.settlement.returnCredit),
            }
          : null,
      );
      const others = await tx.refund.aggregate({
        where: {
          returnOrderId: ret.id,
          id: { not: refund.id },
          status: { in: ACTIVE_STATUSES },
        },
        _sum: { amount: true },
      });
      assertWithinCap({
        amount,
        othersActive: Number(others._sum.amount ?? 0),
        cap,
        label: 'giá trị hàng đổi trả trong đơn gốc',
      });
    }
  }
}
