import { Prisma } from '@prisma/client';
import { PosSessionEntity, PosSessionStatus } from '../../domain/entities/pos-session.entity';

export const POS_SESSION_INCLUDE = {
  store: { select: { code: true, name: true } },
  cashier: { select: { fullName: true } },
  approver: { select: { fullName: true } },
} satisfies Prisma.PosSessionInclude;

type PosSessionWithRelations = Prisma.PosSessionGetPayload<{ include: typeof POS_SESSION_INCLUDE }>;

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

export class PosSessionMapper {
  static toDomain(raw: PosSessionWithRelations): PosSessionEntity {
    return new PosSessionEntity({
      id: raw.id,
      sessionCode: raw.sessionCode,
      storeId: raw.storeId,
      storeCode: raw.store.code,
      storeName: raw.store.name,
      cashierId: raw.cashierId,
      cashierName: raw.cashier.fullName,
      openedAt: raw.openedAt,
      closedAt: raw.closedAt,
      openingCash: Number(raw.openingCash),
      systemCash: Number(raw.systemCash),
      countedCash: toNumber(raw.countedCash),
      difference: toNumber(raw.difference),
      status: raw.status as PosSessionStatus,
      note: raw.note,
      approvedBy: raw.approvedBy,
      approverName: raw.approver?.fullName ?? null,
    });
  }
}
