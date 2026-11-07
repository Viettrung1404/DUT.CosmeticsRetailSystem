import { Injectable } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ISupplierRepository,
  SupplierBalance,
  SupplierData,
  SupplierPaymentView,
  SupplierView,
} from '../../domain/repositories/supplier.repository.interface';

const toView = (s: Supplier): SupplierView => ({
  id: s.id,
  name: s.name,
  contactPerson: s.contactPerson,
  email: s.email,
  phone: s.phone,
  address: s.address,
  taxCode: s.taxCode,
  paymentTerms: s.paymentTerms,
  rating: s.rating === null ? null : Number(s.rating),
  isActive: s.isActive,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const PAYMENT_INCLUDE = {
  supplier: { select: { name: true } },
  purchaseOrder: { select: { poNumber: true } },
  creator: { select: { fullName: true } },
} satisfies Prisma.SupplierPaymentInclude;

type PaymentRow = Prisma.SupplierPaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>;

const toPaymentView = (p: PaymentRow): SupplierPaymentView => ({
  id: p.id,
  supplierId: p.supplierId,
  supplierName: p.supplier.name,
  purchaseOrderId: p.purchaseOrderId,
  poNumber: p.purchaseOrder?.poNumber ?? null,
  amount: Number(p.amount),
  paymentMethod: p.paymentMethod,
  paymentDate: p.paymentDate,
  status: p.status,
  note: p.note,
  createdBy: p.createdBy,
  createdByName: p.creator?.fullName ?? null,
  createdAt: p.createdAt,
});

const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filter: { skip: number; take: number; search?: string; isActive?: boolean }) {
    const where: Prisma.SupplierWhereInput = {
      isActive: filter.isActive,
      OR: filter.search
        ? [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { taxCode: { contains: filter.search } },
            { phone: { contains: filter.search } },
          ]
        : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: filter.skip, take: filter.take }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  async findById(id: string) {
    const row = await this.prisma.supplier.findUnique({ where: { id } });
    return row ? toView(row) : null;
  }

  findByTaxCode(taxCode: string) {
    return this.prisma.supplier.findFirst({ where: { taxCode }, select: { id: true } });
  }

  async create(data: SupplierData & { name: string }) {
    return toView(await this.prisma.supplier.create({ data }));
  }

  async update(id: string, data: SupplierData) {
    return toView(await this.prisma.supplier.update({ where: { id }, data }));
  }

  async setRating(id: string, rating: number, actorId: string) {
    const row = await this.prisma.$transaction(async (tx) => {
      const before = await tx.supplier.findUniqueOrThrow({ where: { id }, select: { rating: true } });
      const updated = await tx.supplier.update({ where: { id }, data: { rating } });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'SUPPLIER_RATE',
          entityType: 'suppliers',
          entityId: id,
          oldData: { rating: before.rating === null ? null : Number(before.rating) },
          newData: { rating },
        },
      });
      return updated;
    });
    return toView(row);
  }

  balance(id: string): Promise<SupplierBalance> {
    return this.computeBalance(this.prisma, id);
  }

  async createPayment(data: {
    supplierId: string;
    purchaseOrderId: string | null;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    note: string | null;
    createdBy: string;
  }): Promise<{ ok: true; payment: SupplierPaymentView } | { ok: false; balance: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM suppliers WHERE id = ${data.supplierId}::uuid FOR UPDATE`;
      const { balance } = await this.computeBalance(tx, data.supplierId);
      if (data.amount > balance) return { ok: false as const, balance };
      const created = await tx.supplierPayment.create({
        data: { ...data, status: 'COMPLETED' },
        include: PAYMENT_INCLUDE,
      });
      return { ok: true as const, payment: toPaymentView(created) };
    });
  }

  async findPayments(filter: { skip: number; take: number; supplierId?: string }) {
    const where: Prisma.SupplierPaymentWhereInput = { supplierId: filter.supplierId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.supplierPayment.count({ where }),
    ]);
    return { items: rows.map(toPaymentView), total };
  }

  async purchaseOrderSupplier(purchaseOrderId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { supplierId: true },
    });
    return po?.supplierId ?? null;
  }

  private async computeBalance(
    db: Prisma.TransactionClient | PrismaService,
    supplierId: string,
  ): Promise<SupplierBalance> {
    const [receipts, paid] = await Promise.all([
      db.goodsReceipt.findMany({
        where: { supplierId },
        select: { totalCost: true, invoiceAmount: true },
      }),
      db.supplierPayment.aggregate({
        where: { supplierId, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);
    const totalReceived = receipts.reduce(
      (sum, r) => sum + Number(r.invoiceAmount ?? r.totalCost),
      0,
    );
    const totalPaid = Number(paid._sum.amount ?? 0);
    return {
      supplierId,
      totalReceived: round(totalReceived),
      totalPaid: round(totalPaid),
      balance: round(totalReceived - totalPaid),
      receiptsWithoutInvoice: receipts.filter((r) => r.invoiceAmount === null).length,
    };
  }
}
