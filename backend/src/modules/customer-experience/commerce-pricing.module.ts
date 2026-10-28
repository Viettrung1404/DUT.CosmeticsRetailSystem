import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CommercePricingService } from './application/commerce-pricing.service';

@Module({
  imports: [PrismaModule],
  providers: [CommercePricingService],
  exports: [CommercePricingService],
})
export class CommercePricingModule {}
