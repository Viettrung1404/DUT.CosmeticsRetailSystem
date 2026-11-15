import { Prisma, OutboxEvent } from '@prisma/client';
import { BaseDomainEvent } from './base-domain-event';

export const OUTBOX_WRITER = Symbol('IOutboxWriter');

export interface IOutboxWriter {
  record(tx: Prisma.TransactionClient, event: BaseDomainEvent<any>): Promise<OutboxEvent>;
  recordMany(tx: Prisma.TransactionClient, events: BaseDomainEvent<any>[]): Promise<void>;
}
