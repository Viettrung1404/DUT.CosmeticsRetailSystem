import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PosCustomerInfo } from '../../domain/entities/pos-lookup.entity';
import { IPosCustomerRepository } from '../../domain/repositories/pos-customer.repository.interface';

const customerInclude = {
  loyaltyTier: { select: { name: true, discountPercentage: true, pointMultiplier: true } },
} satisfies Prisma.CustomerInclude;

type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

const toInfo = (row: CustomerRow): PosCustomerInfo => ({
  id: row.id,
  fullName: row.fullName,
  phone: row.phone,
  hasAccount: row.userId !== null,
  totalPoints: row.totalPoints,
  tier: row.loyaltyTier
    ? {
        name: row.loyaltyTier.name,
        discountPercentage: Number(row.loyaltyTier.discountPercentage),
        pointMultiplier: Number(row.loyaltyTier.pointMultiplier),
      }
    : null,
});

@Injectable()
export class PrismaPosCustomerRepository implements IPosCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<PosCustomerInfo | null> {
    const row = await this.prisma.customer.findUnique({
      where: { phone },
      include: customerInclude,
    });
    return row ? toInfo(row) : null;
  }

  async create(data: { phone: string; fullName: string }): Promise<PosCustomerInfo | null> {
    // Khách mới vào hạng thấp nhất
    const lowestTier = await this.prisma.loyaltyTier.findFirst({
      orderBy: { minPoints: 'asc' },
      select: { id: true },
    });
    try {
      const row = await this.prisma.customer.create({
        data: { phone: data.phone, fullName: data.fullName, loyaltyTierId: lowestTier?.id ?? null },
        include: customerInclude,
      });
      return toInfo(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  }
}
