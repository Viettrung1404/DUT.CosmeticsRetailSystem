import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CacheModule } from '@core/cache/cache.module';
import { CustomerCommerceModule } from '@modules/customer-commerce/customer-commerce.module';
import { ReviewsService } from './application/reviews.service';
import { ContentService } from './application/content.service';
import { CommercePricingService } from './application/commerce-pricing.service';
import { BroadcastService } from './application/broadcast.service';
import { ExperienceController } from './presentation/experience.controller';
import { BrandController } from './presentation/brand.controller';
import { StoreController } from './presentation/store.controller';
import {
  PromotionController,
  PromotionsService,
} from './presentation/promotion.controller';
import { CommercePricingModule } from './commerce-pricing.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    CustomerCommerceModule,
    CommercePricingModule,
  ],
  controllers: [
    ExperienceController,
    PromotionController,
    BrandController,
    StoreController,
  ],
  providers: [
    ReviewsService,
    ContentService,
    BroadcastService,
    PromotionsService,
  ],
  exports: [
    ReviewsService,
    ContentService,
    CommercePricingModule,
    BroadcastService,
  ],
})
export class CustomerExperienceModule {}
