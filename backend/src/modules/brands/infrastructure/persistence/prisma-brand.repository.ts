import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  BrandListFilter,
  IBrandRepository,
} from '../../domain/repositories/brand.repository.interface';
import { BrandEntity } from '../../domain/entities/brand.entity';
import { BrandMapper } from '../mappers/brand.mapper';

@Injectable()
export class PrismaBrandRepository implements IBrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BrandEntity | null> {
    const raw = await this.prisma.brand.findUnique({ where: { id } });
    return raw ? BrandMapper.toDomain(raw) : null;
  }

  async findBySlug(slug: string): Promise<BrandEntity | null> {
    const raw = await this.prisma.brand.findUnique({ where: { slug } });
    return raw ? BrandMapper.toDomain(raw) : null;
  }

  async findAll(filter: BrandListFilter): Promise<{ items: BrandEntity[]; total: number }> {
    const where: Prisma.BrandWhereInput = {
      isActive: filter.isActive,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };

    const [rawItems, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip: filter.skip,
        take: filter.take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: filter.order }],
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { items: rawItems.map((raw) => BrandMapper.toDomain(raw)), total };
  }

  async create(brand: BrandEntity): Promise<BrandEntity> {
    const created = await this.prisma.brand.create({ data: BrandMapper.toPersistence(brand) });
    return BrandMapper.toDomain(created);
  }

  async update(brand: BrandEntity): Promise<BrandEntity> {
    const updated = await this.prisma.brand.update({
      where: { id: brand.id },
      data: BrandMapper.toPersistence(brand),
    });
    return BrandMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brand.delete({ where: { id } });
  }

  countProducts(brandId: string): Promise<number> {
    return this.prisma.product.count({ where: { brandId } });
  }
}
