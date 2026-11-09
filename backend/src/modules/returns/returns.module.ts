import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { CustomerCommerceModule } from '@modules/customer-commerce/customer-commerce.module';
import { RETURN_ADMIN_REPOSITORY } from './domain/repositories/return-admin.repository.interface';
import { PrismaReturnAdminRepository } from './infrastructure/persistence/prisma-return-admin.repository';
import { ReturnAccessService } from './application/services/return-access.service';
import { ListAdminReturnsUseCase } from './application/use-cases/list-admin-returns.use-case';
import { GetAdminReturnDetailUseCase } from './application/use-cases/get-admin-return-detail.use-case';
import { ApproveAdminReturnUseCase } from './application/use-cases/approve-admin-return.use-case';
import { RejectAdminReturnUseCase } from './application/use-cases/reject-admin-return.use-case';
import { ReceiveAdminReturnUseCase } from './application/use-cases/receive-admin-return.use-case';
import { InspectAdminReturnUseCase } from './application/use-cases/inspect-admin-return.use-case';
import { CompleteAdminReturnUseCase } from './application/use-cases/complete-admin-return.use-case';
import { ReturnAdminController } from './presentation/controllers/return-admin.controller';

@Module({
  imports: [PrismaModule, PermissionsModule, CustomerCommerceModule],
  controllers: [ReturnAdminController],
  providers: [
    { provide: RETURN_ADMIN_REPOSITORY, useClass: PrismaReturnAdminRepository },
    ReturnAccessService,
    ListAdminReturnsUseCase,
    GetAdminReturnDetailUseCase,
    ApproveAdminReturnUseCase,
    RejectAdminReturnUseCase,
    ReceiveAdminReturnUseCase,
    InspectAdminReturnUseCase,
    CompleteAdminReturnUseCase,
  ],
})
export class ReturnsModule {}
