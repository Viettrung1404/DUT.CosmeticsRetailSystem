import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OUTBOX_MAILER,
  OutboxMailer,
} from '../../application/ports/outbox-mailer.port';

@Injectable()
export class EmailOutboxWorker implements OnModuleDestroy {
  private readonly active = new Set<Promise<void>>();
  private stopped = false;
  private readonly logger = new Logger(EmailOutboxWorker.name);

  constructor(
    private readonly db: PrismaService,
    @Inject(OUTBOX_MAILER) private readonly mailer: OutboxMailer,
  ) {}

  @Interval(1000)
  async tick() {
    if (this.stopped || process.env.EMAIL_OUTBOX_ENABLED === 'false') return;
    const free = 2 - this.active.size;
    for (let index = 0; index < free; index++) {
      let task: Promise<void>;
      task = this.deliverOne()
        .catch(() => this.logger.warn('Email poll failed'))
        .finally(() => {
          this.active.delete(task);
        });
      this.active.add(task);
    }
  }

  async deliverOne(): Promise<void> {
    const token = randomUUID();
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        recipient: string;
        subject: string;
        text: string;
        attempts: number;
      }>
    >`WITH picked AS (
      SELECT id FROM email_outbox WHERE status='PENDING' AND next_attempt_at<=clock_timestamp()
      AND (lease_until IS NULL OR lease_until<=clock_timestamp()) ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE email_outbox e SET claim_token=${token}::uuid,lease_until=clock_timestamp()+interval '30 seconds',attempts=e.attempts+1
      FROM picked WHERE picked.id=e.id RETURNING e.id,e.recipient,e.subject,e.text,e.attempts`;
    const row = rows[0];
    if (!row) return;
    try {
      await this.mailer.send(
        row.recipient,
        row.subject,
        row.text,
        `<${row.id}@glowup.local>`,
      );
      await this.db
        .$executeRaw`UPDATE email_outbox SET status='SENT',sent_at=clock_timestamp(),claim_token=NULL,lease_until=NULL,last_error=NULL WHERE id=${row.id}::uuid AND claim_token=${token}::uuid AND lease_until>clock_timestamp()`;
    } catch {
      const delay = Math.min(
        3600,
        Math.pow(2, Math.min(row.attempts, 10)) * 15,
      );
      await this.db
        .$executeRaw`UPDATE email_outbox SET claim_token=NULL,lease_until=NULL,last_error='SMTP_DELIVERY_FAILED',next_attempt_at=clock_timestamp()+(${delay}*interval '1 second') WHERE id=${row.id}::uuid AND claim_token=${token}::uuid AND lease_until>clock_timestamp()`;
    }
  }

  async onModuleDestroy() {
    this.stopped = true;
    await Promise.allSettled([...this.active]);
  }
}
