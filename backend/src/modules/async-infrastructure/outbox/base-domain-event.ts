/**
 * Base Domain Event Interface
 * Tuân thủ tiêu chuẩn CloudEvents spec được quy định tại DES-06 (Section 17).
 */
export interface BaseDomainEvent<T = any> {
  id?: string;
  eventId?: string;
  aggregateType: 'ORDER' | 'FULFILLMENT_ORDER' | 'SHIPMENT' | 'INVENTORY' | string;
  aggregateId: string;
  eventType: string;
  occurredAt?: string | Date;
  payload: T;
}
