import { Injectable } from '@nestjs/common';
import { Coupon, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  CouponData,
  CouponView,
  IPromotionRepository,
  PromotionData,
  PromotionView,
} from '../../domain/repositories/promotion.repository.interface';

const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
const ids = (json: Prisma.JsonValue | null) => (Array.isArray(json) ? (json as string[]) : null);

const toPromotion = (p: Promotion & { _count?: { coupons: number } }): PromotionView => ({
  id: p.id,
  name: p.name,
  description: p.description,
  type: p.type,
  value: Number(p.value),
  minOrderAmount: Number(p.minOrderAmount),
  maxDiscountAmount: num(p.maxDiscountAmount),
  startDate: p.startDate,
  endDate: p.endDate,
  usageLimit: p.usageLimit,
  isFlashSale: p.isFlashSale,
  applicableProducts: ids(p.applicableProducts),
  applicableCategories: ids(p.applicableCategories),
  isActive: p.isActive,
  usedCount: p.usedCount,
  couponCount: p._count?.coupons ?? 0,
  createdAt: p.createdAt,
});

const toCoupon = (c: Coupon): CouponView => ({
  id: c.id,
  code: c.code,
  promotionId: c.promotionId,
  customerId: c.customerId,
  discountType: c.discountType,
  discountValue: Number(c.discountValue),
  minOrderAmount: Number(c.minOrderAmount),
  maxDiscountAmount: num(c.maxDiscountAmount),
  maxUses: c.maxUses,
  maxUsesPerCustomer: c.maxUsesPerCustomer,
  startDate: c.startDate,
  endDate: c.endDate,
  usedCount: c.usedCount,
  isActive: c.isActive,
  createdAt: c.createdAt,
});

const jsonArray = (value: string[] | null | undefined) =>
  value === undefined ? undefined : value === null ? Prisma.DbNull : value;

const promotionInput = (data: Partial<PromotionData>) => ({
  ...data,
  applicableProducts: jsonArray(data.applicableProducts),
  applicableCategories: jsonArray(data.applicableCategories),
});

const COUNT = { _count: { select: { coupons: true } } } as const;

@Injectable()
export class PrismaPromotionRepository implements IPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPromotions(filter: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
    isFlashSale?: boolean;
    runningAt?: Date;
  }) {
    const where: Prisma.PromotionWhereInput = {
      isActive: filter.isActive,
      isFlashSale: filter.isFlashSale,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
      ...(filter.runningAt
        ? { startDate: { lte: filter.runningAt }, endDate: { gt: filter.runningAt } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        include: COUNT,
        orderBy: { startDate: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return { items: rows.map(toPromotion), total };
  }

  async findPromotion(id: string) {
    const row = await this.prisma.promotion.findUnique({ where: { id }, include: COUNT });
    return row ? toPromotion(row) : null;
  }

  async getPromotionUsageTotals(id: string, orderStatuses: string[]) {
    const [row] = await this.prisma.$queryRaw<
      { orders: bigint; units: bigint; discount: Prisma.Decimal; gross: Prisma.Decimal; net: Prisma.Decimal }[]
    >`SELECT COUNT(DISTINCT o.id) AS orders,
             COALESCE(SUM(oi.quantity), 0) AS units,
             COALESCE(SUM(oi.discount_amount), 0) AS discount,
             COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS gross,
             COALESCE(SUM(oi.total_price), 0) AS net
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.promotion_id = ${id}::uuid AND o.status IN (${Prisma.join(orderStatuses)})`;
    return {
      orderCount: Number(row?.orders ?? 0),
      unitCount: Number(row?.units ?? 0),
      discountTotal: Number(row?.discount ?? 0),
      grossRevenue: Number(row?.gross ?? 0),
      netRevenue: Number(row?.net ?? 0),
    };
  }

  async createPromotion(data: PromotionData) {
    return toPromotion(
      await this.prisma.promotion.create({
        data: { ...promotionInput(data), name: data.name, type: data.type, value: data.value, startDate: data.startDate, endDate: data.endDate },
        include: COUNT,
      }),
    );
  }

  async updatePromotion(id: string, data: Partial<PromotionData>) {
    return toPromotion(
      await this.prisma.promotion.update({ where: { id }, data: promotionInput(data), include: COUNT }),
    );
  }

  async setPromotionActive(id: string, isActive: boolean) {
    return toPromotion(
      await this.prisma.promotion.update({ where: { id }, data: { isActive }, include: COUNT }),
    );
  }

  async findMissingProducts(list: string[]) {
    const found = await this.prisma.product.findMany({ where: { id: { in: list } }, select: { id: true } });
    const set = new Set(found.map((x) => x.id));
    return list.filter((id) => !set.has(id));
  }

  async findMissingCategories(list: string[]) {
    const found = await this.prisma.category.findMany({ where: { id: { in: list } }, select: { id: true } });
    const set = new Set(found.map((x) => x.id));
    return list.filter((id) => !set.has(id));
  }

  async customerExists(id: string) {
    return (await this.prisma.customer.count({ where: { id } })) > 0;
  }

  async findCoupons(filter: {
    skip: number;
    take: number;
    search?: string;
    promotionId?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.CouponWhereInput = {
      promotionId: filter.promotionId,
      isActive: filter.isActive,
      code: filter.search ? { contains: filter.search.toUpperCase() } : undefined,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return { items: rows.map(toCoupon), total };
  }

  async findCoupon(id: string) {
    const row = await this.prisma.coupon.findUnique({ where: { id } });
    return row ? toCoupon(row) : null;
  }

  async codesTaken(codes: string[]) {
    const rows = await this.prisma.coupon.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    return rows.map((r) => r.code);
  }

  async createCoupons(codes: string[], data: CouponData): Promise<CouponView[] | null> {
    try {
      const rows = await this.prisma.$transaction(
        codes.map((code) => this.prisma.coupon.create({ data: { ...data, code } })),
      );
      return rows.map(toCoupon);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
      throw error;
    }
  }

  async updateCoupon(id: string, data: Partial<CouponData>) {
    return toCoupon(await this.prisma.coupon.update({ where: { id }, data }));
  }

  async setCouponActive(id: string, isActive: boolean) {
    return toCoupon(await this.prisma.coupon.update({ where: { id }, data: { isActive } }));
  }
}
