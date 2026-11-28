import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { AsyncInfrastructureModule } from '@modules/async-infrastructure';
import { DistanceCalculatorService } from './application/services/distance-calculator.service';
import { ShippingQuoteService } from './application/services/shipping-quote.service';
import { HybridOrderRouter } from './application/routing/hybrid-order-router';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { OrderStateAggregator } from './application/services/order-state-aggregator';
import { ShippingQuoteController } from './presentation/controllers/shipping-quote.controller';

@Module({
  imports: [ConfigModule, InventoryModule, AsyncInfrastructureModule],
  controllers: [ShippingQuoteController],
  providers: [
    DistanceCalculatorService,
    ShippingQuoteService,
    HybridOrderRouter,
    CreateOrderUseCase,
    OrderStateAggregator,
  ],
  exports: [
    DistanceCalculatorService,
    ShippingQuoteService,
    HybridOrderRouter,
    CreateOrderUseCase,
    OrderStateAggregator,
  ],
})
export class OmsModule {}
