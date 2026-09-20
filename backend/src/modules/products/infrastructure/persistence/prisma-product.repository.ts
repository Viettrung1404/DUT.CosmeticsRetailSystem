import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductMapper } from '../mappers/product.mapper';
import { PageOptionsDto } from '@core/common/pagination.dto';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProductEntity | null> {
    const raw = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return raw ? ProductMapper.toDomain(raw) : null;
  }

  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const raw = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return raw ? ProductMapper.toDomain(raw) : null;
  }

  async findAll(options: PageOptionsDto): Promise<{ items: ProductEntity[]; total: number }> {
    const [rawItems, total] = await Promise.all([
      this.prisma.product.findMany({
        skip: options.skip,
        take: options.limit,
        orderBy: { createdAt: options.order?.toLowerCase() as 'asc' | 'desc' },
        include: {
          variants: true,
          images: {
            where: { isPrimary: true },
          },
        },
      }),
      this.prisma.product.count(),
    ]);

    return {
      items: rawItems.map((item) => ProductMapper.toDomain(item)),
      total,
    };
  }

  async create(product: ProductEntity): Promise<ProductEntity> {
    const data = ProductMapper.toPersistence(product);
    const created = await this.prisma.product.create({
      data,
      include: { variants: true },
    });

    return ProductMapper.toDomain(created);
  }

  async update(product: ProductEntity): Promise<ProductEntity> {
    const data = ProductMapper.toPersistence(product);
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data,
      include: { variants: true },
    });

    return ProductMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id },
    });
  }
}
