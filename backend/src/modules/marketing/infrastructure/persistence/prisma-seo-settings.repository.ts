import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  ISeoSettingsRepository,
  SeoSettings,
} from '../../domain/repositories/seo-settings.repository.interface';

const KEY = 'seo_config';

@Injectable()
export class PrismaSeoSettingsRepository implements ISeoSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    return (row?.value as Partial<SeoSettings>) ?? {};
  }

  async update(patch: Partial<SeoSettings>, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.setting.findUnique({ where: { key: KEY } });
      const before = (row?.value as Record<string, unknown>) ?? {};
      const after = { ...before, ...patch } as Prisma.InputJsonValue;
      const saved = await tx.setting.upsert({
        where: { key: KEY },
        update: { value: after },
        create: { key: KEY, value: after, group: 'seo' },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'SEO_CONFIG_UPDATE',
          entityType: 'settings',
          entityId: saved.id,
          oldData: before as Prisma.InputJsonValue,
          newData: after,
        },
      });
    });
  }
}
