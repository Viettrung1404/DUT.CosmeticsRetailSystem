import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma, OutboxEvent } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BaseDomainEvent } from './base-domain-event';
import { IOutboxWriter } from './outbox-writer.interface';
import { getCorrelationId } from '@core/logger/correlation-context';
import { OutboxRelayScheduler } from './outbox-relay.scheduler';

@Injectable()
export class OutboxWriterService implements IOutboxWriter {
  private readonly logger = new Logger(OutboxWriterService.name);

  constructor(
    @Optional()
    private readonly relayScheduler?: OutboxRelayScheduler,
  ) {}

  /**
   * Làm giàu payload sự kiện miền với metadata chứa correlationId phục vụ truy vết phân tán (EP12-T01)
   */
  private enrichPayloadWithMetadata(payload: any): any {
    const correlationId =
      getCorrelationId() ||
      (typeof payload === 'object' && payload !== null ? payload.metadata?.correlationId : undefined) ||
      randomUUID();

    if (typeof payload === 'object' && payload !== null) {
      return {
        ...payload,
        metadata: {
          ...(payload.metadata || {}),
          correlationId,
        },
      };
    }

    return {
      data: payload,
      metadata: {
        correlationId,
      },
    };
  }

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
    const payload = this.enrichPayloadWithMetadata(event.payload);

    const created = await tx.outboxEvent.create({
      data: {
        id,
        aggregateType: event.aggregateType,
        aggregateId: String(event.aggregateId),
        eventType: event.eventType,
        payload: payload as any,
        status: 'PENDING',
        retryCount: 0,
        createdAt,
      },
    });

    this.relayScheduler?.triggerRelayNow();
    return created;
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
      const payload = this.enrichPayloadWithMetadata(event.payload);

      return {
        id,
        aggregateType: event.aggregateType,
        aggregateId: String(event.aggregateId),
        eventType: event.eventType,
        payload: payload as any,
        status: 'PENDING',
        retryCount: 0,
        createdAt,
      };
    });

    await tx.outboxEvent.createMany({
      data,
    });

    this.relayScheduler?.triggerRelayNow();
  }
}

