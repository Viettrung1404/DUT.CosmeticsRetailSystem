import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  CreatePosSessionData,
  IPosSessionRepository,
  PosSessionListFilter,
  PosSessionListOptions,
  PosStoreInfo,
} from '../../domain/repositories/pos-session.repository.interface';
import { PosSessionEntity } from '../../domain/entities/pos-session.entity';
import { POS_SESSION_INCLUDE, PosSessionMapper } from '../mappers/pos-session.mapper';

@Injectable()
export class PrismaPosSessionRepository implements IPosSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStore(storeId: string): Promise<PosStoreInfo | null> {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, code: true, type: true, isActive: true },
    });
  }

  async findById(id: string): Promise<PosSessionEntity | null> {
    const raw = await this.prisma.posSession.findUnique({
      where: { id },
      include: POS_SESSION_INCLUDE,
    });
    return raw ? PosSessionMapper.toDomain(raw) : null;
  }

  async findOpenByStore(storeId: string): Promise<PosSessionEntity | null> {
    const raw = await this.prisma.posSession.findFirst({
      where: { storeId, status: 'OPEN' },
      include: POS_SESSION_INCLUDE,
    });
    return raw ? PosSessionMapper.toDomain(raw) : null;
  }

  async findOpenByCashier(cashierId: string): Promise<PosSessionEntity | null> {
    const raw = await this.prisma.posSession.findFirst({
      where: { cashierId, status: 'OPEN' },
      include: POS_SESSION_INCLUDE,
    });
    return raw ? PosSessionMapper.toDomain(raw) : null;
  }

  countOpenedBetween(storeId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.posSession.count({
      where: { storeId, openedAt: { gte: from, lt: to } },
    });
  }

  async create(data: CreatePosSessionData): Promise<PosSessionEntity | null> {
    try {
      const raw = await this.prisma.posSession.create({
        data: { ...data, status: 'OPEN' },
        include: POS_SESSION_INCLUDE,
      });
      return PosSessionMapper.toDomain(raw);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  async sumCompletedCash(sessionId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { posSessionId: sessionId, paymentMethod: 'CASH', status: 'COMPLETED' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async saveClosed(session: PosSessionEntity): Promise<boolean> {
    const { count } = await this.prisma.posSession.updateMany({
      where: { id: session.id, status: 'OPEN' },
      data: {
        status: session.status,
        closedAt: session.closedAt,
        systemCash: session.systemCash,
        countedCash: session.countedCash,
        difference: session.difference,
        note: session.note,
      },
    });
    return count > 0;
  }

  saveReconciled(session: PosSessionEntity, reconciledAt: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.posSession.updateMany({
        where: { id: session.id, status: 'CLOSED' },
        data: { status: session.status, approvedBy: session.approvedBy, note: session.note },
      });
      if (count === 0) {
        return false;
      }
      await tx.payment.updateMany({
        where: { posSessionId: session.id, reconciledAt: null },
        data: { reconciledAt },
      });
      return true;
    });
  }

  async findMany(
    filter: PosSessionListFilter,
    options: PosSessionListOptions,
  ): Promise<{ items: PosSessionEntity[]; total: number }> {
    const where: Prisma.PosSessionWhereInput = {
      storeId: filter.storeIds ? { in: filter.storeIds } : undefined,
      cashierId: filter.cashierId,
      status: filter.status,
      openedAt:
        filter.fromDate || filter.toDate ? { gte: filter.fromDate, lt: filter.toDate } : undefined,
    };

    const [rows, total] = await Promise.all([
      this.prisma.posSession.findMany({
        where,
        include: POS_SESSION_INCLUDE,
        orderBy: { openedAt: options.order },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.posSession.count({ where }),
    ]);
    return { items: rows.map((raw) => PosSessionMapper.toDomain(raw)), total };
  }
}
