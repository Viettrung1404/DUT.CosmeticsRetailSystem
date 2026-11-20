import { z } from "zod";

export const codItemSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  shipmentCode: z.string().optional(),
  trackingCode: z.string(),
  declaredCodAmount: z.number(),
  carrierPaidCodAmount: z.number(),
  discrepancyAmount: z.number(),
  carrierFeeCharged: z.number().default(0),
  status: z.string(),
});

export type CodReconciliationItem = z.infer<typeof codItemSchema>;

export const codBatchSchema = z.object({
  id: z.string(),
  reconciliationCode: z.string(),
  carrierCode: z.string(),
  reconciliationDate: z.string(),
  totalOrdersCount: z.number().default(0),
  totalDeclaredCod: z.number().default(0),
  totalPaidCod: z.number().default(0),
  totalDiscrepancy: z.number().default(0),
  totalCarrierFees: z.number().default(0),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(codItemSchema).optional(),
});

export type CodReconciliationBatch = z.infer<typeof codBatchSchema>;

export const reconcileBatchInputSchema = z.object({
  reconciliationCode: z.string().min(1, "Vui lòng nhập mã bảng kê"),
  carrierCode: z.enum(["GHN", "AHAMOVE"]),
  reconciliationDate: z.string().min(1, "Vui lòng chọn ngày đối soát"),
  bankStatementRef: z.string().optional(),
  items: z.array(
    z.object({
      trackingCode: z.string().min(1),
      shipmentCode: z.string().optional(),
      carrierPaidCodAmount: z.number().min(0),
      carrierFeeCharged: z.number().min(0).optional(),
      carrierNote: z.string().optional(),
    })
  ).min(1, "Bảng kê phải có ít nhất 1 dòng vận đơn"),
});

export type ReconcileBatchInput = z.infer<typeof reconcileBatchInputSchema>;
