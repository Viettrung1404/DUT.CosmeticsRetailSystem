import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Prisma, RecommendationPlacement } from '@prisma/client';
import { BehaviorWeightPolicy } from '../../domain/behavior-weight.policy';
import {
  DailyImpressionIncrement,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';
import { RecommendationMetricsService } from '../services/recommendation-metrics.service';
import {
  ClientBehaviorEventDto,
  IngestEventsBatchDto,
  InternalIngestEventsBatchDto,
} from '../../presentation/dtos/ingest-events-batch.dto';

const MAX_EVENTS_PER_CLIENT_BATCH = 50;
const PII_METADATA_KEYS = new Set([
  'email',
  'phone',
  'address',
  'shippingAddress',
  'password',
  'token',
  'accessToken',
  'refreshToken',
]);

export interface IngestBehaviorBatchResult {
  received: number;
  inserted: number;
}

@Injectable()
export class IngestBehaviorBatchUseCase {
  constructor(
    private readonly repository: RecommendationRepository,
    @Optional() private readonly metricsService?: RecommendationMetricsService,
  ) {}

  private sanitizeMetadata(
    metadata?: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (PII_METADATA_KEYS.has(key)) continue;
      sanitized[key] = value;
    }

    return Object.keys(sanitized).length > 0
      ? (sanitized as Prisma.InputJsonValue)
      : undefined;
  }

  private buildRows(
    anonymousId: string,
    customerId: string | null,
    events: ClientBehaviorEventDto[],
  ): Prisma.UserBehaviorEventCreateManyInput[] {
    if (events.length > MAX_EVENTS_PER_CLIENT_BATCH) {
      throw new BadRequestException(
        `Maximum ${MAX_EVENTS_PER_CLIENT_BATCH} events allowed per batch`,
      );
    }

    return events.map((event) => {
      if (!BehaviorWeightPolicy.isClientAllowed(event.eventType)) {
        throw new BadRequestException(
          `Event type "${event.eventType}" is not allowed from client tracking`,
        );
      }

      return {
        id: event.id,
        customerId,
        anonymousId,
        eventType: event.eventType,
        productId: event.productId ?? null,
        variantId: event.variantId ?? null,
        categoryId: event.categoryId ?? null,
        brandId: event.brandId ?? null,
        weight: BehaviorWeightPolicy.getBaseWeight(event.eventType),
        source: event.source ?? null,
        metadata: this.sanitizeMetadata(event.metadata),
      };
    });
  }

  async executeClientBatch(
    dto: IngestEventsBatchDto,
    verifiedCustomerId: string | null,
  ): Promise<IngestBehaviorBatchResult> {
    const events = dto.events ?? [];
    const rows = this.buildRows(dto.anonymousId, verifiedCustomerId, events);

    if (this.metricsService) {
      if (dto.impressions?.length) {
        this.metricsService.recordImpressions(
          dto.impressions.map((imp) => ({
            placement: imp.placement as RecommendationPlacement,
            count: imp.count,
          })),
        );
      }
      if (rows.length) {
        this.metricsService.recordClicksFromEvents(rows);
      }
    } else if (dto.impressions?.length) {
      await this.repository.incrementDailyImpressions(dto.impressions);
    }

    const { count } = await this.repository.createBehaviorEventsBatch(rows);

    return {
      received: rows.length,
      inserted: count,
    };
  }

  async executeInternalBatch(
    dto: InternalIngestEventsBatchDto,
  ): Promise<IngestBehaviorBatchResult> {
    const envelopes = dto.batches?.length
      ? dto.batches
      : dto.anonymousId
        ? [
            {
              anonymousId: dto.anonymousId,
              customerId: dto.customerId ?? null,
              userId: dto.userId ?? null,
              events: dto.events ?? [],
              impressions: dto.impressions,
            },
          ]
        : [];

    if (!envelopes.length) {
      return { received: 0, inserted: 0 };
    }

    const identityCandidates = Array.from(
      new Set(
        envelopes
          .flatMap((env) => [env.userId, env.customerId])
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const resolvedCustomerMap =
      identityCandidates.length &&
      typeof this.repository.resolveCustomerIdLookup === 'function'
        ? await this.repository.resolveCustomerIdLookup(identityCandidates)
        : null;

    const allRows: Prisma.UserBehaviorEventCreateManyInput[] = [];
    const allImpressions: DailyImpressionIncrement[] = [];

    for (const env of envelopes) {
      const resolvedCustomerId = env.userId
        ? (resolvedCustomerMap?.get(env.userId) ?? null)
        : env.customerId
          ? (resolvedCustomerMap
              ? (resolvedCustomerMap.get(env.customerId) ?? null)
              : env.customerId)
          : null;

      const rows = this.buildRows(
        env.anonymousId,
        resolvedCustomerId,
        env.events ?? [],
      );
      allRows.push(...rows);
      if (env.impressions?.length) {
        for (const imp of env.impressions) {
          allImpressions.push({
            placement: imp.placement as RecommendationPlacement,
            count: imp.count,
          });
        }
      }
    }

    if (this.metricsService) {
      if (allImpressions.length) {
        this.metricsService.recordImpressions(allImpressions);
      }
      if (allRows.length) {
        this.metricsService.recordClicksFromEvents(allRows);
      }
    } else if (allImpressions.length) {
      await this.repository.incrementDailyImpressions(allImpressions);
    }

    const { count } = await this.repository.createBehaviorEventsBatch(allRows);

    return {
      received: allRows.length,
      inserted: count,
    };
  }
}
