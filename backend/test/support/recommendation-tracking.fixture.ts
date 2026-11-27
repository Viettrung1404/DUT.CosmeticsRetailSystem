import { randomUUID } from 'crypto';
import { RecommendationRepository } from '@modules/recommendations/infrastructure/recommendation.repository';

/** In-memory transaction boundary for fault injection; no external DB is touched. */
export function createTrackingFixture() {
  const state = {
    events: new Map<string, any>(),
    receipts: new Set<string>(),
    metrics: new Map<string, any>(),
  };
  let failNextMetricWrite = false;
  const prisma = {
    $transaction: jest.fn(async (work: (tx: any) => Promise<any>) => {
      const events = new Map(state.events);
      const receipts = new Set(state.receipts);
      const metrics = new Map(
        [...state.metrics].map(([key, value]) => [key, { ...value }]),
      );
      const result = await work({
        userBehaviorEvent: {
          createManyAndReturn: async ({ data }: any) => {
            const inserted: any[] = [];
            for (const row of data) {
              const id = row.id ?? randomUUID();
              if (events.has(id)) continue;
              events.set(id, row);
              inserted.push(row);
            }
            return inserted;
          },
        },
        $queryRaw: async (_sql: unknown, key: string) => {
          if (receipts.has(key)) return [];
          receipts.add(key);
          return [{ batch_id: key }];
        },
        $executeRaw: async (
          _sql: unknown,
          _id: string,
          placement: string,
          impressions: number,
          clicks: number,
          addToCarts: number,
          conversions: number,
          revenue: number,
        ) => {
          if (failNextMetricWrite) {
            failNextMetricWrite = false;
            throw new Error('METRIC_WRITE_FAILED');
          }
          const current = metrics.get(placement) ?? {
            placement,
            impressions: 0,
            clicks: 0,
            addToCarts: 0,
            conversions: 0,
            revenue: 0,
          };
          for (const [key, value] of Object.entries({
            impressions,
            clicks,
            addToCarts,
            conversions,
            revenue,
          })) {
            current[key] += value;
          }
          metrics.set(placement, current);
          return 1;
        },
      });
      state.events = events;
      state.receipts = receipts;
      state.metrics = metrics;
      return result;
    }),
  };
  return {
    state,
    prisma,
    repository: new RecommendationRepository(prisma as any),
    failNextMetricWrite: () => {
      failNextMetricWrite = true;
    },
  };
}
