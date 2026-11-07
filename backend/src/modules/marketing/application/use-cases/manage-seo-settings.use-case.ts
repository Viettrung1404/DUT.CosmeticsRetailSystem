import { Inject, Injectable } from '@nestjs/common';
import {
  ISeoSettingsRepository,
  SEO_SETTINGS_REPOSITORY,
  SeoSettings,
} from '../../domain/repositories/seo-settings.repository.interface';

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteName: 'GlowUp Cosmetics',
  siteDescription: 'Mỹ phẩm chính hãng tại GlowUp: chăm sóc da, trang điểm, nước hoa và ưu đãi mỗi tuần.',
  defaultOgImage: null,
  defaultKeywords: null,
};

@Injectable()
export class ManageSeoSettingsUseCase {
  constructor(@Inject(SEO_SETTINGS_REPOSITORY) private readonly repository: ISeoSettingsRepository) {}

  async get(): Promise<SeoSettings> {
    return { ...DEFAULT_SEO_SETTINGS, ...(await this.repository.get()) };
  }

  async update(userId: string, patch: Partial<SeoSettings>): Promise<SeoSettings> {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    await this.repository.update(defined, userId);
    return this.get();
  }
}
