import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ILoyaltySettingsRepository,
  LOYALTY_SETTINGS_REPOSITORY,
  LoyaltyTierPatch,
} from '../../domain/repositories/loyalty-settings.repository.interface';

// 08.04 bước 1: tỷ lệ tích điểm và hạng thành viên; luật dùng điểm vẫn ở loyalty-policy.util.ts (một nguồn)
@Injectable()
export class ManageLoyaltySettingsUseCase {
  constructor(
    @Inject(LOYALTY_SETTINGS_REPOSITORY) private readonly repository: ILoyaltySettingsRepository,
  ) {}

  async get() {
    const [config, tiers] = await Promise.all([this.repository.getConfig(), this.repository.findTiers()]);
    return { config, tiers };
  }

  updatePointRate(actorId: string, pointRate: number) {
    if (!(pointRate > 0) || pointRate > 1) {
      throw new BadRequestException('Tỷ lệ tích điểm phải lớn hơn 0 và không quá 1');
    }
    return this.repository.updateConfig({ point_rate: pointRate }, actorId);
  }

  async updateTier(actorId: string, id: string, patch: LoyaltyTierPatch) {
    const tiers = await this.repository.findTiers();
    const index = tiers.findIndex((t) => t.id === id);
    if (index < 0) throw new NotFoundException('Không tìm thấy hạng thành viên');
    const next = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)).sort((a, b) => a.minPoints - b.minPoints);
    // Ngưỡng hạng và hệ số nhân phải tăng dần theo hạng, hạng thấp nhất bắt đầu từ 0 điểm
    if (next[0].minPoints !== 0) throw new BadRequestException('Hạng thấp nhất phải bắt đầu từ 0 điểm');
    for (let i = 1; i < next.length; i++) {
      if (next[i].minPoints === next[i - 1].minPoints) {
        throw new BadRequestException('Hai hạng không được có cùng ngưỡng điểm');
      }
      if (next[i].pointMultiplier < next[i - 1].pointMultiplier) {
        throw new BadRequestException('Hạng cao hơn phải có hệ số tích điểm không thấp hơn hạng dưới');
      }
    }
    return this.repository.updateTier(id, patch, actorId);
  }
}
