import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaUnitOfWork } from './prisma-unit-of-work';
import { UNIT_OF_WORK } from '@core/database/unit-of-work.interface';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: UNIT_OF_WORK,
      useClass: PrismaUnitOfWork,
    },
  ],
  exports: [PrismaService, UNIT_OF_WORK],
})
export class PrismaModule {}
