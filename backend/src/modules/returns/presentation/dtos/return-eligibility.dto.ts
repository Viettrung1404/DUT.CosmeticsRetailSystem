export interface AllowedReturnRuleDto {
  reasonCode: string;
  windowDays: number;
  daysRemaining: number;
  requiresOriginalSeal: boolean;
  maxUsagePercentage: number;
  shippingFeeBearer: string;
  requiresEvidenceVideo: boolean;
  requiresEvidenceImage: boolean;
  allowStoreDropoff: boolean;
  allowCarrierPickup: boolean;
  requiresManualReview: boolean;
}

export interface ItemEligibilityDto {
  orderItemId: string;
  productId: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string;
  thumbnailUrl?: string | null;
  unitPrice: number;
  purchasedQuantity: number;
  alreadyReturnedQuantity: number;
  availableReturnQuantity: number;
  isEligible: boolean;
  ineligibleReason?: string;
  allowedRules: AllowedReturnRuleDto[];
}

export interface OrderEligibilityResultDto {
  orderId: string;
  orderCode: string;
  deliveredAt: Date | null;
  policyVersionName: string;
  isEligible: boolean;
  ineligibleReasons: string[];
  items: ItemEligibilityDto[];
}
