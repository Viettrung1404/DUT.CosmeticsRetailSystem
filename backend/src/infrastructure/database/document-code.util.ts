import { Prisma } from '@prisma/client';
import { startOfVnToday } from '@core/utils/expiry-policy.util';

const CODE_SOURCES = {
  PO: { table: 'purchase_orders', column: 'po_number' },
  GRN: { table: 'goods_receipts', column: 'receipt_code' },
  TRF: { table: 'inventory_transfers', column: 'transfer_code' },
  STK: { table: 'stocktakes', column: 'stocktake_code' },
  ADJ: { table: 'inventory_adjustments', column: 'adjustment_code' },
} as const;

export type DocumentKind = keyof typeof CODE_SOURCES;

// <tiền tố><yyyyMMdd giờ VN><4 số> như số đơn ORD; khóa theo tiền tố để hai người tạo cùng lúc không trùng số
export const nextDocumentCode = async (
  tx: Prisma.TransactionClient,
  kind: DocumentKind,
): Promise<string> => {
  const prefix = `${kind}${startOfVnToday().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const { table, column } = CODE_SOURCES[kind];
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;
  const rows = await tx.$queryRawUnsafe<{ code: string | null }[]>(
    `SELECT max(${column}) AS code FROM ${table} WHERE ${column} ~ $1`,
    `^${prefix}[0-9]{4}$`,
  );
  const last = rows[0]?.code ? Number(rows[0].code.slice(prefix.length)) : 0;
  return `${prefix}${String(last + 1).padStart(4, '0')}`;
};
