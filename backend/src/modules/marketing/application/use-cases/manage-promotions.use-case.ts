import { randomInt } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponData,
  CouponView,
  IPromotionRepository,
  PROMOTION_REPOSITORY,
  PromotionData,
  PromotionView,
} from '../../domain/repositories/promotion.repository.interface';

// 8 ký tự in hoa + số, bỏ 0/O/1/I cho khỏi đọc nhầm
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const MAX_BULK = 500;

export const randomCouponCode = (prefix = ''): string => {
  let code = prefix;
  while (code.length < prefix.length + CODE_LENGTH) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
};

// Đơn đã xác nhận và chưa hủy / trả; không dựa trạng thái thanh toán
export const PROMOTION_REVENUE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED'];

// ROI = (doanh thu - tiền giảm) / tiền giảm; không có tiền giảm thì chưa tính được
export const promotionRoi = (revenue: number, discount: number): number | null =>
  discount > 0 ? Math.round(((revenue - discount) / discount) * 10000) / 10000 : null;

const checkDiscount = (type: string, value: number, endDate: Date, startDate: Date) => {
  if (type === 'PERCENTAGE' && value > 100) {
    throw new BadRequestException('Giảm theo phần trăm không được vượt 100%');
  }
  if (endDate <= startDate) {
    throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
  }
};

// Admin tạo / sửa / tắt khuyến mãi và mã giảm giá; giá khuyến mãi hiển thị do engine của Trung tính
@Injectable()
export class ManagePromotionsUseCase {
  constructor(@Inject(PROMOTION_REPOSITORY) private readonly repository: IPromotionRepository) {}

  listPromotions(input: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
    isFlashSale?: boolean;
    runningOnly?: boolean;
  }) {
    return this.repository.findPromotions({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      search: input.search?.trim() || undefined,
      isActive: input.isActive,
      isFlashSale: input.isFlashSale,
      runningAt: input.runningOnly ? new Date() : undefined,
    });
  }

  async promotion(id: string): Promise<PromotionView> {
    const row = await this.repository.findPromotion(id);
    if (!row) throw new NotFoundException('Không tìm thấy chương trình khuyến mãi');
    return row;
  }

  async promotionStats(id: string) {
    const promotion = await this.promotion(id);
    const totals = await this.repository.getPromotionUsageTotals(id, PROMOTION_REVENUE_STATUSES);
    return {
      promotionId: promotion.id,
      name: promotion.name,
      ...totals,
      roi: promotionRoi(totals.grossRevenue, totals.discountTotal),
    };
  }

  async createPromotion(data: PromotionData): Promise<PromotionView> {
    checkDiscount(data.type, data.value, data.endDate, data.startDate);
    await this.checkTargets(data);
    return this.repository.createPromotion({ ...data, name: data.name.trim() });
  }

  async updatePromotion(id: string, data: Partial<PromotionData>): Promise<PromotionView> {
    const current = await this.promotion(id);
    const merged = { ...current, ...data };
    checkDiscount(merged.type, merged.value, merged.endDate, merged.startDate);
    // Đã có đơn dùng thì không đổi cách giảm, tránh lệch với đơn cũ
    const changesDiscount =
      (data.type !== undefined && data.type !== current.type) ||
      (data.value !== undefined && data.value !== current.value);
    if (current.usedCount > 0 && changesDiscount) {
      throw new ConflictException('Khuyến mãi đã được dùng, không đổi loại / mức giảm; hãy tạo chương trình mới');
    }
    await this.checkTargets(data);
    return this.repository.updatePromotion(id, data);
  }

  async setPromotionActive(id: string, isActive: boolean): Promise<PromotionView> {
    await this.promotion(id);
    return this.repository.setPromotionActive(id, isActive);
  }

  listCoupons(input: { page: number; limit: number; search?: string; promotionId?: string; isActive?: boolean }) {
    return this.repository.findCoupons({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      search: input.search?.trim() || undefined,
      promotionId: input.promotionId,
      isActive: input.isActive,
    });
  }

  async createCoupon(input: CouponData & { code?: string }): Promise<CouponView> {
    await this.checkCoupon(input);
    if (input.code) {
      const code = input.code.trim().toUpperCase();
      if ((await this.repository.codesTaken([code])).length) {
        throw new ConflictException(`Mã ${code} đã tồn tại`);
      }
      const created = await this.repository.createCoupons([code], this.couponData(input));
      if (!created) throw new ConflictException(`Mã ${code} đã tồn tại`);
      return created[0];
    }
    return (await this.generate(1, '', this.couponData(input)))[0];
  }

  async createBulk(input: CouponData & { quantity: number; prefix?: string }): Promise<CouponView[]> {
    if (input.quantity < 1 || input.quantity > MAX_BULK) {
      throw new BadRequestException(`Mỗi lần tạo từ 1 đến ${MAX_BULK} mã`);
    }
    await this.checkCoupon(input);
    return this.generate(input.quantity, input.prefix?.trim().toUpperCase() ?? '', this.couponData(input));
  }

  async getCoupon(id: string): Promise<CouponView> {
    const coupon = await this.repository.findCoupon(id);
    if (!coupon) throw new NotFoundException('Không tìm thấy mã giảm giá');
    return coupon;
  }

  async updateCoupon(id: string, data: Partial<CouponData>): Promise<CouponView> {
    const current = await this.getCoupon(id);
    const merged = { ...current, ...data };
    const discountChanged =
      merged.discountType !== current.discountType || merged.discountValue !== current.discountValue;
    if (current.usedCount > 0 && discountChanged) {
      throw new ConflictException('Mã đã được dùng, không đổi loại / mức giảm; hãy tạo mã mới');
    }
    if (merged.maxUses !== null && merged.maxUses < current.usedCount) {
      throw new BadRequestException(`Tổng lượt dùng không được thấp hơn số lượt đã dùng (${current.usedCount})`);
    }
    checkDiscount(merged.discountType, merged.discountValue, merged.endDate, merged.startDate);
    return this.repository.updateCoupon(id, data);
  }

  async setCouponActive(id: string, isActive: boolean): Promise<CouponView> {
    await this.getCoupon(id);
    return this.repository.setCouponActive(id, isActive);
  }

  private async generate(quantity: number, prefix: string, data: CouponData): Promise<CouponView[]> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const codes = new Set<string>();
      while (codes.size < quantity) codes.add(randomCouponCode(prefix));
      const taken = new Set(await this.repository.codesTaken([...codes]));
      const fresh = [...codes].filter((c) => !taken.has(c));
      if (fresh.length < quantity) continue;
      const created = await this.repository.createCoupons(fresh, data);
      if (created) return created;
    }
    throw new ConflictException('Không sinh được đủ mã không trùng, thử lại');
  }

  private couponData(input: CouponData): CouponData {
    return {
      promotionId: input.promotionId ?? null,
      customerId: input.customerId ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? 0,
      maxDiscountAmount: input.maxDiscountAmount ?? null,
      maxUses: input.maxUses ?? null,
      maxUsesPerCustomer: input.maxUsesPerCustomer ?? 1,
      startDate: input.startDate,
      endDate: input.endDate,
    };
  }

  private async checkCoupon(input: CouponData) {
    checkDiscount(input.discountType, input.discountValue, input.endDate, input.startDate);
    if (input.promotionId) await this.promotion(input.promotionId);
    if (input.customerId && !(await this.repository.customerExists(input.customerId))) {
      throw new NotFoundException('Không tìm thấy khách hàng được tặng mã');
    }
  }

  private async checkTargets(data: Partial<PromotionData>) {
    if (data.applicableProducts?.length && (await this.repository.findMissingProducts(data.applicableProducts)).length) {
      throw new BadRequestException('Có sản phẩm áp dụng không tồn tại');
    }
    if (
      data.applicableCategories?.length &&
      (await this.repository.findMissingCategories(data.applicableCategories)).length
    ) {
      throw new BadRequestException('Có danh mục áp dụng không tồn tại');
    }
  }
}
