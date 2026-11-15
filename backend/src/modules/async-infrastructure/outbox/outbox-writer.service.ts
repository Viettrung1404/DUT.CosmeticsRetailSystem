import { Injectable, Logger } from '@nestjs/common';
import { Prisma, OutboxEvent } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BaseDomainEvent } from './base-domain-event';
import { IOutboxWriter } from './outbox-writer.interface';

@Injectable()
export class OutboxWriterService implements IOutboxWriter {
  private readonly logger = new Logger(OutboxWriterService.name);

  /**
   * Ghi nhận một sự kiện miền vào bảng outbox_events bên trong một Transaction Client.
   * Nếu transaction cha bị rollback, bản ghi outbox sẽ được rollback hoàn toàn (ACID).
   */
  async record(
    tx: Prisma.TransactionClient,
    event: BaseDomainEvent<any>,
  ): Promise<OutboxEvent> {
    const id = event.id || event.eventId || randomUUID();
    const createdAt = event.occurredAt
      ? new Date(event.occurredAt)
      : new Date();

    return tx.outboxEvent.create({
      data: {
        id,
        aggregateType: event.aggregateType,
        aggregateId: String(event.aggregateId),
        eventType: event.eventType,
        payload: event.payload as any,
        status: 'PENDING',
        retryCount: 0,
        createdAt,
      },
    });
  }

  /**
   * Ghi nhận hàng loạt sự kiện miền vào bảng outbox_events bên trong một Transaction Client.
   * Nếu transaction cha bị rollback, toàn bộ bản ghi outbox sẽ được rollback hoàn toàn (ACID).
   */
  async recordMany(
    tx: Prisma.TransactionClient,
    events: BaseDomainEvent<any>[],
  ): Promise<void> {
    if (!events || events.length === 0) {
      return;
    }

    const data = events.map((event) => {
      const id = event.id || event.eventId || randomUUID();
      const createdAt = event.occurredAt
        ? new Date(event.occurredAt)
        : new Date();

      return {
        id,
        aggregateType: event.aggregateType,
        aggregateId: String(event.aggregateId),
        eventType: event.eventType,
        payload: event.payload as any,
        status: 'PENDING',
        retryCount: 0,
        createdAt,
      };
    });

    await tx.outboxEvent.createMany({
      data,
    });
  }
}
