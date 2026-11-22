import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ProductResponseDto } from '@modules/products/presentation/dtos/product-response.dto';
import { ProductMapper } from '@modules/products/infrastructure/mappers/product.mapper';
import { productIncludeConfig } from '@modules/products/infrastructure/persistence/prisma-product.repository';
import {
  OpenSearchProductDocument,
  OpenSearchProductService,
} from '@modules/products/infrastructure/search/opensearch-product.service';
import { CustomerCommands, lockCustomer } from '../infrastructure/commands';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CustomerCommands,
    @Optional() private readonly searchService?: OpenSearchProductService,
  ) {}
  change(userId: string, key: string, productId: string, desired?: boolean) {
    return this.commands.execute(
      userId,
      'WISHLIST',
      key,
      { productId, desired },
      async (tx, customerId) => {
        await lockCustomer(tx, customerId);
        const product = await tx.product.findFirst({
          where: { id: productId, isActive: true },
        });
        if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
        const where = { customerId_productId: { customerId, productId } };
        const previous = await tx.wishlist.findUnique({ where });
        const selected = desired ?? !previous;
        if (selected && !previous)
          await tx.wishlist.create({ data: { customerId, productId } });
        if (!selected && previous) await tx.wishlist.delete({ where });
        return { productId, isWishlisted: selected };
      },
    );
  }

  async getIds(customerId: string): Promise<{ ids: string[] }> {
    const rows = await this.prisma.wishlist.findMany({
      where: { customerId, product: { isActive: true } },
      select: { productId: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return { ids: rows.map((r) => r.productId) };
  }

  async list(customerId: string, page: number, limit: number) {
    const where = { customerId, product: { isActive: true } };
    const [rows, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { productId: true },
      }),
      this.prisma.wishlist.count({ where }),
    ]);

    const productIds = rows.map((r) => r.productId);
    if (productIds.length === 0) {
      return { items: [], page, limit, total };
    }

    // 1. Try OpenSearch Multi-Get (mget) first for ultra-fast response
    if (this.searchService?.isAvailable) {
      const docs = await this.searchService.getProductsByIds(productIds);
      if (docs && docs.length > 0) {
        const docMap = new Map(docs.map((d) => [d.id, d]));
        const items = productIds
          .map((id) => docMap.get(id))
          .filter((doc): doc is OpenSearchProductDocument => !!doc && doc.isActive)
          .map((doc) => ({
            ...ProductResponseDto.fromOpenSearch(doc),
            isWishlisted: true,
          }));

        if (items.length === productIds.length) {
          return { items, page, limit, total };
        }
      }
    }

    // 2. Fallback to PostgreSQL if OpenSearch is unavailable or some products were not yet indexed
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: productIncludeConfig,
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const items = productIds
      .map((id) => productMap.get(id))
      .filter((p): p is (typeof products)[0] => !!p)
      .map((product) => ({
        ...ProductResponseDto.fromDomain(ProductMapper.toDomain(product)),
        isWishlisted: true,
      }));

    return {
      items,
      page,
      limit,
      total,
    };
  }
}
