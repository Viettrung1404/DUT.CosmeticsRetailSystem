export const CUSTOMER_SEGMENT_PORT = Symbol('CUSTOMER_SEGMENT_PORT');

export interface ICustomerSegmentPort {
  customerIdsBySegments(segments: string[]): Promise<string[]>;
}
