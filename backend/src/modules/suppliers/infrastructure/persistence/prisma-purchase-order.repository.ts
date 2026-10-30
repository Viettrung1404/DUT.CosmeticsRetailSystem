import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { nextDocumentCode } from '@infrastructure/database/document-code.util';
import {
  IPurchaseOrderRepository,
  PurchaseOrderLine,
  PurchaseOrderView,
} from '../../domain/repositories/purchase-order.repository.interface';

const INCLUDE = {
  supplier: { select: { name: true } },
  store: { select: { name: true } },
  creator: { select: { fullName: true } },
  approver: { select: { fullName: true } },
  items: {
    include: { variant: { select: { sku: true, product: { select: { name: true } } } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  goodsReceipts: {
    include: { receiver: { select: { fullName: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PurchaseOrderInclude;

type Row = Prisma.PurchaseOrderGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): PurchaseOrderView => ({
  id: r.id,
  poNumber: r.poNumber,
  supplierId: r.supplierId,
  supplierName: r.supplier.name,
  storeId: r.storeId,
  storeName: r.store.name,
  status: r.status,
  totalAmount: Number(r.totalAmount),
  note: r.note,
  expectedDate: r.expectedDate,
  receivedDate: r.receivedDate,
  createdBy: r.createdBy,
  createdByName: r.creator?.fullName ?? null,
  approvedBy: r.approvedBy,
  approvedByName: r.approver?.fullName ?? null,
  approvedAt: r.approvedAt,
  createdAt: r.createdAt,
  items: r.items.map((i) => ({
    id: i.id,
    productVariantId: i.productVariantId,
    sku: i.variant.sku,
    productName: i.variant.product.name,
    quantityOrdered: i.quantityOrdered,
    quantityReceived: i.quantityReceived,
    unitCost: Number(i.unitCost),
    totalCost: Number(i.totalCost),
  })),
  receipts: r.goodsReceipts.map((g) => ({
    id: g.id,
    receiptCode: g.receiptCode,
    receivedDate: g.receivedDate,
    deliveredBy: g.deliveredBy,
    receivedByName: g.receiver?.fullName ?? null,
    totalCost: Number(g.totalCost),
    invoiceNumber: g.invoiceNumber,
    invoiceDate: g.invoiceDate,
    invoiceAmount: g.invoiceAmount === null ? null : Number(g.invoiceAmount),
  })),
});

const lineTotal = (l: PurchaseOrderLine) => Math.round(l.quantity * l.unitCost * 100) / 100;
const itemRows = (items: PurchaseOrderLine[]) =>
  items.map((l) => ({
    productVariantId: l.productVariantId,
    quantityOrdered: l.quantity,
    unitCost: l.unitCost,
    totalCost: lineTotal(l),
  }));
const sum = (items: PurchaseOrderLine[]) =>
  Math.round(items.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;

@Injectable()
export class PrismaPurchaseOrderRepository implements IPurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStore(id: string) {
    return this.prisma.store.findUnique({ where: { id }, select: { id: true, type: true, isActive: true } });
  }

  findSupplier(id: string) {
    return this.prisma.supplier.findUnique({ where: { id }, select: { id: true, isActive: true } });
  }

  async findMissingVariants(ids: string[]) {
    const found = await this.prisma.productVariant.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const set = new Set(found.map((v) => v.id));
    return ids.filter((id) => !set.has(id));
  }

  create(data: {
    supplierId: string;
    storeId: string;
    note: string | null;
    expectedDate: Date | null;
    createdBy: string;
    items: PurchaseOrderLine[];
  }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: await nextDocumentCode(tx, 'PO'),
          supplierId: data.supplierId,
          storeId: data.storeId,
          status: 'DRAFT',
          totalAmount: sum(data.items),
          note: data.note,
          expectedDate: data.expectedDate,
          createdBy: data.createdBy,
          items: { create: itemRows(data.items) },
        },
      });
      return po.id;
    });
  }

  replaceDraft(
    id: string,
    data: { note?: string | null; expectedDate?: Date | null; items?: PurchaseOrderLine[] },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.updateMany({
        where: { id, status: 'DRAFT' },
        data: {
          note: data.note,
          expectedDate: data.expectedDate,
          ...(data.items ? { totalAmount: sum(data.items) } : {}),
        },
      });
      if (!updated.count) return false;
      if (data.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: itemRows(data.items).map((r) => ({ ...r, purchaseOrderId: id })),
        });
      }
      return true;
    });
  }

  async changeStatus(
    id: string,
    from: string[],
    to: string,
    data: { approvedBy?: string; requireNothingReceived?: boolean } = {},
  ): Promise<boolean> {
    const result = await this.prisma.purchaseOrder.updateMany({
      where: {
        id,
        status: { in: from },
        ...(data.requireNothingReceived ? { items: { none: { quantityReceived: { gt: 0 } } } } : {}),
      },
      data: {
        status: to,
        ...(data.approvedBy ? { approvedBy: data.approvedBy, approvedAt: new Date() } : {}),
      },
    });
    return result.count > 0;
  }

  async findById(id: string) {
    const row = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async findMany(filter: {
    skip: number;
    take: number;
    storeIds?: string[];
    supplierId?: string;
    status?: string;
    search?: string;
  }) {
    const where: Prisma.PurchaseOrderWhereInput = {
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      supplierId: filter.supplierId,
      status: filter.status,
      OR: filter.search
        ? [
            { poNumber: { contains: filter.search, mode: 'insensitive' } },
            { supplier: { name: { contains: filter.search, mode: 'insensitive' } } },
          ]
        : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }
}
