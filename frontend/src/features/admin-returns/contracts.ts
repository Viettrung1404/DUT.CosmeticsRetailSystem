import { z } from "zod";

export const returnItemSchema = z.object({
  id: z.string(),
  productVariantId: z.string(),
  productVariant: z.object({
    sku: z.string(),
    product: z.object({
      name: z.string(),
    }).optional(),
  }).optional(),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number(),
  reasonCategory: z.string().optional(),
  reason: z.string().optional(),
  inspectionStatus: z.string().optional(),
  disposition: z.string().nullable().optional(),
});

export type ReturnItem = z.infer<typeof returnItemSchema>;

export const returnOrderSchema = z.object({
  id: z.string(),
  returnCode: z.string(),
  orderId: z.string(),
  status: z.string(),
  returnChannel: z.string(),
  version: z.number().optional().default(1),
  customer: z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  customerName: z.string().optional(),
  items: z.array(returnItemSchema).default([]),
  dropoffLocation: z.object({
    name: z.string().optional(),
    code: z.string().optional(),
  }).nullable().optional(),
  dropoffLocationName: z.string().optional(),
  proofImages: z.array(z.string()).optional(),
  proofVideos: z.array(z.string()).optional(),
  receipts: z.array(z.any()).optional(),
  inspections: z.array(z.any()).optional(),
  availableActions: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export type ReturnOrder = z.infer<typeof returnOrderSchema>;

export const itemInspectionInputSchema = z.object({
  returnItemId: z.string(),
  sealCondition: z.enum(["INTACT", "BROKEN", "MISSING"]),
  packagingCondition: z.enum(["INTACT", "TORN", "DAMAGED"]),
  disposition: z.enum(["RESTOCK", "QUARANTINE", "SCRAP", "RETURN_TO_CUSTOMER"]),
  inspectorNote: z.string().optional(),
  defectReason: z.string().optional(),
});

export const completeInspectionInputSchema = z.object({
  generalConditionNotes: z.string().min(1, "Vui lòng nhập ghi chú kiểm định"),
  items: z.array(itemInspectionInputSchema).min(1, "Phải kiểm định ít nhất 1 mặt hàng"),
});

export type CompleteInspectionInput = z.infer<typeof completeInspectionInputSchema>;
