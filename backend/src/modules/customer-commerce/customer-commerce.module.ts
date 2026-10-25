import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CustomerCommands } from './infrastructure/commands';
import { CustomerOnlyGuard } from './presentation/customer-only.guard';
import { CommerceController } from './presentation/commerce.controller';
import { LoyaltyService } from './application/loyalty.service';
import { ReturnsService } from './application/returns.service';
import { WishlistService } from './application/wishlist.service';
import { TrackingService } from './application/tracking.service';
import { NotificationsService } from './application/notifications.service';
import { NotificationWorker } from './infrastructure/notification.worker';
import { ReturnImageStorage } from './infrastructure/return-image.storage';
import { WishlistEnrichmentInterceptor } from './presentation/wishlist-enrichment.interceptor';
import { CustomerEventIntegration } from './application/admin-integration.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommerceController],
  providers: [
    CustomerCommands,
    CustomerOnlyGuard,
    LoyaltyService,
    ReturnsService,
    WishlistService,
    TrackingService,
    NotificationsService,
    NotificationWorker,
    ReturnImageStorage,
    WishlistEnrichmentInterceptor,
    CustomerEventIntegration,
  ],
  exports: [
    CustomerCommands,
    ReturnsService,
    WishlistEnrichmentInterceptor,
    CustomerEventIntegration,
  ],
})
export class CustomerCommerceModule {}
