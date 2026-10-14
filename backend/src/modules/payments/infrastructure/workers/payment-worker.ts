import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PaymentsService } from '../../application/services/payments.service';
@Injectable()
export class PaymentWorker implements OnModuleDestroy {
  private readonly logger = new Logger(PaymentWorker.name);
  private urgent = new Set<Promise<void>>();
  private recovery = new Set<Promise<void>>();
  private polling = false;
  private pollingDone: Promise<void> | undefined;
  private stopped = false;
  private expiryTask: Promise<void> | undefined;
  constructor(
    private readonly db: PrismaService,
    private readonly service: PaymentsService,
  ) {}
  async claim(
    limit: number,
    urgent: boolean,
  ): Promise<Array<{ id: string; claim_token: string }>> {
    if (limit <= 0) return [];
    const token = randomUUID();
    return this.db.$queryRaw`WITH picked AS (
      SELECT p.id FROM payments p WHERE p.merchant_reference IS NOT NULL AND p.next_query_at<=clock_timestamp()
      AND (p.lease_until IS NULL OR p.lease_until<=clock_timestamp())
      AND (${urgent} = (p.verification_pending AND EXISTS (SELECT 1 FROM payment_webhook_inbox i WHERE i.payment_id=p.id AND i.processed_at IS NULL)))
      ORDER BY p.expires_at ASC NULLS LAST, p.next_query_at ASC FOR UPDATE SKIP LOCKED LIMIT ${limit}
    ) UPDATE payments p SET claim_token=${token}::uuid,lease_until=clock_timestamp()+interval '15 seconds'
      FROM picked WHERE picked.id=p.id RETURNING p.id,p.claim_token`;
  }
  async heartbeat(id: string, token: string): Promise<boolean> {
    const count = await this.db
      .$executeRaw`UPDATE payments SET lease_until=clock_timestamp()+interval '15 seconds' WHERE id=${id}::uuid AND claim_token=${token}::uuid AND lease_until>clock_timestamp()`;
    return count === 1;
  }
  @Interval(1000)
  async tick() {
    if (
      this.polling ||
      this.stopped ||
      process.env.PAYMENT_WORKER_ENABLED === 'false'
    )
      return;
    this.polling = true;
    let finishPolling!: () => void;
    this.pollingDone = new Promise<void>((resolve) => {
      finishPolling = resolve;
    });
    try {
      const urgent = await this.claim(Math.max(0, 50 - this.urgent.size), true);
      this.start(urgent, this.urgent);
      const recovery = await this.claim(
        Math.max(0, 3 - this.recovery.size),
        false,
      );
      this.start(recovery, this.recovery);
      if (!this.expiryTask)
        this.expiryTask = this.service
          .expire()
          .then(() => {})
          .catch(() =>
            this.logger.warn('Payment expiry failed; retry on next tick'),
          )
          .finally(() => {
            this.expiryTask = undefined;
          });
    } catch {
      this.logger.warn('Payment poll failed; retry on next tick');
    } finally {
      this.polling = false;
      finishPolling();
      this.pollingDone = undefined;
    }
  }
  private start(
    rows: Array<{ id: string; claim_token: string }>,
    pool: Set<Promise<void>>,
  ) {
    for (const row of rows) {
      let promise: Promise<void>;
      promise = this.run(row).finally(() => pool.delete(promise));
      pool.add(promise);
    }
  }
  private async run(row: { id: string; claim_token: string }) {
    let renewing = false;
    const timer = setInterval(() => {
      if (renewing) return;
      renewing = true;
      void this.heartbeat(row.id, row.claim_token)
        .catch(() => false)
        .finally(() => {
          renewing = false;
        });
    }, 5000);
    timer.unref();
    try {
      await this.service.process(row.id, row.claim_token);
    } catch {
      await this.db
        .$executeRaw`UPDATE payments SET claim_token=NULL,lease_until=NULL,
        next_query_at=CASE WHEN recovery_until<=clock_timestamp() THEN NULL ELSE clock_timestamp()+interval '15 seconds' END,
        status=CASE WHEN recovery_until<=clock_timestamp() AND status<>'COMPLETED' THEN 'NEEDS_REVIEW' ELSE status END
        WHERE id=${row.id}::uuid AND claim_token=${row.claim_token}::uuid AND lease_until>clock_timestamp()`.catch(
        () =>
          this.logger.warn(
            'Payment retry scheduling failed; lease will expire',
          ),
      );
    } finally {
      clearInterval(timer);
    }
  }
  async onModuleDestroy() {
    this.stopped = true;
    // A claim can start processing after its await; drain the poll before taking
    // the active-task snapshot so no late job races the database shutdown.
    await this.pollingDone;
    await Promise.allSettled([
      ...this.urgent,
      ...this.recovery,
      ...(this.expiryTask ? [this.expiryTask] : []),
    ]);
  }
}
