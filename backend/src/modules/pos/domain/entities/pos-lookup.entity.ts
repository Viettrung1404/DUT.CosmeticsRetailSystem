export interface PosVariantStock {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  isActive: boolean;
  productActive: boolean;
  onHand: number;
  reserved: number;
  expiredQuantity: number;
  hasNearExpiry: boolean;
}

export interface PosVariantView extends PosVariantStock {
  sellableQuantity: number;
}

export interface PosCustomerInfo {
  id: string;
  fullName: string | null;
  phone: string | null;
  hasAccount: boolean;
  totalPoints: number;
  tier: { name: string; discountPercentage: number; pointMultiplier: number } | null;
}
