export type PosPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';
export type PosDiscountType = 'PERCENTAGE' | 'FIXED' | 'FIXED_AMOUNT';

export interface PosSaleVariant {
  variantId: string;
  productId: string;
  categoryId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  price: number;
  cost: number;
  isActive: boolean;
  productActive: boolean;
  onHand: number;
  reserved: number;
  expiredQuantity: number;
}

export interface PosPromotionRule {
  id: string;
  name: string;
  type: PosDiscountType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  productIds: string[] | null;
  categoryIds: string[] | null;
  usageLimit: number | null;
  usedCount: number;
}

export interface PosCouponRule {
  id: string;
  code: string;
  customerId: string | null;
  discountType: PosDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerCustomer: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface PosSaleCustomer {
  id: string;
  fullName: string | null;
  phone: string | null;
  totalPoints: number;
  pointMultiplier: number;
}

export interface PosSaleContext {
  variants: PosSaleVariant[];
  promotions: PosPromotionRule[];
  coupon: PosCouponRule | null;
  couponUsageCount: number;
  customer: PosSaleCustomer | null;
  employee: { id: string; commissionRate: number } | null;
  pointRate: number | null;
}

export interface PosPricedLine {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  gross: number;
  promotionId: string | null;
  promotionName: string | null;
  promotionDiscount: number;
  couponDiscount: number;
  // Khuyến mãi + voucher của dòng (ghi vào order_items.discount_amount)
  discountAmount: number;
  pointsDiscount: number;
  // gross - discountAmount, đúng công thức total_price ở tài liệu 04
  lineTotal: number;
}

export interface PosPricing {
  lines: PosPricedLine[];
  subtotal: number;
  promotionDiscount: number;
  couponDiscount: number;
  pointsDiscount: number;
  pointsUsed: number;
  total: number;
}

export interface PosPaymentInput {
  method: PosPaymentMethod;
  amount: number;
}

export interface PosAppliedPayment {
  method: PosPaymentMethod;
  amount: number;
  tenderedAmount: number | null;
}

export interface PosSettlement {
  payments: PosAppliedPayment[];
  totalReceived: number;
  change: number;
}

export interface PosStockShortage {
  variantId: string;
  productName: string;
  variantName: string | null;
  requested: number;
  sellable: number;
}

export interface CreatePosSaleCommand {
  orderNumberDate: Date;
  storeId: string;
  sessionId: string;
  cashierUserId: string;
  customerId: string | null;
  couponId: string | null;
  note: string | null;
  pricing: PosPricing;
  settlement: PosSettlement;
  employee: { id: string; commissionRate: number } | null;
  pointRate: number | null;
  promotionIds: string[];
}

export interface PosCreatedSale {
  orderId: string;
  orderNumber: string;
  createdAt: Date;
  pointsEarned: number;
  pointsNote: string | null;
  tierName: string | null;
  tierChanged: boolean;
  commissionAmount: number;
}

export interface PosReceipt {
  orderId: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  storeId: string;
  store: { code: string; name: string };
  session: { id: string; code: string; cashierId: string } | null;
  cashierName: string | null;
  customer: { id: string; fullName: string | null; phone: string | null } | null;
  items: Array<{
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    pointsDiscount: number;
    lineTotal: number;
    lineNetTotal: number;
  }>;
  subtotal: number;
  promotionDiscount: number;
  couponDiscount: number;
  couponCode: string | null;
  pointsUsed: number;
  pointsDiscount: number;
  total: number;
  pointsEarned: number;
  payments: Array<{ method: string; amount: number; tenderedAmount: number | null }>;
}

export interface PosSaleCustomerSummary {
  id: string;
  fullName: string | null;
  phone: string | null;
  totalPoints: number;
}

export interface PosPreviewResult {
  pricing: PosPricing;
  shortages: PosStockShortage[];
  customer: PosSaleCustomerSummary | null;
}

export interface PosOrderResult {
  sale: PosCreatedSale;
  pricing: PosPricing;
  settlement: PosSettlement;
  customer: PosSaleCustomerSummary | null;
}
