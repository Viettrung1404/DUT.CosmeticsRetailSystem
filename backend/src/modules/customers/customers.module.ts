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
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { CustomerAdminController } from './presentation/controllers/customer-admin.controller';
import { ADMIN_CUSTOMER_REPOSITORY } from './domain/repositories/admin-customer.repository.interface';
import { PrismaAdminCustomerRepository } from './infrastructure/persistence/prisma-admin-customer.repository';
import { GetAdminCustomersUseCase } from './application/use-cases/get-admin-customers.use-case';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [CustomerController, CustomerAdminController],
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
    {
      provide: ADMIN_CUSTOMER_REPOSITORY,
      useClass: PrismaAdminCustomerRepository,
    },
    GetAdminCustomersUseCase,
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
