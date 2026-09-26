import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ProductMapper } from '../mappers/product.mapper';
import { productIncludeConfig } from '../persistence/prisma-product.repository';
import { ElasticsearchProductService } from './elasticsearch-product.service';

// Ghi DB thành công mà ghi Elasticsearch lỗi thì chỉ số tìm kiếm bị lệch;
// mỗi lần server khởi động và kết nối được Elasticsearch, đồng bộ lại toàn bộ từ DB
@Injectable()
export class ProductSearchSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductSearchSyncService.name);
  private static readonly BATCH_SIZE = 200;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly esService?: ElasticsearchProductService,
  ) {}

  onApplicationBootstrap(): void {
    // Chạy nền để không làm chậm lúc server khởi động
    void this.reindexAll();
  }

  async reindexAll(): Promise<number> {
    if (!this.esService?.isAvailable) return 0;

    let indexed = 0;
    let cursor: string | undefined;
    try {
      for (;;) {
        const batch = await this.prisma.product.findMany({
          take: ProductSearchSyncService.BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
          orderBy: { id: 'asc' },
          include: productIncludeConfig,
        });
        if (batch.length === 0) break;

        const docs = batch.map((raw) => ProductMapper.toSearchDocument(ProductMapper.toDomain(raw)));
        indexed += await this.esService.bulkIndex(docs);
        cursor = batch[batch.length - 1].id;
      }
      this.logger.log(`Đã đồng bộ ${indexed} sản phẩm sang Elasticsearch`);
    } catch (error) {
      this.logger.error(`Đồng bộ Elasticsearch thất bại: ${(error as Error).message}`);
    }
    return indexed;
  }
}
