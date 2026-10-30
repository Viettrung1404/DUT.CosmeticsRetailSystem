import { Module } from '@nestjs/common';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { SupplierAdminController } from './presentation/controllers/supplier-admin.controller';
import { PurchaseOrderAdminController } from './presentation/controllers/purchase-order-admin.controller';
import { ManageSuppliersUseCase } from './application/use-cases/manage-suppliers.use-case';
import { PurchaseOrderWorkflowUseCase } from './application/use-cases/purchase-order-workflow.use-case';
import { SupplierPaymentsUseCase } from './application/use-cases/supplier-payments.use-case';
import { SUPPLIER_REPOSITORY } from './domain/repositories/supplier.repository.interface';
import { PURCHASE_ORDER_REPOSITORY } from './domain/repositories/purchase-order.repository.interface';
import { PrismaSupplierRepository } from './infrastructure/persistence/prisma-supplier.repository';
import { PrismaPurchaseOrderRepository } from './infrastructure/persistence/prisma-purchase-order.repository';

@Module({
  imports: [PermissionsModule],
  controllers: [SupplierAdminController, PurchaseOrderAdminController],
  providers: [
    ManageSuppliersUseCase,
    PurchaseOrderWorkflowUseCase,
    SupplierPaymentsUseCase,
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    { provide: PURCHASE_ORDER_REPOSITORY, useClass: PrismaPurchaseOrderRepository },
  ],
})
export class SuppliersModule {}
