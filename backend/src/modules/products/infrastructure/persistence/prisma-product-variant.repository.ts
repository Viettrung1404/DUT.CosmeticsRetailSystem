import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IProductVariantRepository } from '../../domain/repositories/product-variant.repository.interface';
import { ProductVariantEntity } from '../../domain/entities/product-variant.entity';
import { VariantOptionValues } from '../../domain/entities/product.entity';
import { ProductVariantMapper } from '../mappers/product-variant.mapper';

@Injectable()
export class PrismaProductVariantRepository implements IProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductVariantEntity | null> {
    const raw = await this.prisma.productVariant.findUnique({ where: { id } });
    return raw ? ProductVariantMapper.toDomain(raw) : null;
  }

  async findByProduct(productId: string): Promise<ProductVariantEntity[]> {
    const rows = await this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((raw) => ProductVariantMapper.toDomain(raw));
  }

  async findBySku(sku: string): Promise<ProductVariantEntity | null> {
    const raw = await this.prisma.productVariant.findUnique({ where: { sku } });
    return raw ? ProductVariantMapper.toDomain(raw) : null;
  }

  async findByBarcode(barcode: string): Promise<ProductVariantEntity | null> {
    const raw = await this.prisma.productVariant.findUnique({ where: { barcode } });
    return raw ? ProductVariantMapper.toDomain(raw) : null;
  }

  async findByOptions(
    productId: string,
    options: VariantOptionValues,
  ): Promise<ProductVariantEntity | null> {
    // null trong where của Prisma sinh ra IS NULL, khớp với index NULLS NOT DISTINCT trên DB
    const raw = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        option1Value: options.option1Value ?? null,
        option2Value: options.option2Value ?? null,
        option3Value: options.option3Value ?? null,
      },
    });
    return raw ? ProductVariantMapper.toDomain(raw) : null;
  }

  async create(variant: ProductVariantEntity): Promise<ProductVariantEntity> {
    const created = await this.prisma.productVariant.create({
      data: ProductVariantMapper.toPersistence(variant),
    });
    return ProductVariantMapper.toDomain(created);
  }

  async update(variant: ProductVariantEntity): Promise<ProductVariantEntity> {
    const updated = await this.prisma.productVariant.update({
      where: { id: variant.id },
      data: ProductVariantMapper.toPersistence(variant),
    });
    return ProductVariantMapper.toDomain(updated);
  }
}
