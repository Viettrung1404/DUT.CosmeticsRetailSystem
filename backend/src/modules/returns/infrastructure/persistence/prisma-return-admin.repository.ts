import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CustomerEventIntegration } from '@modules/customer-commerce/application/admin-integration.service';
import { ReturnsService } from '@modules/customer-commerce/application/returns.service';
import {
  IReturnAdminRepository,
  InspectLineInput,
  InspectResult,
  ReturnAccessInfo,
  ReturnDetail,
  ReturnListItem,
  ReturnListQuery,
} from '../../domain/repositories/return-admin.repository.interface';
import { assertReturnTransition, pickRestockBatch } from '../../domain/return-rules';
import { restockReturnedItem } from './restock.helper';

const TX_OPTIONS = { timeout: 30000, maxWait: 10000 };

@Injectable()
export class PrismaReturnAdminRepository implements IReturnAdminRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: CustomerEventIntegration,
    private readonly returns: ReturnsService,
  ) {}

  async findAccessInfo(id: string): Promise<ReturnAccessInfo | null> {
    return this.prisma.returnOrder.findUnique({
      where: { id },
      select: { id: true, storeId: true, status: true, returnType: true },
    });
  }

  async list(query: ReturnListQuery): Promise<{ items: ReturnListItem[]; total: number }> {
    const where: Prisma.ReturnOrderWhereInput = {
      ...(query.storeIds ? { storeId: { in: query.storeIds } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.returnType ? { returnType: query.returnType } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { returnCode: { contains: query.search, mode: 'insensitive' } },
              { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
              { customer: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { customer: { phone: { contains: query.search } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.returnOrder.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          order: { select: { orderNumber: true } },
          store: { select: { name: true } },
          customer: { select: { fullName: true, phone: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.returnOrder.count({ where }),
    ]);
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        returnCode: r.returnCode,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        storeId: r.storeId,
        storeName: r.store.name,
        customerName: r.customer.fullName,
        customerPhone: r.customer.phone,
        returnType: r.returnType,
        status: r.status,
        reason: r.reason,
        itemCount: r._count.items,
        refundAmount: Number(r.refundAmount),
        createdAt: r.createdAt,
      })),
    };
  }

  async findDetail(id: string): Promise<ReturnDetail | null> {
    const r = await this.prisma.returnOrder.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, orderNumber: true, totalAmount: true } },
        store: { select: { id: true, name: true, code: true } },
        customer: { select: { id: true, fullName: true, phone: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            orderItem: { select: { productName: true, variantName: true } },
            variant: { select: { sku: true } },
          },
        },
        exchangeItems: { select: { productVariantId: true, quantity: true } },
        attachments: { select: { id: true, mimeType: true, size: true } },
        history: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        settlement: true,
        refunds: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      returnCode: r.returnCode,
      returnType: r.returnType,
      status: r.status,
      reason: r.reason,
      adminNote: r.adminNote,
      refundAmount: Number(r.refundAmount),
      handledBy: r.handledBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      order: { id: r.order.id, orderNumber: r.order.orderNumber, totalAmount: Number(r.order.totalAmount) },
      store: r.store,
      customer: r.customer,
      items: r.items.map((i) => ({
        id: i.id,
        orderItemId: i.orderItemId,
        productVariantId: i.productVariantId,
        productName: i.orderItem.productName,
        variantName: i.orderItem.variantName,
        sku: i.variant.sku,
        quantity: i.quantity,
        refundAmount: Number(i.refundAmount),
        condition: i.condition,
        restockStoreId: i.restockStoreId,
        restockBatchId: i.restockBatchId,
        note: i.note,
      })),
      exchangeItems: r.exchangeItems,
      attachments: r.attachments,
      history: r.history.map((h) => ({
        status: h.status,
        note: h.note,
        changedBy: h.changedBy,
        createdAt: h.createdAt,
      })),
      settlement: r.settlement
        ? {
            status: r.settlement.status,
            replacementOrderId: r.settlement.replacementOrderId,
            returnCredit: Number(r.settlement.returnCredit),
            replacementPayable: Number(r.settlement.replacementPayable),
            creditApplied: Number(r.settlement.creditApplied),
            additionalDue: Number(r.settlement.additionalDue),
            refundDue: Number(r.settlement.refundDue),
          }
        : null,
      refunds: r.refunds.map((f) => ({
        id: f.id,
        amount: Number(f.amount),
        status: f.status,
        processedAt: f.processedAt,
      })),
      quoteVersion: r.quoteVersion,
      quoteExpiresAt: r.quoteExpiresAt,
    };
  }

  approve(input: { id: string; actorId: string; note?: string }): Promise<void> {
    return this.simpleTransition(input.id, input.actorId, 'APPROVED', input.note);
  }

  markReceived(input: { id: string; actorId: string; note?: string }): Promise<void> {
    return this.simpleTransition(input.id, input.actorId, 'RECEIVED', input.note);
  }

  reject(input: { id: string; actorId: string; reason: string }): Promise<void> {
    return this.simpleTransition(input.id, input.actorId, 'REJECTED', input.reason, input.reason);
  }

  async inspect(input: {
    id: string;
    actorId: string;
    lines: InspectLineInput[];
    note?: string;
  }): Promise<InspectResult> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, input.id);
      assertReturnTransition(row.status, 'INSPECTED');

      const items = await tx.returnOrderItem.findMany({
        where: { returnOrderId: input.id },
        include: {
          variant: { select: { sku: true } },
          orderItem: {
            select: { orderItemBatches: { select: { quantity: true, batch: { select: { id: true, expiryDate: true } } } } },
          },
        },
      });
      const byId = new Map(items.map((i) => [i.id, i]));
      const given = new Set(input.lines.map((l) => l.returnOrderItemId));
      if (
        given.size !== input.lines.length ||
        given.size !== items.length ||
        input.lines.some((l) => !byId.has(l.returnOrderItemId))
      ) {
        throw new BadRequestException('Cần kiểm định đủ và không trùng từng dòng hàng trả');
      }

      let restockedQuantity = 0;
      let damagedQuantity = 0;
      for (const line of input.lines) {
        const item = byId.get(line.returnOrderItemId)!;
        if (line.condition === 'DAMAGED') {
          damagedQuantity += item.quantity;
          await tx.returnOrderItem.update({
            where: { id: item.id },
            data: { condition: 'DAMAGED', restockStoreId: null, restockBatchId: null, note: line.note ?? null },
          });
          continue;
        }
        const batchId =
          line.restockBatchId ??
          pickRestockBatch(
            item.orderItem.orderItemBatches.map((b) => ({
              id: b.batch.id,
              quantity: b.quantity,
              expiryDate: b.batch.expiryDate,
            })),
          );
        if (!batchId) {
          throw new BadRequestException(
            `Dòng ${item.variant.sku}: không xác định được lô còn hạn để nhập lại kho, vui lòng chọn lô hoặc ghi nhận hàng hỏng`,
          );
        }
        await restockReturnedItem(tx, {
          returnId: input.id,
          storeId: row.storeId,
          variantId: item.productVariantId,
          quantity: item.quantity,
          batchId,
          actorId: input.actorId,
        });
        restockedQuantity += item.quantity;
        await tx.returnOrderItem.update({
          where: { id: item.id },
          data: {
            condition: 'RESALEABLE',
            restockStoreId: row.storeId,
            restockBatchId: batchId,
            note: line.note ?? null,
          },
        });
      }

      await tx.returnOrder.update({
        where: { id: input.id },
        data: { status: 'INSPECTED', handledBy: input.actorId },
      });
      await this.integration.returnStatusChanged(tx, input.id, input.actorId, 'INSPECTED', input.note);

      let refundsReserved = false;
      let quotePrepared = false;
      if (row.returnType === 'EXCHANGE') {
        await this.returns.prepareExchangeQuote(tx, input.id);
        quotePrepared = true;
      } else {
        const credit = items.reduce((sum, i) => sum + Number(i.refundAmount), 0);
        await this.integration.reserveRefund(tx, input.id, credit);
        refundsReserved = true;
      }
      return { restockedQuantity, damagedQuantity, refundsReserved, quotePrepared };
    }, TX_OPTIONS);
  }

  async complete(input: { id: string; actorId: string }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, input.id);
      assertReturnTransition(row.status, 'COMPLETED');
      await this.integration.completeReturn(tx, input.id, input.actorId);
      await tx.returnOrder.update({ where: { id: input.id }, data: { handledBy: input.actorId } });
    }, TX_OPTIONS);
  }

  private async simpleTransition(
    id: string,
    actorId: string,
    to: string,
    publicNote?: string,
    adminNote?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      assertReturnTransition(row.status, to);
      await tx.returnOrder.update({
        where: { id },
        data: { status: to, handledBy: actorId, ...(adminNote ? { adminNote } : {}) },
      });
      await this.integration.returnStatusChanged(tx, id, actorId, to, publicNote);
    }, TX_OPTIONS);
  }

  // Khóa đơn gốc trước, rồi tới phiếu trả: cùng thứ tự với luồng của Trung để không khóa chéo
  private async lock(tx: Prisma.TransactionClient, id: string) {
    const identity = await tx.returnOrder.findUniqueOrThrow({
      where: { id },
      select: { orderId: true },
    });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${identity.orderId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM return_orders WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.returnOrder.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, storeId: true, returnType: true },
    });
  }
}
