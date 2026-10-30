import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  BatchListFilter,
  BatchView,
  IBatchRepository,
} from '../../domain/repositories/batch.repository.interface';

const INCLUDE = {
  store: { select: { name: true } },
  variant: { select: { sku: true, product: { select: { name: true } } } },
} satisfies Prisma.BatchInclude;

type Row = Prisma.BatchGetPayload<{ include: typeof INCLUDE }>;

const toView = (r: Row): BatchView => ({
  id: r.id,
  storeId: r.storeId,
  storeName: r.store.name,
  productVariantId: r.productVariantId,
  sku: r.variant.sku,
  productName: r.variant.product.name,
  batchNumber: r.batchNumber,
  quantity: r.quantity,
  manufactureDate: r.manufactureDate,
  expiryDate: r.expiryDate,
  isActive: r.isActive,
});

@Injectable()
export class PrismaBatchRepository implements IBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filter: BatchListFilter): Promise<{ items: BatchView[]; total: number }> {
    const where: Prisma.BatchWhereInput = {
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      productVariantId: filter.productVariantId,
      isActive: filter.isActive,
      quantity: filter.includeEmpty ? undefined : { gt: 0 },
      expiryDate:
        filter.expiryFrom || filter.expiryBefore
          ? { gte: filter.expiryFrom, lt: filter.expiryBefore }
          : undefined,
      OR: filter.search
        ? [
            { batchNumber: { contains: filter.search, mode: 'insensitive' } },
            { variant: { sku: { contains: filter.search, mode: 'insensitive' } } },
            { variant: { product: { name: { contains: filter.search, mode: 'insensitive' } } } },
          ]
        : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        include: INCLUDE,
        orderBy: [{ expiryDate: 'asc' }, { batchNumber: 'asc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.batch.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  async findById(id: string): Promise<BatchView | null> {
    const row = await this.prisma.batch.findUnique({ where: { id }, include: INCLUDE });
    return row ? toView(row) : null;
  }

  async setActive(id: string, isActive: boolean, actorId: string, reason: string | null): Promise<BatchView> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.batch.update({ where: { id }, data: { isActive }, include: INCLUDE });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: isActive ? 'BATCH_UNLOCK' : 'BATCH_LOCK',
          entityType: 'batches',
          entityId: id,
          oldData: { isActive: !isActive },
          newData: { isActive, reason },
        },
      });
      return updated;
    });
    return toView(row);
  }
}
