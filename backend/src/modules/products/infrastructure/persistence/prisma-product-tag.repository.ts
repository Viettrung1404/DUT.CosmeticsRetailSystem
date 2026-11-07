import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IProductTagRepository,
  ProductTagSummary,
} from '../../domain/repositories/product-tag.repository.interface';

@Injectable()
export class PrismaProductTagRepository implements IProductTagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: { search?: string; take: number }): Promise<ProductTagSummary[]> {
    const rows = await this.prisma.productTag.groupBy({
      by: ['tagName'],
      where: filter.search ? { tagName: { contains: filter.search, mode: 'insensitive' } } : undefined,
      _count: { productId: true },
      orderBy: [{ _count: { productId: 'desc' } }, { tagName: 'asc' }],
      take: filter.take,
    });
    return rows.map((r) => ({ name: r.tagName, productCount: r._count.productId }));
  }
}
