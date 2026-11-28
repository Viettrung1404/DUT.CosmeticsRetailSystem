export enum ReturnRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AbuseActionRecommendation {
  AUTO_APPROVE_ELIGIBLE = 'AUTO_APPROVE_ELIGIBLE',
  STANDARD_REVIEW = 'STANDARD_REVIEW',
  REQUIRE_SUPERVISOR_APPROVAL = 'REQUIRE_SUPERVISOR_APPROVAL',
  FLAGGED_FOR_FRAUD_AUDIT = 'FLAGGED_FOR_FRAUD_AUDIT',
}

export interface RiskFactorDetail {
  factorCode: string;
  description: string;
  scoreContribution: number;
  evidence?: any;
}

export interface ReturnAbuseEvaluationResult {
  returnOrderId: string;
  customerId: string;
  riskScore: number;
  riskLevel: ReturnRiskLevel;
  isFlagged: boolean;
  actionRecommended: AbuseActionRecommendation;
  factors: RiskFactorDetail[];
  evaluatedAt: Date;
}

export interface CustomerRiskProfileResult {
  customerId: string;
  fullName?: string;
  totalOrders: number;
  totalReturns: number;
  returnRatePercentage: number;
  totalFailedInspections: number;
  riskLevel: ReturnRiskLevel;
  isWatchlist: boolean;
  recentEvaluationsCount: number;
}
