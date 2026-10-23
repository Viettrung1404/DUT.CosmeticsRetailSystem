import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PosVariantStock } from '../../domain/entities/pos-lookup.entity';
import {
  ExpiryWindow,
  IPosCatalogRepository,
} from '../../domain/repositories/pos-catalog.repository.interface';

const variantInclude = (storeId: string) =>
  ({
    product: { select: { id: true, name: true, isActive: true } },
    inventory: { where: { storeId }, select: { quantity: true, reservedQuantity: true } },
    batches: {
      where: { storeId, isActive: true, quantity: { gt: 0 } },
      select: { quantity: true, expiryDate: true },
    },
  }) satisfies Prisma.ProductVariantInclude;

type VariantRow = Prisma.ProductVariantGetPayload<{ include: ReturnType<typeof variantInclude> }>;

const toStock = (row: VariantRow, window: ExpiryWindow): PosVariantStock => {
  const stock = row.inventory[0];
  const expiredQuantity = row.batches
    .filter((b) => b.expiryDate.getTime() < window.today.getTime())
    .reduce((sum, b) => sum + b.quantity, 0);
  const hasNearExpiry = row.batches.some(
    (b) =>
      b.expiryDate.getTime() >= window.today.getTime() &&
      b.expiryDate.getTime() < window.nearLimit.getTime(),
  );
  const options = [row.option1Value, row.option2Value, row.option3Value].filter(Boolean);
  return {
    variantId: row.id,
    productId: row.product.id,
    productName: row.product.name,
    variantName: options.length ? options.join(' / ') : null,
    sku: row.sku,
    barcode: row.barcode,
    price: Number(row.price),
    isActive: row.isActive,
    productActive: row.product.isActive,
    onHand: stock?.quantity ?? 0,
    reserved: stock?.reservedQuantity ?? 0,
    expiredQuantity,
    hasNearExpiry,
  };
};

@Injectable()
export class PrismaPosCatalogRepository implements IPosCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVariantByBarcode(
    barcode: string,
    storeId: string,
    window: ExpiryWindow,
  ): Promise<PosVariantStock | null> {
    const row = await this.prisma.productVariant.findUnique({
      where: { barcode },
      include: variantInclude(storeId),
    });
    return row ? toStock(row, window) : null;
  }

  async searchVariants(
    keyword: string,
    storeId: string,
    window: ExpiryWindow,
    skip: number,
    take: number,
  ): Promise<{ items: PosVariantStock[]; total: number }> {
    const where: Prisma.ProductVariantWhereInput = {
      isActive: true,
      product: { isActive: true },
      OR: [
        { sku: { contains: keyword, mode: 'insensitive' } },
        { product: { name: { contains: keyword, mode: 'insensitive' } } },
        { product: { sku: { contains: keyword, mode: 'insensitive' } } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        include: variantInclude(storeId),
        orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
        skip,
        take,
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return { items: rows.map((row) => toStock(row, window)), total };
  }
}
