import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { CustomerExperienceModule } from '@modules/customer-experience/customer-experience.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { CUSTOMER_SEGMENT_PORT } from './application/ports/customer-segment.port';
import { RfmCustomerSegmentAdapter } from './infrastructure/adapters/rfm-customer-segment.adapter';
import { EmailTrackingService } from './application/services/email-tracking.service';
import { ManageSeoSettingsUseCase } from './application/use-cases/manage-seo-settings.use-case';
import { SEO_SETTINGS_REPOSITORY } from './domain/repositories/seo-settings.repository.interface';
import { PrismaSeoSettingsRepository } from './infrastructure/persistence/prisma-seo-settings.repository';
import { EmailTrackingController } from './presentation/controllers/email-tracking.controller';
import { SeoSettingsController } from './presentation/controllers/seo-settings.controller';
import { PromotionAdminController } from './presentation/controllers/promotion-admin.controller';
import { ContentAdminController } from './presentation/controllers/content-admin.controller';
import { LoyaltySettingsAdminController } from './presentation/controllers/loyalty-settings-admin.controller';
import { CampaignAdminController } from './presentation/controllers/campaign-admin.controller';
import { ManageCampaignsUseCase } from './application/use-cases/manage-campaigns.use-case';
import { CAMPAIGN_REPOSITORY } from './domain/repositories/campaign.repository.interface';
import { PrismaCampaignRepository } from './infrastructure/persistence/prisma-campaign.repository';
import { CampaignSendScheduler } from './infrastructure/schedulers/campaign-send.scheduler';
import { ManagePromotionsUseCase } from './application/use-cases/manage-promotions.use-case';
import { ManageContentUseCase } from './application/use-cases/manage-content.use-case';
import { ManageLoyaltySettingsUseCase } from './application/use-cases/manage-loyalty-settings.use-case';
import { PROMOTION_REPOSITORY } from './domain/repositories/promotion.repository.interface';
import { CONTENT_REPOSITORY } from './domain/repositories/content.repository.interface';
import { LOYALTY_SETTINGS_REPOSITORY } from './domain/repositories/loyalty-settings.repository.interface';
import { PrismaPromotionRepository } from './infrastructure/persistence/prisma-promotion.repository';
import { PrismaContentRepository } from './infrastructure/persistence/prisma-content.repository';
import { PrismaLoyaltySettingsRepository } from './infrastructure/persistence/prisma-loyalty-settings.repository';
import { BlogPublishScheduler } from './infrastructure/schedulers/blog-publish.scheduler';

@Module({
  imports: [PermissionsModule, CustomerExperienceModule, ReportsModule],
  controllers: [
    PromotionAdminController,
    ContentAdminController,
    LoyaltySettingsAdminController,
    CampaignAdminController,
    EmailTrackingController,
    SeoSettingsController,
  ],
  providers: [
    ManagePromotionsUseCase,
    ManageContentUseCase,
    ManageLoyaltySettingsUseCase,
    ManageCampaignsUseCase,
    ManageSeoSettingsUseCase,
    EmailTrackingService,
    BlogPublishScheduler,
    CampaignSendScheduler,
    { provide: CAMPAIGN_REPOSITORY, useClass: PrismaCampaignRepository },
    { provide: SEO_SETTINGS_REPOSITORY, useClass: PrismaSeoSettingsRepository },
    { provide: CUSTOMER_SEGMENT_PORT, useClass: RfmCustomerSegmentAdapter },
    { provide: PROMOTION_REPOSITORY, useClass: PrismaPromotionRepository },
    { provide: CONTENT_REPOSITORY, useClass: PrismaContentRepository },
    { provide: LOYALTY_SETTINGS_REPOSITORY, useClass: PrismaLoyaltySettingsRepository },
  ],
})
export class MarketingModule {}
