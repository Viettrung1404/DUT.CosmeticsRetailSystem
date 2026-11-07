export const SEO_SETTINGS_REPOSITORY = Symbol('ISeoSettingsRepository');

export interface SeoSettings {
  siteName: string;
  siteDescription: string;
  defaultOgImage: string | null;
  defaultKeywords: string | null;
}

export interface ISeoSettingsRepository {
  get(): Promise<Partial<SeoSettings>>;
  update(patch: Partial<SeoSettings>, actorId: string): Promise<void>;
}
