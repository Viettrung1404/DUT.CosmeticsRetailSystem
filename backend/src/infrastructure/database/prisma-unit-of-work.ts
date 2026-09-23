import { Injectable } from '@nestjs/common';
import { IUnitOfWork } from '@core/database/unit-of-work.interface';
import { PrismaService } from './prisma.service';

/**
 * Implementation of Unit of Work using PrismaService and AsyncLocalStorage.
 */
@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.runInTransaction(work);
  }
}
