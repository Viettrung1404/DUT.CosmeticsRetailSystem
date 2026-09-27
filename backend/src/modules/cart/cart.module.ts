import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CustomerContextService } from '@core/services/customer-context.service';
import { CART_REPOSITORY } from './domain/repositories/cart.repository.interface';
import { PrismaCartRepository } from './infrastructure/persistence/prisma-cart.repository';
import { AddToCartUseCase } from './application/use-cases/add-to-cart.use-case';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { UpdateCartItemUseCase } from './application/use-cases/update-cart-item.use-case';
import { RemoveCartItemUseCase } from './application/use-cases/remove-cart-item.use-case';
import { MergeCartUseCase } from './application/use-cases/merge-cart.use-case';
import { CartController } from './presentation/controllers/cart.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [
    CustomerContextService,
    AddToCartUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    MergeCartUseCase,
    {
      provide: CART_REPOSITORY,
      useClass: PrismaCartRepository,
    },
  ],
  exports: [
    CART_REPOSITORY,
    AddToCartUseCase,
    GetCartUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    MergeCartUseCase,
  ],
})
export class CartModule {}
