export interface NewBatchInfo {
  batchNumber: string;
  expiryDate: Date;
  manufactureDate?: Date | null;
  supplierId?: string | null;
}

export type TakeStockFailure = 'NO_STOCK' | 'RESERVED_CONFLICT' | 'BATCH_NOT_FOUND' | 'BATCH_SHORTAGE';

export type StockFailure = TakeStockFailure | 'BATCH_EXPIRY_MISMATCH' | 'STATUS_CHANGED';
