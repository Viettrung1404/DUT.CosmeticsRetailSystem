import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { notifyUser } from '@core/services/customer-events';
import { CustomerCommands, json, Tx } from '../infrastructure/commands';
import {
  configuration,
  ReturnPolicy,
  validReturnPolicy,
} from '../domain/policy';
import { partialValue, settlement } from '../domain/money';
import {
  AcceptExchangeDto,
  CreateReturnDto,
} from '../presentation/commerce.dto';
import { CustomerEventIntegration } from './admin-integration.service';
import { transferFunding } from '../infrastructure/exchange-funding';
import { CommercePricingService } from '@modules/customer-experience/application/commerce-pricing.service';
import { reservePromotionBenefits } from '@core/services/promotion-lifecycle';

const ACTIVE_RETURNS = [
  'REQUESTED',
  'APPROVED',
  'RECEIVED',
  'INSPECTED',
  'COMPLETED',
];
interface QuoteLine {
  originalPrice?: number;
  cashValue?: number;
  lineDiscount?: number;
  promotionId?: string | null;
  quotaId?: string | null;
  tierDiscount?: number;
  promotionDiscount?: number;
  variantId: string;
  quantity: number;
  price: number;
  cost: number;
  name: string;
  sku: string;
}
interface Quote {
  pricingVersion?: string;
  policyVersion: string;
  lines: QuoteLine[];
  fee: number;
  credit: number;
  payable: number;
}
export interface LineSnapshot {
  version: 1;
  cashValue: number;
  pointsUsed: number;
  pointsValue: number;
  couponDiscount: number;
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CustomerCommands,
    private readonly integration: CustomerEventIntegration,
    @Optional() private readonly pricing?: CommercePricingService,
  ) {}
  async policy(tx: Tx) {
    const row = await tx.setting.findUnique({
      where: { key: 'return_policy' },
    });
    return configuration<ReturnPolicy>(
      row?.value,
      validReturnPolicy,
      'return_policy',
    );
  }
  create(userId: string, key: string, input: CreateReturnDto) {
    return this.commands.execute(
      userId,
      'RETURN_CREATE',
      key,
      input,
      async (tx, customerId) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id=${input.orderId}::uuid AND customer_id=${customerId}::uuid FOR UPDATE`;
        const order = await tx.order.findFirst({
          where: { id: input.orderId, customerId },
          include: {
            items: true,
            payments: true,
            statusHistories: {
              where: { status: 'COMPLETED' },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        });
        if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
        const completed = order.statusHistories[0]?.createdAt;
        if (
          order.status !== 'COMPLETED' ||
          !completed ||
          completed > new Date() ||
          Date.now() - completed.getTime() > 7 * 86400000
        ) {
          throw new ConflictException('RETURN_WINDOW_CLOSED');
        }
        await this.policy(tx);
        if (input.type === 'EXCHANGE' && !input.replacements?.length)
          throw new BadRequestException('EXCHANGE_ITEMS_REQUIRED');
        if (input.type === 'REFUND' && input.replacements?.length)
          throw new BadRequestException('REFUND_HAS_NO_REPLACEMENTS');
        const previous = await tx.returnOrderItem.groupBy({
          by: ['orderItemId'],
          where: {
            returnOrder: { orderId: order.id, status: { in: ACTIVE_RETURNS } },
          },
          _sum: {
            quantity: true,
            refundAmount: true,
            pointsToRestore: true,
            pointsValue: true,
          },
        });
        const items: Prisma.ReturnOrderItemCreateWithoutReturnOrderInput[] = [];
        for (const requested of input.items) {
          const original = order.items.find(
            (item) => item.id === requested.orderItemId,
          );
          if (!original) throw new BadRequestException('ORDER_ITEM_MISMATCH');
          const aggregate = previous.find(
            (item) => item.orderItemId === original.id,
          )?._sum;
          const already = aggregate?.quantity ?? 0;
          if (already + requested.quantity > original.quantity)
            throw new ConflictException('RETURN_QUANTITY_EXCEEDED');
          const snapshot =
            original.pricingSnapshot as unknown as LineSnapshot | null;
          if (
            snapshot?.version !== 1 ||
            !Number.isFinite(snapshot.cashValue) ||
            !Number.isInteger(snapshot.pointsUsed)
          ) {
            throw new ConflictException('LEGACY_ORDER_REQUIRES_PRICING_REVIEW');
          }
          const remainingCash = new Prisma.Decimal(snapshot.cashValue).minus(
            aggregate?.refundAmount ?? 0,
          );
          const remainingPointValue = new Prisma.Decimal(
            snapshot.pointsValue,
          ).minus(aggregate?.pointsValue ?? 0);
          const last = already + requested.quantity === original.quantity;
          const refundAmount = last
            ? remainingCash.toNumber()
            : Prisma.Decimal.min(
                remainingCash,
                partialValue(
                  snapshot.cashValue,
                  original.quantity,
                  already,
                  requested.quantity,
                ),
              ).toNumber();
          const pointsValue = last
            ? remainingPointValue.toNumber()
            : Prisma.Decimal.min(
                remainingPointValue,
                partialValue(
                  snapshot.pointsValue,
                  original.quantity,
                  already,
                  requested.quantity,
                ),
              ).toNumber();
          items.push({
            orderItem: { connect: { id: original.id } },
            variant: { connect: { id: original.productVariantId } },
            quantity: requested.quantity,
            refundAmount,
            pointsValue,
            pointsToRestore: 0,
          });
        }
        for (const item of input.replacements ?? []) {
          const variant = await tx.productVariant.findFirst({
            where: {
              id: item.productVariantId,
              isActive: true,
              product: { isActive: true },
            },
          });
          if (!variant)
            throw new BadRequestException('REPLACEMENT_NOT_AVAILABLE');
        }
        const ids = input.attachmentIds ?? [];
        const attachments = await tx.returnAttachment.findMany({
          where: {
            id: { in: ids },
            userId,
            returnOrderId: null,
            createdAt: { gte: new Date(Date.now() - 86400000) },
          },
        });
        if (attachments.length !== ids.length)
          throw new BadRequestException('ATTACHMENT_NOT_OWNED_OR_EXPIRED');
        const result = await tx.returnOrder.create({
          data: {
            returnCode: `RMA-${randomUUID()}`,
            orderId: order.id,
            customerId,
            storeId: order.storeId,
            returnType: input.type,
            reason: input.reason,
            status: 'REQUESTED',
            items: { create: items },
            exchangeItems: {
              create: (input.replacements ?? []).map((item) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
              })),
            },
            history: { create: { status: 'REQUESTED', changedBy: userId } },
          },
        });
        const attached = await tx.returnAttachment.updateMany({
          where: { id: { in: ids }, userId, returnOrderId: null },
          data: { returnOrderId: result.id },
        });
        if (attached.count !== ids.length)
          throw new ConflictException('ATTACHMENT_ALREADY_USED');
        await notifyUser(
          tx,
          userId,
          `RETURN:${result.id}:REQUESTED`,
          'Đã nhận yêu cầu đổi trả',
          'RETURN',
          { returnId: result.id },
        );
        return {
          id: result.id,
          returnCode: result.returnCode,
          status: result.status,
        };
      },
    );
  }
  async list(customerId: string, page: number, limit: number, status?: string) {
    const where = { customerId, ...(status ? { status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.returnOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          returnCode: true,
          orderId: true,
          returnType: true,
          status: true,
          reason: true,
          refundAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.returnOrder.count({ where }),
    ]);
    return { items, page, limit, total };
  }
  async detail(customerId: string, id: string) {
    const row = await this.prisma.returnOrder.findFirst({
      where: { id, customerId },
      select: {
        id: true,
        returnCode: true,
        orderId: true,
        returnType: true,
        status: true,
        reason: true,
        refundAmount: true,
        quoteVersion: true,
        quoteExpiresAt: true,
        quoteSnapshot: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            orderItemId: true,
            productVariantId: true,
            quantity: true,
            condition: true,
            refundAmount: true,
            pointsToRestore: true,
          },
        },
        exchangeItems: { select: { productVariantId: true, quantity: true } },
        attachments: { select: { id: true, mimeType: true, size: true } },
        history: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { status: true, note: true, createdAt: true },
        },
        settlement: {
          select: {
            id: true,
            replacementOrderId: true,
            returnCredit: true,
            replacementPayable: true,
            creditApplied: true,
            additionalDue: true,
            refundDue: true,
            status: true,
          },
        },
        refunds: {
          select: { id: true, amount: true, status: true, processedAt: true },
        },
      },
    });
    if (!row) throw new NotFoundException('RETURN_NOT_FOUND');
    const quote = row.quoteSnapshot as unknown as Quote | null;
    return {
      ...row,
      quoteSnapshot: quote
        ? {
            policyVersion: quote.policyVersion,
            fee: quote.fee,
            credit: quote.credit,
            payable: quote.payable,
            lines: quote.lines.map((line) => ({
              variantId: line.variantId,
              quantity: line.quantity,
              price: line.price,
              name: line.name,
              sku: line.sku,
            })),
          }
        : null,
    };
  }
  /** Called by the authorized Admin inspection workflow inside its transaction. */
  async prepareExchangeQuote(tx: Tx, returnId: string) {
    await tx.$queryRaw`SELECT id FROM return_orders WHERE id=${returnId}::uuid FOR UPDATE`;
    const row = await tx.returnOrder.findUniqueOrThrow({
      where: { id: returnId },
      include: { items: true, exchangeItems: true },
    });
    if (row.returnType !== 'EXCHANGE' || row.status !== 'INSPECTED')
      throw new ConflictException('RETURN_NOT_INSPECTED');
    if (row.items.some((item) => !item.condition))
      throw new ConflictException('INSPECTION_REQUIRED');
    if (
      await tx.exchangeSettlement.findUnique({
        where: { returnOrderId: returnId },
      })
    )
      throw new ConflictException('EXCHANGE_ALREADY_ACCEPTED');
    const quote = await this.calculateQuote(tx, row);
    const policy = await this.policy(tx);
    await tx.returnOrder.update({
      where: { id: returnId },
      data: {
        quoteSnapshot: json(quote),
        quoteVersion: { increment: 1 },
        quoteExpiresAt: new Date(Date.now() + policy.quoteMinutes * 60000),
      },
    });
    await notifyUser(
      tx,
      (await tx.customer.findUniqueOrThrow({ where: { id: row.customerId } }))
        .userId!,
      `RETURN:${row.id}:QUOTE:${row.quoteVersion + 1}`,
      'Báo giá đổi hàng đã sẵn sàng',
      'RETURN',
      { returnId: row.id },
    );
  }
  private async calculateQuote(
    tx: Tx,
    row: {
      customerId?: string;
      items: { refundAmount: Prisma.Decimal }[];
      exchangeItems: { productVariantId: string; quantity: number }[];
    },
    lock = false,
  ): Promise<Quote> {
    const policy = await this.policy(tx);
    const lines: QuoteLine[] = [];
    if (this.pricing && row.customerId) {
      const price = await this.pricing.quote({ customerId: row.customerId, items: [...row.exchangeItems].sort((a, b) => a.productVariantId.localeCompare(b.productVariantId)).map(i => ({ variantId: i.productVariantId, quantity: i.quantity })) }, tx, lock);
      return {
        pricingVersion: price.quoteVersion,
        policyVersion: policy.version,
        lines: price.items.map(line => { const v = price.variants.find(v => v.id === line.variantId)!; return { ...line, price: line.effectivePrice, cost: Number(v.costPrice), name: v.product.name, sku: v.sku }; }),
        fee: policy.exchangeShippingFee,
        credit: row.items.reduce((sum, item) => sum.add(item.refundAmount), new Prisma.Decimal(0)).toNumber(),
        payable: new Prisma.Decimal(price.subtotal).minus(price.lineDiscount).add(policy.exchangeShippingFee).toNumber(),
      } satisfies Quote;
    }
    for (const item of [...row.exchangeItems].sort((a, b) =>
      a.productVariantId.localeCompare(b.productVariantId),
    )) {
      const variant = await tx.productVariant.findFirst({
        where: {
          id: item.productVariantId,
          isActive: true,
          product: { isActive: true },
        },
        include: { product: true },
      });
      if (!variant) throw new ConflictException('REPLACEMENT_NOT_AVAILABLE');
      lines.push({
        variantId: variant.id,
        quantity: item.quantity,
        price: Number(variant.price),
        cost: Number(variant.costPrice),
        name: variant.product.name,
        sku: variant.sku,
      });
    }
    return {
      policyVersion: policy.version,
      lines,
      fee: policy.exchangeShippingFee,
      credit: row.items
        .reduce(
          (sum, item) => sum.add(item.refundAmount),
          new Prisma.Decimal(0),
        )
        .toNumber(),
      payable: lines
        .reduce(
          (sum, line) =>
            sum.add(new Prisma.Decimal(line.price).mul(line.quantity)),
          new Prisma.Decimal(policy.exchangeShippingFee),
        )
        .toNumber(),
    } satisfies Quote;
  }
  accept(userId: string, id: string, key: string, input: AcceptExchangeDto) {
    return this.commands.execute(
      userId,
      'EXCHANGE_ACCEPT',
      key,
      { id, ...input },
      async (tx, customerId) => {
        const identity = await tx.returnOrder.findFirst({
          where: { id, customerId },
          select: { orderId: true },
        });
        if (!identity) throw new NotFoundException('RETURN_NOT_FOUND');
        await tx.$queryRaw`SELECT id FROM orders WHERE id=${identity.orderId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM return_orders WHERE id=${id}::uuid AND customer_id=${customerId}::uuid FOR UPDATE`;
        const row = await tx.returnOrder.findFirst({
          where: { id, customerId },
          include: {
            items: true,
            exchangeItems: true,
            order: true,
            settlement: true,
          },
        });
        if (!row) throw new NotFoundException('RETURN_NOT_FOUND');
        if (
          row.returnType !== 'EXCHANGE' ||
          row.status !== 'INSPECTED' ||
          row.settlement
        )
          throw new ConflictException('EXCHANGE_NOT_AVAILABLE');
        if (
          row.quoteVersion !== input.quoteVersion ||
          !row.quoteExpiresAt ||
          row.quoteExpiresAt <= new Date()
        )
          throw new ConflictException('QUOTE_EXPIRED_OR_CHANGED');
        const variantIds = row.exchangeItems.map(
          (item) => item.productVariantId,
        );
        const quote = await this.calculateQuote(tx, row, true);
        if (JSON.stringify(quote) !== JSON.stringify(row.quoteSnapshot)) {
          // JSONB normalizes key order; compare canonical value below instead.
          const old = row.quoteSnapshot as unknown as Quote;
          if (
            old?.policyVersion !== quote.policyVersion ||
            (old.pricingVersion ?? null) !== (quote.pricingVersion ?? null) ||
            old.fee !== quote.fee ||
            old.credit !== quote.credit ||
            old.payable !== quote.payable ||
            JSON.stringify(
              old.lines?.map((l) => [l.variantId, l.quantity, l.price, l.cost]),
            ) !==
              JSON.stringify(
                quote.lines.map((l) => [
                  l.variantId,
                  l.quantity,
                  l.price,
                  l.cost,
                ]),
              )
          )
            throw new ConflictException('QUOTE_PRICE_CHANGED');
        }
        const amounts = settlement(quote.credit, quote.payable);
        const policy = await this.policy(tx);
        if (
          amounts.additionalDue > 0 &&
          (!policy.allowDifferenceCod || input.paymentMethod !== 'COD')
        ) {
          throw new ServiceUnavailableException(
            'ONLINE_PAYMENT_MODULE_REQUIRED_FOR_DIFFERENCE',
          );
        }
        await tx.$queryRaw`SELECT id FROM inventory WHERE store_id=${row.storeId}::uuid
        AND product_variant_id=ANY(${variantIds}::uuid[]) ORDER BY id FOR UPDATE`;
        for (const line of quote.lines) {
          await tx.$queryRaw`SELECT id FROM inventory WHERE store_id=${row.storeId}::uuid AND product_variant_id=${line.variantId}::uuid FOR UPDATE`;
          const inventory = await tx.inventory.findUnique({
            where: {
              storeId_productVariantId: {
                storeId: row.storeId,
                productVariantId: line.variantId,
              },
            },
          });
          if (
            !inventory ||
            inventory.quantity - inventory.reservedQuantity < line.quantity
          )
            throw new ConflictException('REPLACEMENT_OUT_OF_STOCK');
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { reservedQuantity: { increment: line.quantity } },
          });
        }
        const replacement = await tx.order.create({
          data: {
            orderNumber: `EX-${randomUUID()}`,
            customerId,
            storeId: row.storeId,
            orderType: 'ONLINE',
            status: 'PENDING',
            subtotal: quote.lines.reduce((sum, line) => sum + (line.originalPrice ?? line.price) * line.quantity, 0),
            discountAmount: quote.lines.reduce((sum, line) => sum + (line.lineDiscount ?? 0), 0),
            totalAmount: quote.payable,
            shippingFee: quote.fee,
            shippingAddress: row.order.shippingAddress as Prisma.InputJsonValue,
            pricingSnapshot: json({ version: 1, exchangeReturnId: row.id }),
            items: {
              create: quote.lines.map((line) => ({
                productVariantId: line.variantId,
                productName: line.name,
                variantName: line.sku,
                quantity: line.quantity,
                unitPrice: line.originalPrice ?? line.price,
                promotionId: line.promotionId,
                unitCost: line.cost,
                discountAmount: line.lineDiscount ?? 0,
                totalPrice: line.cashValue ?? new Prisma.Decimal(line.price).mul(line.quantity),
                pricingSnapshot: {
                  version: 1,
                  cashValue: line.cashValue ?? new Prisma.Decimal(line.price).mul(line.quantity).toNumber(),
                  originalPrice: line.originalPrice ?? line.price,
                  promotionDiscount: line.promotionDiscount ?? 0,
                  tierDiscount: line.tierDiscount ?? 0,
                  pointsUsed: 0,
                  pointsValue: 0,
                  couponDiscount: 0,
                },
              })),
            },
            statusHistories: {
              create: { status: 'PENDING', changedBy: userId },
            },
            payments:
              amounts.additionalDue > 0
                ? {
                    create: {
                      paymentMethod: 'COD',
                      amount: amounts.additionalDue,
                      status: 'PENDING',
                    },
                  }
                : undefined,
          },
        });
        await reservePromotionBenefits(tx, replacement.id, quote.lines);
        const result = await tx.exchangeSettlement.create({
          data: {
            returnOrderId: id,
            replacementOrderId: replacement.id,
            ...amounts,
            status: 'ACTIVE',
          },
        });
        await transferFunding(
          tx,
          row.orderId,
          result.id,
          amounts.creditApplied,
        );
        if (amounts.refundDue > 0)
          await this.integration.reserveRefund(tx, id, amounts.refundDue);
        // Refund/points/inspection completion are finalized by the Admin integration, never inferred from client acceptance.
        await notifyUser(
          tx,
          userId,
          `RETURN:${id}:EXCHANGE_ACCEPTED`,
          'Đã xác nhận đổi hàng',
          'RETURN',
          { returnId: id, orderId: replacement.id },
        );
        return { settlement: result, replacementOrderId: replacement.id };
      },
    );
  }
}
