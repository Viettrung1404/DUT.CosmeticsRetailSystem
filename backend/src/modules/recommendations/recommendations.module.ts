import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CustomerContextService } from '@core/services/customer-context.service';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure/async-infrastructure.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { RecommendationRepository } from './infrastructure/recommendation.repository';
import { RecommendationCacheService } from './infrastructure/recommendation-cache.service';
import { EmbeddingClientService } from './infrastructure/embedding-client.service';
import { InSessionPersonalizerService } from './application/services/in-session-personalizer.service';
import { RecommendationMetricsService } from './application/services/recommendation-metrics.service';
import { IngestBehaviorBatchUseCase } from './application/use-cases/ingest-behavior-batch.use-case';
import { MergeAnonymousEventsUseCase } from './application/use-cases/merge-anonymous-events.use-case';
import { RecomputeSimilarProductsUseCase } from './application/use-cases/recompute-similar-products.use-case';
import { RecomputeBoughtTogetherUseCase } from './application/use-cases/recompute-bought-together.use-case';
import { RecomputeUserAffinitiesUseCase } from './application/use-cases/recompute-user-affinities.use-case';
import { RefreshTrendingCacheUseCase } from './application/use-cases/refresh-trending-cache.use-case';
import { CleanupOldEventsUseCase } from './application/use-cases/cleanup-old-events.use-case';
import { GetHomeRecommendationsUseCase } from './application/use-cases/get-home-recommendations.use-case';
import { GetSimilarProductsUseCase } from './application/use-cases/get-similar-products.use-case';
import { GetBoughtTogetherProductsUseCase } from './application/use-cases/get-bought-together-products.use-case';
import { GetCartRecommendationsUseCase } from './application/use-cases/get-cart-recommendations.use-case';
import { SyncProductEmbeddingsUseCase } from './application/use-cases/sync-product-embeddings.use-case';
import { SemanticSearchProductsUseCase } from './application/use-cases/semantic-search-products.use-case';
import { OrderPurchaseEventListener } from './application/listeners/order-purchase-event.listener';
import { RecommendationsController } from './presentation/recommendations.controller';
import { InternalRecommendationsController } from './presentation/internal-recommendations.controller';
import { AdminRecommendationsController } from './presentation/admin-recommendations.controller';

@Module({
  imports: [PrismaModule, AsyncInfrastructureModule, PermissionsModule],
  controllers: [
    RecommendationsController,
    InternalRecommendationsController,
    AdminRecommendationsController,
  ],
  providers: [
    CustomerContextService,
    RecommendationRepository,
    RecommendationCacheService,
    EmbeddingClientService,
    InSessionPersonalizerService,
    RecommendationMetricsService,
    IngestBehaviorBatchUseCase,
    MergeAnonymousEventsUseCase,
    RecomputeSimilarProductsUseCase,
    RecomputeBoughtTogetherUseCase,
    RecomputeUserAffinitiesUseCase,
    RefreshTrendingCacheUseCase,
    CleanupOldEventsUseCase,
    GetHomeRecommendationsUseCase,
    GetSimilarProductsUseCase,
    GetBoughtTogetherProductsUseCase,
    GetCartRecommendationsUseCase,
    SyncProductEmbeddingsUseCase,
    SemanticSearchProductsUseCase,
    OrderPurchaseEventListener,
  ],
  exports: [
    RecommendationRepository,
    RecommendationCacheService,
    EmbeddingClientService,
    RecommendationMetricsService,
    MergeAnonymousEventsUseCase,
  ],
})
export class RecommendationsModule {}
