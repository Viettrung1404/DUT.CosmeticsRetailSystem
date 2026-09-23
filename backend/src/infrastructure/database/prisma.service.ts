import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

export interface TransactionStore {
  tx: PrismaTransactionClient;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly als = new AsyncLocalStorage<TransactionStore>();

  constructor() {
    super({
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
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs a callback within an active Prisma transaction.
   * Reuses existing transaction if already inside one (nested support).
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const store = this.als.getStore();
    if (store?.tx) {
      return work();
    }

    return super.$transaction(async (tx) => {
      return this.als.run({ tx: tx as PrismaTransactionClient }, () => work());
    });
  }
}
