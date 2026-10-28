import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ProductResponseDto } from '@modules/products/presentation/dtos/product-response.dto';
import { ProductMapper } from '@modules/products/infrastructure/mappers/product.mapper';
import { productIncludeConfig } from '@modules/products/infrastructure/persistence/prisma-product.repository';
import { CustomerCommands, lockCustomer } from '../infrastructure/commands';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CustomerCommands,
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
  async list(customerId: string, page: number, limit: number) {
    const where = { customerId, product: { isActive: true } };
    const [rows, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { product: { include: productIncludeConfig } },
      }),
      this.prisma.wishlist.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...ProductResponseDto.fromDomain(ProductMapper.toDomain(row.product)),
        isWishlisted: true,
      })),
      page,
      limit,
      total,
    };
  }
}
