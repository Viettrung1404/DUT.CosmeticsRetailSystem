import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { OmsModule } from '@modules/oms/oms.module';
import {
  IShippingProvider,
  SHIPPING_PROVIDER,
  SHIPPING_PROVIDERS,
} from './domain/ports/shipping-provider.interface';
import { MockShippingProvider } from './infrastructure/adapters/mock/mock-shipping.provider';
import { GHNClient } from './infrastructure/adapters/ghn/ghn-client';
import { GHNProvider } from './infrastructure/adapters/ghn/ghn.provider';
import { AhamoveClient } from './infrastructure/adapters/ahamove/ahamove-client';
import { AhamoveProvider } from './infrastructure/adapters/ahamove/ahamove-provider';
import { AhamoveRedispatchService } from './application/services/ahamove-redispatch.service';
import { ShipmentOrchestratorService } from './application/services/shipment-orchestrator.service';
import { ShipmentAttemptService } from './application/services/shipment-attempt.service';
import { ReturnToOriginService } from './application/services/return-to-origin.service';
import { LogisticsDashboardService } from './application/services/logistics-dashboard.service';
import { TestMockCarrierController } from './presentation/controllers/test-mock-carrier.controller';
import { AdminShippingController } from './presentation/controllers/admin-shipping.controller';
import { AdminLogisticsDashboardController } from './presentation/controllers/admin-logistics-dashboard.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AsyncInfrastructureModule,
    forwardRef(() => OmsModule),
  ],
  controllers: [
    TestMockCarrierController,
    AdminShippingController,
    AdminLogisticsDashboardController,
  ],
  providers: [
    GHNClient,
    GHNProvider,
    AhamoveClient,
    AhamoveProvider,
    AhamoveRedispatchService,
    MockShippingProvider,
    {
      provide: SHIPPING_PROVIDERS,
      useFactory: (
        config: ConfigService,
        ghn: GHNProvider,
        ahamove: AhamoveProvider,
        mock: MockShippingProvider,
      ) => {
        const mockEnabled = config.get<string>('SHIPPING_MOCK_ENABLED');
        const isMock =
          mockEnabled === 'true' ||
          mockEnabled === '1' ||
          process.env.SHIPPING_MOCK_ENABLED === 'true';

        const map = new Map<string, IShippingProvider>();
        map.set('GHN', isMock ? mock : ghn);
        map.set('AHAMOVE', isMock ? mock : ahamove);
        map.set('MOCK', mock);
        return map;
      },
      inject: [ConfigService, GHNProvider, AhamoveProvider, MockShippingProvider],
    },
    {
      provide: SHIPPING_PROVIDER,
      useFactory: (
        config: ConfigService,
        ghnProvider: GHNProvider,
        mockProvider: MockShippingProvider,
      ) => {
        const mockEnabled = config.get<string>('SHIPPING_MOCK_ENABLED');
        const isMock =
          mockEnabled === 'true' ||
          mockEnabled === '1' ||
          process.env.SHIPPING_MOCK_ENABLED === 'true';

        if (isMock) {
          return mockProvider;
        }
        return ghnProvider;
      },
      inject: [ConfigService, GHNProvider, MockShippingProvider],
    },
    ShipmentOrchestratorService,
    ShipmentAttemptService,
    ReturnToOriginService,
    LogisticsDashboardService,
  ],
  exports: [
    SHIPPING_PROVIDER,
    SHIPPING_PROVIDERS,
    GHNClient,
    GHNProvider,
    AhamoveClient,
    AhamoveProvider,
    AhamoveRedispatchService,
    MockShippingProvider,
    ShipmentOrchestratorService,
    ShipmentAttemptService,
    ReturnToOriginService,
    LogisticsDashboardService,
  ],
})
export class ShippingModule {}

