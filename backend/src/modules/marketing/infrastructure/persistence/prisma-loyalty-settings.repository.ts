import { Injectable } from '@nestjs/common';
import { LoyaltyTier, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ILoyaltySettingsRepository,
  LoyaltyTierPatch,
  LoyaltyTierView,
} from '../../domain/repositories/loyalty-settings.repository.interface';

const KEY = 'loyalty_config';

const toTier = (t: LoyaltyTier): LoyaltyTierView => ({
  id: t.id,
  name: t.name,
  minPoints: t.minPoints,
  discountPercentage: Number(t.discountPercentage),
  pointMultiplier: Number(t.pointMultiplier),
  benefits: t.benefits,
});

@Injectable()
export class PrismaLoyaltySettingsRepository implements ILoyaltySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    return (row?.value as Record<string, unknown>) ?? {};
  }

  async findTiers() {
    return (await this.prisma.loyaltyTier.findMany({ orderBy: { minPoints: 'asc' } })).map(toTier);
  }

  updateConfig(patch: Record<string, unknown>, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: KEY } });
      const before = (row?.value as Record<string, unknown>) ?? {};
      const after = { ...before, ...patch };
      const saved = await tx.setting.upsert({
        where: { key: KEY },
        update: { value: after as Prisma.InputJsonValue },
        create: { key: KEY, value: after as Prisma.InputJsonValue, group: 'loyalty' },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'LOYALTY_CONFIG_UPDATE',
          entityType: 'settings',
          entityId: saved.id,
          oldData: before as Prisma.InputJsonValue,
          newData: after as Prisma.InputJsonValue,
        },
      });
      return after;
    });
  }

  updateTier(id: string, patch: LoyaltyTierPatch, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.loyaltyTier.findUniqueOrThrow({ where: { id } });
      const updated = await tx.loyaltyTier.update({
        where: { id },
        data: {
          ...patch,
          benefits: patch.benefits === undefined ? undefined : (patch.benefits as Prisma.InputJsonValue),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'LOYALTY_TIER_UPDATE',
          entityType: 'loyalty_tiers',
          entityId: id,
          oldData: toTier(before) as unknown as Prisma.InputJsonValue,
          newData: toTier(updated) as unknown as Prisma.InputJsonValue,
        },
      });
      return toTier(updated);
    });
  }
}
