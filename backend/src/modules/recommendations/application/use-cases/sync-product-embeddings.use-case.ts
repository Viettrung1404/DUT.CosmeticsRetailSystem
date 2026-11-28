import { Injectable, Logger } from '@nestjs/common';
import {
  buildProductEmbeddingText,
  formatHalfvecLiteral,
} from '../../domain/product-embedding-text.util';
import { EmbeddingClientService } from '../../infrastructure/embedding-client.service';
import { RecommendationCacheService } from '../../infrastructure/recommendation-cache.service';
import { RecommendationRepository } from '../../infrastructure/recommendation.repository';

const JOB_LOCK_TTL_SECONDS = 600;
const EMBEDDING_BATCH_SIZE = 20;
const MAX_BATCHES_PER_RUN = 5;

export interface SyncProductEmbeddingsResult {
  skipped: boolean;
  reason?: string;
  model?: string;
  processed?: number;
  batches?: number;
}

@Injectable()
export class SyncProductEmbeddingsUseCase {
  private readonly logger = new Logger(SyncProductEmbeddingsUseCase.name);

  constructor(
    private readonly repository: RecommendationRepository,
    private readonly cache: RecommendationCacheService,
    private readonly embeddingClient: EmbeddingClientService,
  ) {}

  async execute(): Promise<SyncProductEmbeddingsResult> {
    if (!this.embeddingClient.isConfigured()) {
      this.logger.log(
        'Skipping embedding sync: CF_ACCOUNT_ID / CF_AI_API_TOKEN not configured',
      );
      return {
        skipped: true,
        reason: 'EMBEDDING_CLIENT_NOT_CONFIGURED',
      };
    }

    const locked = await this.cache.withJobLock(
      'sync-embeddings',
      JOB_LOCK_TTL_SECONDS,
      async () => {
        const model = this.embeddingClient.getModelName();
        let totalProcessed = 0;
        let batchCount = 0;

        for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
          if (!this.embeddingClient.hasRemainingDailyBudget(EMBEDDING_BATCH_SIZE)) {
            this.logger.warn(
              'Stopping embedding sync early to respect Cloudflare Workers AI free-tier daily budget',
            );
            break;
          }

          const candidates =
            await this.repository.findProductsNeedingEmbedding(
              model,
              EMBEDDING_BATCH_SIZE,
            );
          if (!candidates.length) {
            break;
          }

          const texts = candidates.map((product) =>
            buildProductEmbeddingText({
              name: product.name,
              categoryName: product.categoryName,
              brandName: product.brandName,
              ingredients: product.ingredients,
              specifications: product.specifications,
              howToUse: product.howToUse,
            }),
          );

          const vectors = await this.embeddingClient.embedTexts(texts);
          const records = candidates.map((product, idx) => ({
            productId: product.id,
            vectorLiteral: formatHalfvecLiteral(vectors[idx]),
          }));

          const updated = await this.repository.saveProductEmbeddings(
            model,
            records,
          );
          totalProcessed += updated;
          batchCount += 1;

          if (candidates.length < EMBEDDING_BATCH_SIZE) {
            break;
          }
        }

        this.logger.log(
          `Synced product embeddings (model=${model}): processed=${totalProcessed}, batches=${batchCount}`,
        );

        return {
          model,
          processed: totalProcessed,
          batches: batchCount,
        };
      },
    );

    if (!locked.acquired) {
      return { skipped: true };
    }

    return {
      skipped: false,
      ...locked.result,
    };
  }
}
