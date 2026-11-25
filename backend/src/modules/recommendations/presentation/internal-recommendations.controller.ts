import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { InternalTokenGuard } from '@modules/async-infrastructure/webhooks/internal-token.guard';
import { IngestBehaviorBatchUseCase } from '../application/use-cases/ingest-behavior-batch.use-case';
import { RecomputeSimilarProductsUseCase } from '../application/use-cases/recompute-similar-products.use-case';
import { RecomputeBoughtTogetherUseCase } from '../application/use-cases/recompute-bought-together.use-case';
import { RecomputeUserAffinitiesUseCase } from '../application/use-cases/recompute-user-affinities.use-case';
import { RefreshTrendingCacheUseCase } from '../application/use-cases/refresh-trending-cache.use-case';
import { CleanupOldEventsUseCase } from '../application/use-cases/cleanup-old-events.use-case';
import { SyncProductEmbeddingsUseCase } from '../application/use-cases/sync-product-embeddings.use-case';
import { RecommendationMetricsService } from '../application/services/recommendation-metrics.service';
import { InternalIngestEventsBatchDto } from './dtos/ingest-events-batch.dto';

@ApiTags('Internal Recommendations')
@Public()
@UseGuards(InternalTokenGuard)
@Controller('internal/recommendations')
export class InternalRecommendationsController {
  constructor(
    private readonly ingestBehaviorBatch: IngestBehaviorBatchUseCase,
    private readonly recomputeSimilarProducts: RecomputeSimilarProductsUseCase,
    private readonly recomputeBoughtTogether: RecomputeBoughtTogetherUseCase,
    private readonly recomputeUserAffinities: RecomputeUserAffinitiesUseCase,
    private readonly refreshTrendingCache: RefreshTrendingCacheUseCase,
    private readonly cleanupOldEvents: CleanupOldEventsUseCase,
    private readonly syncProductEmbeddings: SyncProductEmbeddingsUseCase,
    private readonly metricsService: RecommendationMetricsService,
  ) {}

  @Post('events/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Tiếp nhận batch sự kiện từ Cloudflare Worker Consumer (đã verify JWT ở Edge)',
  })
  @ApiHeader({
    name: 'X-Internal-Token',
    required: true,
    description: 'Shared secret token giữa Cloudflare Worker Consumer và NestJS',
  })
  @ApiAcceptedResponse({
    description: 'Đã tiếp nhận batch sự kiện từ Cloudflare Worker Consumer',
  })
  async ingestInternalEventsBatch(@Body() dto: InternalIngestEventsBatchDto) {
    const result = await this.ingestBehaviorBatch.executeInternalBatch(dto);
    return {
      accepted: true,
      ...result,
    };
  }

  @Post('jobs/trending')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({ summary: 'Cron job: Làm mới Top 50 Trending 7 ngày lên Redis' })
  runTrendingJob() {
    return this.refreshTrendingCache.execute();
  }

  @Post('jobs/affinities')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary: 'Cron job: Cập nhật User Affinity Profile (incremental 24h)',
  })
  runAffinitiesJob() {
    return this.recomputeUserAffinities.execute();
  }

  @Post('jobs/similar')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary: 'Cron job: Tính lại Top 12 sản phẩm tương đồng (Content-Based)',
  })
  runSimilarJob() {
    return this.recomputeSimilarProducts.execute();
  }

  @Post('jobs/bought-together')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary:
      'Cron job: Tính lại gợi ý Thường mua cùng (Co-occurrence Lift + Routine rules)',
  })
  runBoughtTogetherJob() {
    return this.recomputeBoughtTogether.execute();
  }

  @Post('jobs/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary: 'Cron job: Dọn dẹp user_behavior_events quá 90 ngày theo batch nhỏ',
  })
  runCleanupJob() {
    return this.cleanupOldEvents.execute();
  }

  @Post('jobs/flush-metrics')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary: 'Cron job: Flush RAM metrics (impressions, clicks, addToCarts) xuống PostgreSQL nếu có dữ liệu',
  })
  runFlushMetricsJob() {
    return this.metricsService.flushBuffer();
  }

  @Post('jobs/sync-embeddings')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Internal-Token', required: true })
  @ApiOperation({
    summary:
      'Cron job: Đồng bộ vector embedding halfvec(1024) qua Cloudflare Workers AI @cf/baai/bge-m3 theo batch 20 SP',
  })
  runSyncEmbeddingsJob() {
    return this.syncProductEmbeddings.execute();
  }
}
