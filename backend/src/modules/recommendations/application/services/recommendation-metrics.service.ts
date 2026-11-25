import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RecommendationPlacement } from '@prisma/client';
import {
  DailyMetricCounterIncrement,
  RecommendationRepository,
} from '../../infrastructure/recommendation.repository';

export const ATTRIBUTION_SOURCE_TO_PLACEMENT: Record<
  string,
  RecommendationPlacement
> = {
  rec_home: RecommendationPlacement.HOME,
  rec_similar: RecommendationPlacement.PRODUCT_SIMILAR,
  rec_bought_together: RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
  rec_cart: RecommendationPlacement.CART_ROUTINE,
};

const ALL_PLACEMENTS: readonly RecommendationPlacement[] = [
  RecommendationPlacement.HOME,
  RecommendationPlacement.PRODUCT_SIMILAR,
  RecommendationPlacement.PRODUCT_BOUGHT_TOGETHER,
  RecommendationPlacement.CART_ROUTINE,
];

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

interface BufferedCounter {
  impressions: number;
  clicks: number;
  addToCarts: number;
}

export interface PlacementMetricsSummary {
  placement: RecommendationPlacement;
  impressions: number;
  clicks: number;
  addToCarts: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cvr: number;
}

export interface AdminRecommendationMetricsReport {
  from: string;
  to: string;
  totals: {
    impressions: number;
    clicks: number;
    addToCarts: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cvr: number;
  };
  byPlacement: PlacementMetricsSummary[];
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeRate(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

@Injectable()
export class RecommendationMetricsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecommendationMetricsService.name);
  private readonly buffer = new Map<RecommendationPlacement, BufferedCounter>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly repository: RecommendationRepository) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      void this.flushBuffer().catch((err: any) => {
        this.logger.warn(
          `Periodic recommendation metrics flush failed: ${err?.message ?? 'unknown'}`,
        );
      });
    }, FLUSH_INTERVAL_MS);

    if (typeof this.flushTimer?.unref === 'function') {
      this.flushTimer.unref();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushBuffer();
  }

  private addToBuffer(
    placement: RecommendationPlacement,
    delta: Partial<BufferedCounter>,
  ): void {
    const current = this.buffer.get(placement) ?? {
      impressions: 0,
      clicks: 0,
      addToCarts: 0,
    };
    this.buffer.set(placement, {
      impressions: current.impressions + Math.max(0, delta.impressions ?? 0),
      clicks: current.clicks + Math.max(0, delta.clicks ?? 0),
      addToCarts: current.addToCarts + Math.max(0, delta.addToCarts ?? 0),
    });
  }

  recordImpressions(
    impressions: ReadonlyArray<{
      placement: RecommendationPlacement;
      count: number;
    }>,
  ): void {
    for (const item of impressions) {
      if (item.count > 0) {
        this.addToBuffer(item.placement, { impressions: item.count });
      }
    }
  }

  recordClicksFromEvents(
    events: ReadonlyArray<{ source?: string | null }>,
  ): void {
    for (const ev of events) {
      if (!ev.source) continue;
      const placement = ATTRIBUTION_SOURCE_TO_PLACEMENT[ev.source];
      if (placement) {
        this.addToBuffer(placement, { clicks: 1 });
      }
    }
  }

  recordAddToCart(attributionSource?: string | null): void {
    if (!attributionSource) return;
    const placement = ATTRIBUTION_SOURCE_TO_PLACEMENT[attributionSource];
    if (placement) {
      this.addToBuffer(placement, { addToCarts: 1 });
    }
  }

  isBufferEmpty(): boolean {
    for (const entry of this.buffer.values()) {
      if (entry.impressions > 0 || entry.clicks > 0 || entry.addToCarts > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Chỉ ghi DB khi RAM buffer không rỗng (giữ Neon auto-suspend khi không có traffic).
   */
  async flushBuffer(): Promise<{ flushed: boolean; placementsUpdated: number }> {
    if (this.isBufferEmpty()) {
      return { flushed: false, placementsUpdated: 0 };
    }

    const increments: DailyMetricCounterIncrement[] = [];
    for (const [placement, counter] of this.buffer.entries()) {
      if (
        counter.impressions > 0 ||
        counter.clicks > 0 ||
        counter.addToCarts > 0
      ) {
        increments.push({
          placement,
          impressions: counter.impressions,
          clicks: counter.clicks,
          addToCarts: counter.addToCarts,
        });
      }
    }
    this.buffer.clear();

    try {
      await this.repository.flushDailyMetricsCounters(increments);
      return { flushed: true, placementsUpdated: increments.length };
    } catch (error) {
      // Khôi phục lại buffer nếu flush thất bại tạm thời
      for (const item of increments) {
        this.addToBuffer(item.placement, item);
      }
      throw error;
    }
  }

  async getMetricsReport(
    from?: string,
    to?: string,
  ): Promise<AdminRecommendationMetricsReport> {
    const today = new Date();
    const defaultTo = formatUtcDate(today);
    const defaultFrom = formatUtcDate(
      new Date(today.getTime() - 29 * 86_400_000),
    );

    const fromDate = from || defaultFrom;
    const toDate = to || defaultTo;

    const dbRows = await this.repository.queryAdminDailyMetrics(
      fromDate,
      toDate,
    );
    const rowByPlacement = new Map(dbRows.map((r) => [r.placement, { ...r }]));

    const includesToday = toDate >= defaultTo && fromDate <= defaultTo;
    if (includesToday) {
      for (const [placement, buffered] of this.buffer.entries()) {
        const existing = rowByPlacement.get(placement) ?? {
          placement,
          impressions: 0,
          clicks: 0,
          addToCarts: 0,
          conversions: 0,
          revenue: 0,
        };
        existing.impressions += buffered.impressions;
        existing.clicks += buffered.clicks;
        existing.addToCarts += buffered.addToCarts;
        rowByPlacement.set(placement, existing);
      }
    }

    const byPlacement: PlacementMetricsSummary[] = ALL_PLACEMENTS.map(
      (placement) => {
        const agg = rowByPlacement.get(placement);
        const impressions = agg?.impressions ?? 0;
        const clicks = agg?.clicks ?? 0;
        const addToCarts = agg?.addToCarts ?? 0;
        const conversions = agg?.conversions ?? 0;
        const revenue = Number((agg?.revenue ?? 0).toFixed(2));
        return {
          placement,
          impressions,
          clicks,
          addToCarts,
          conversions,
          revenue,
          ctr: computeRate(clicks, impressions),
          cvr: computeRate(conversions, clicks),
        };
      },
    );

    const totals = byPlacement.reduce(
      (acc, item) => ({
        impressions: acc.impressions + item.impressions,
        clicks: acc.clicks + item.clicks,
        addToCarts: acc.addToCarts + item.addToCarts,
        conversions: acc.conversions + item.conversions,
        revenue: Number((acc.revenue + item.revenue).toFixed(2)),
      }),
      { impressions: 0, clicks: 0, addToCarts: 0, conversions: 0, revenue: 0 },
    );

    return {
      from: fromDate,
      to: toDate,
      totals: {
        ...totals,
        ctr: computeRate(totals.clicks, totals.impressions),
        cvr: computeRate(totals.conversions, totals.clicks),
      },
      byPlacement,
    };
  }
}
