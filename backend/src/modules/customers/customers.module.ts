import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { CustomerContextService } from '@core/services/customer-context.service';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer.repository.interface';
import { PrismaCustomerRepository } from './infrastructure/persistence/prisma-customer.repository';
import { GetCustomerProfileUseCase } from './application/use-cases/get-customer-profile.use-case';
import { GetCustomerAddressesUseCase } from './application/use-cases/get-customer-addresses.use-case';
import { CreateCustomerAddressUseCase } from './application/use-cases/create-customer-address.use-case';
import { UpdateCustomerAddressUseCase } from './application/use-cases/update-customer-address.use-case';
import { DeleteCustomerAddressUseCase } from './application/use-cases/delete-customer-address.use-case';
import { SetDefaultAddressUseCase } from './application/use-cases/set-default-address.use-case';
import { CustomerController } from './presentation/controllers/customer.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerController],
  providers: [
    CustomerContextService,
    GetCustomerProfileUseCase,
    GetCustomerAddressesUseCase,
    CreateCustomerAddressUseCase,
    UpdateCustomerAddressUseCase,
    DeleteCustomerAddressUseCase,
    SetDefaultAddressUseCase,
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },
  ],
  exports: [
    CUSTOMER_REPOSITORY,
    CustomerContextService,
    GetCustomerProfileUseCase,
    GetCustomerAddressesUseCase,
    CreateCustomerAddressUseCase,
    UpdateCustomerAddressUseCase,
    DeleteCustomerAddressUseCase,
    SetDefaultAddressUseCase,
  ],
})
export class CustomersModule {}
