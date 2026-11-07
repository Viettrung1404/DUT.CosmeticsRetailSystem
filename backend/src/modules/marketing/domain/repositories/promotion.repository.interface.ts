export const PROMOTION_REPOSITORY = Symbol('IPromotionRepository');

export const PROMOTION_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] as const;
export const COUPON_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

export interface PromotionData {
  name: string;
  description: string | null;
  type: string;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  startDate: Date;
  endDate: Date;
  usageLimit: number | null;
  isFlashSale: boolean;
  applicableProducts: string[] | null;
  applicableCategories: string[] | null;
}

export interface PromotionView extends PromotionData {
  id: string;
  isActive: boolean;
  usedCount: number;
  couponCount: number;
  createdAt: Date;
}

export interface PromotionUsageTotals {
  orderCount: number;
  unitCount: number;
  discountTotal: number;
  grossRevenue: number;
  netRevenue: number;
}

export interface CouponData {
  promotionId: string | null;
  customerId: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number;
  startDate: Date;
  endDate: Date;
}

export interface CouponView extends CouponData {
  id: string;
  code: string;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
}

export interface IPromotionRepository {
  findPromotions(filter: {
    skip: number;
    take: number;
    search?: string;
    isActive?: boolean;
    isFlashSale?: boolean;
    runningAt?: Date;
  }): Promise<{ items: PromotionView[]; total: number }>;
  findPromotion(id: string): Promise<PromotionView | null>;
  getPromotionUsageTotals(id: string, orderStatuses: string[]): Promise<PromotionUsageTotals>;
  createPromotion(data: PromotionData): Promise<PromotionView>;
  updatePromotion(id: string, data: Partial<PromotionData>): Promise<PromotionView>;
  setPromotionActive(id: string, isActive: boolean): Promise<PromotionView>;
  findMissingProducts(ids: string[]): Promise<string[]>;
  findMissingCategories(ids: string[]): Promise<string[]>;
  customerExists(id: string): Promise<boolean>;

  findCoupons(filter: {
    skip: number;
    take: number;
    search?: string;
    promotionId?: string;
    isActive?: boolean;
  }): Promise<{ items: CouponView[]; total: number }>;
  findCoupon(id: string): Promise<CouponView | null>;
  codesTaken(codes: string[]): Promise<string[]>;
  // Tạo nhiều mã trong một giao dịch; trả null nếu đụng mã trùng (để sinh lại)
  createCoupons(codes: string[], data: CouponData): Promise<CouponView[] | null>;
  setCouponActive(id: string, isActive: boolean): Promise<CouponView>;
  updateCoupon(id: string, data: Partial<CouponData>): Promise<CouponView>;
}
