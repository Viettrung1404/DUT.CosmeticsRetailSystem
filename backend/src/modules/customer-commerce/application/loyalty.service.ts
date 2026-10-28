import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { notifyUser } from '@core/services/customer-events';
import {
  CustomerCommands,
  json,
  lockCustomer,
  Tx,
} from '../infrastructure/commands';
import { configuration, RewardPolicy, validReward } from '../domain/policy';

export async function evaluateTier(tx: Tx, customerId: string) {
  const customer = await tx.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { totalPoints: true },
  });
  const tier = await tx.loyaltyTier.findFirst({
    where: { minPoints: { lte: customer.totalPoints } },
    orderBy: [{ minPoints: 'desc' }, { id: 'asc' }],
  });
  await tx.customer.update({
    where: { id: customerId },
    data: { loyaltyTierId: tier?.id ?? null },
  });
  return tier;
}
@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commands: CustomerCommands,
  ) {}
  async get(customerId: string, page: number, limit: number) {
    const [customer, history, total] = await Promise.all([
      this.prisma.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: {
          totalPoints: true,
          loyaltyTier: true,
        },
      }),
      this.prisma.loyaltyPointsTransaction.findMany({
        where: { customerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          orderId: true,
          points: true,
          type: true,
          description: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.loyaltyPointsTransaction.count({ where: { customerId } }),
    ]);
    const nextTier = await this.prisma.loyaltyTier.findFirst({
      where: { minPoints: { gt: customer.totalPoints } },
      orderBy: [{ minPoints: 'asc' }, { id: 'asc' }],
    });
    return {
      balance: customer.totalPoints,
      tier: customer.loyaltyTier,
      nextTier,
      history,
      page,
      limit,
      total,
    };
  }
  async rewards(tx: Tx | PrismaService = this.prisma): Promise<RewardPolicy[]> {
    const row = await tx.setting.findUnique({
      where: { key: 'loyalty_rewards' },
    });
    const policy = configuration<{ rewards: RewardPolicy[] }>(
      row?.value,
      (v) =>
        Array.isArray(v.rewards) &&
        v.rewards.every(validReward) &&
        new Set(v.rewards.map((r: RewardPolicy) => r.code)).size ===
          v.rewards.length,
      'loyalty_rewards',
    );
    return policy.rewards;
  }
  redeem(userId: string, key: string, rewardCode: string) {
    return this.commands.execute(
      userId,
      'LOYALTY_REDEEM',
      key,
      { rewardCode },
      async (tx, customerId) => {
        await lockCustomer(tx, customerId);
        const reward = (await this.rewards(tx)).find(
          (r) => r.code === rewardCode,
        );
        if (!reward) throw new NotFoundException('REWARD_NOT_FOUND');
        const customer = await tx.customer.findUniqueOrThrow({
          where: { id: customerId },
        });
        if (customer.totalPoints < reward.pointsCost)
          throw new ConflictException('INSUFFICIENT_POINTS');
        const now = new Date();
        const coupon = await tx.coupon.create({
          data: {
            customerId,
            code: `LP-${randomUUID().replace(/-/g, '').toUpperCase()}`,
            discountType: reward.discountType,
            discountValue: reward.discountValue,
            minOrderAmount: reward.minOrderAmount,
            maxUses: 1,
            maxUsesPerCustomer: 1,
            startDate: now,
            endDate: new Date(now.getTime() + reward.validityDays * 86400000),
          },
        });
        const redemption = await tx.loyaltyRedemption.create({
          data: {
            customerId,
            couponId: coupon.id,
            rewardCode,
            rewardSnapshot: json(reward),
            pointsCost: reward.pointsCost,
          },
        });
        await tx.customer.update({
          where: { id: customerId },
          data: { totalPoints: { decrement: reward.pointsCost } },
        });
        await tx.loyaltyPointsTransaction.create({
          data: {
            customerId,
            points: -reward.pointsCost,
            type: 'REDEEM',
            eventKey: `REDEMPTION:${redemption.id}`,
            description: `Đổi thưởng ${rewardCode}`,
          },
        });
        await evaluateTier(tx, customerId);
        await notifyUser(
          tx,
          userId,
          `REDEMPTION:${redemption.id}`,
          'Đổi điểm lấy voucher thành công',
          'LOYALTY',
          { redemptionId: redemption.id },
        );
        return {
          redemptionId: redemption.id,
          coupon,
          balance: customer.totalPoints - reward.pointsCost,
        };
      },
    );
  }
}
