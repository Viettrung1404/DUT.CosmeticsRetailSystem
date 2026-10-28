import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';
import { ElasticsearchProductService } from './elasticsearch-product.service';
import { ProductMapper } from '../mappers/product.mapper';
import { productIncludeConfig } from '../persistence/prisma-product.repository';

@Injectable()
export class CatalogIndexWorker implements OnApplicationShutdown {
  private active?: Promise<void>;
  private stopped = false;
  private nextReconnect = 0;
  private readonly logger = new Logger(CatalogIndexWorker.name);
  constructor(
    private readonly db: PrismaService,
    private readonly es: ElasticsearchProductService,
  ) {}
  @Interval(3000)
  async tick() {
    if (
      this.stopped ||
      this.active ||
      process.env.CATALOG_INDEX_WORKER_ENABLED !== 'true'
    )
      return;
    if (!this.es.isAvailable) {
      if (Date.now() < this.nextReconnect) return;
      this.nextReconnect = Date.now() + 30000;
      await this.es.initIndex();
      if (!this.es.isAvailable) return;
    }
    this.active = this.processBatch();
    try {
      await this.active;
    } catch {
      this.logger.warn('Catalog indexing deferred; jobs remain durable');
    } finally {
      this.active = undefined;
    }
  }
  async reindexAll() {
    // A single DB statement creates a durable checkpoint for every product.
    return this.db
      .$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT id,1,0,now(),now() FROM products
      ON CONFLICT(product_id) DO UPDATE SET version=catalog_index_jobs.version+1,attempts=0,next_attempt_at=now(),updated_at=now()`;
  }
  async ensureJobs() {
    return this.db
      .$executeRaw`INSERT INTO catalog_index_jobs(product_id,version,attempts,next_attempt_at,updated_at)
      SELECT id,1,0,now(),now() FROM products ON CONFLICT(product_id) DO NOTHING`;
  }
  async processBatch() {
    const token = randomUUID();
    const jobs = await this.db.$queryRaw<
      { product_id: string; version: bigint; attempts: number }[]
    >`UPDATE catalog_index_jobs j SET claim_token=${token}::uuid,lease_until=now()+interval '30 seconds',attempts=j.attempts+1
      WHERE product_id IN (SELECT product_id FROM catalog_index_jobs WHERE indexed_version<version AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at,product_id LIMIT 10 FOR UPDATE SKIP LOCKED)
      RETURNING product_id,version,attempts`;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          const row = await this.db.product.findUnique({
            where: { id: job.product_id },
            include: productIncludeConfig,
          });
          const product = row ? ProductMapper.toDomain(row) : null;
          const visible =
            product &&
            product.isActive &&
            product.isCategoryActive !== false &&
            product.isBrandActive !== false;
          await this.es.syncVersioned(
            job.product_id,
            visible ? ProductMapper.toSearchDocument(product) : null,
            Number(job.version),
          );
          const done = await this.db.catalogIndexJob.updateMany({
            where: {
              productId: job.product_id,
              version: job.version,
              claimToken: token,
            },
            data: {
              indexedVersion: job.version,
              claimToken: null,
              leaseUntil: null,
              attempts: 0,
            },
          });
          if (!done.count)
            await this.db.catalogIndexJob.updateMany({
              where: { productId: job.product_id, claimToken: token },
              data: { claimToken: null, leaseUntil: null },
            });
        } catch {
          await this.db.catalogIndexJob.updateMany({
            where: { productId: job.product_id, claimToken: token },
            data: {
              claimToken: null,
              leaseUntil: null,
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(3600, 2 ** Math.min(job.attempts, 10)) * 1000,
              ),
            },
          });
        }
      }),
    );
  }
  async onApplicationShutdown() {
    this.stopped = true;
    await this.active;
  }
}
