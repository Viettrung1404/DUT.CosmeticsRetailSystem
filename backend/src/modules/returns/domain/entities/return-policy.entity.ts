export enum ReturnReasonCode {
  CHANGE_OF_MIND = 'CHANGE_OF_MIND',
  WRONG_ITEM = 'WRONG_ITEM',
  DAMAGED_IN_TRANSIT = 'DAMAGED_IN_TRANSIT',
  DEFECTIVE = 'DEFECTIVE',
  EXPIRED = 'EXPIRED',
  ALLERGIC = 'ALLERGIC',
}

export enum ReturnChannel {
  STORE_DROPOFF = 'STORE_DROPOFF',
  CARRIER_PICKUP = 'CARRIER_PICKUP',
}

export enum ShippingFeeBearer {
  CUSTOMER = 'CUSTOMER',
  GLOWUP = 'GLOWUP',
}

export enum ReturnInspectionStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  DISPUTED = 'DISPUTED',
}

export enum ReturnDisposition {
  RESTOCK = 'RESTOCK',
  QUARANTINE = 'QUARANTINE',
  SCRAP = 'SCRAP',
  RETURN_TO_CUSTOMER = 'RETURN_TO_CUSTOMER',
}

export enum ReturnOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  INSPECTING = 'INSPECTING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ReturnPolicyRuleProps {
  id?: string;
  policyVersionId: string;
  reasonCode: ReturnReasonCode | string;
  categoryId?: string | null;
  windowDays: number;
  requiresOriginalSeal: boolean;
  maxUsagePercentage: number;
  shippingFeeBearer: ShippingFeeBearer | string;
  requiresEvidenceVideo: boolean;
  requiresEvidenceImage: boolean;
  allowStoreDropoff: boolean;
  allowCarrierPickup: boolean;
  requiresManualReview: boolean;
  createdAt?: Date;
}

export interface ReturnPolicyVersionProps {
  id?: string;
  versionName: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive: boolean;
  description?: string | null;
  rules?: ReturnPolicyRuleProps[];
  createdAt?: Date;
  updatedAt?: Date;
}
