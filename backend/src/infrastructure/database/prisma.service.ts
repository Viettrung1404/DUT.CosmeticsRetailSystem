import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

export interface TransactionStore {
  tx: PrismaTransactionClient;
}
function databaseUrl(): string | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  const url = new URL(process.env.DATABASE_URL);
  const configured = Number(url.searchParams.get('connection_limit') || 20);
  if (!Number.isInteger(configured) || configured < 1)
    throw new Error('connection_limit must be a positive integer');
  url.searchParams.set('connection_limit', String(Math.min(20, configured)));
  return url.toString();
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly als = new AsyncLocalStorage<TransactionStore>();

  constructor() {
    super({
      datasourceUrl: databaseUrl(),
      log:
        process.env.PRISMA_LOG_QUERIES === 'true'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
    });

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const store = target.als.getStore();
        if (store?.tx && prop in store.tx) {
          const val = (store.tx as any)[prop];
          return typeof val === 'function' ? val.bind(store.tx) : val;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    const limit = Math.min(
      20,
      Number(
        new URL(process.env.DATABASE_URL!).searchParams.get(
          'connection_limit',
        ) || 20,
      ),
    );
    await Promise.all(
      Array.from(
        { length: limit },
        () => this.$queryRaw`SELECT pg_sleep(0.01)::text`,
      ),
    );
  }

  // Nest awaits every worker's onModuleDestroy before this final shutdown phase.
  async onApplicationShutdown() {
    await this.$disconnect();
  }

  /**
   * Runs a callback within an active Prisma transaction.
   * Reuses existing transaction if already inside one (nested support).
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.transaction(() => work());
  }

  /** Repositories must use this entry point to share a transaction connection. */
  async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    const store = this.als.getStore();
    if (store?.tx) {
      return work(store.tx);
    }

    return super.$transaction(async (tx) => {
      return this.als.run({ tx: tx as PrismaTransactionClient }, () =>
        work(tx),
      );
    }, options);
  }
}
