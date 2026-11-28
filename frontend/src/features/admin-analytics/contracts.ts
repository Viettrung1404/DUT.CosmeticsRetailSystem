import { z } from "zod";

export const logisticsOverviewSchema = z.object({
  firstAttemptRate: z.number().default(0),
  expressSlaBreachRate: z.number().default(0),
  totalCodDiscrepancy: z.number().default(0),
  totalThroughputOrders: z.number().default(0),
  carrierPerformance: z.array(z.any()).optional().default([]),
});

export type LogisticsOverview = z.infer<typeof logisticsOverviewSchema>;

export const lotQualityDetailSchema = z.object({
  lotId: z.string(),
  batchCode: z.string(),
  sku: z.string(),
  productName: z.string(),
  totalSold: z.number().default(0),
  totalReturned: z.number().default(0),
  defectRate: z.number().default(0),
  isDefectAlert: z.boolean().default(false),
  recommendedAction: z.string().optional(),
});

export type LotQualityDetail = z.infer<typeof lotQualityDetailSchema>;

export const returnReasonBreakdownSchema = z.object({
  reasons: z.array(
    z.object({
      category: z.string(),
      count: z.number(),
      percentage: z.number(),
      totalValue: z.number().default(0),
    })
  ).default([]),
});

export type ReturnReasonBreakdown = z.infer<typeof returnReasonBreakdownSchema>;

export const carrierDamageSchema = z.object({
  carriers: z.array(
    z.object({
      carrierCode: z.string(),
      totalShipments: z.number(),
      damagedCount: z.number(),
      damageRate: z.number(),
    })
  ).default([]),
});

export type CarrierDamage = z.infer<typeof carrierDamageSchema>;
