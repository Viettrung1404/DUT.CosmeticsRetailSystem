import { z } from "zod";

export const taskQueueItemSchema = z.object({
  id: z.string(),
  fulfillmentOrderNumber: z.string(),
  status: z.string(),
  sourceLocationId: z.string(),
  sourceLocationName: z.string().optional(),
  totalItemsCount: z.number(),
  shippingServiceCode: z.string(),
  assignedPickerId: z.string().nullable().optional(),
  orderNumber: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  deliveryMethod: z.string().optional(),
  allocatedAt: z.string().nullable().optional(),
  pickedAt: z.string().nullable().optional(),
  packedAt: z.string().nullable().optional(),
  availableActions: z.array(z.string()).optional(),
  trackingCode: z.string().optional(),
});

export type TaskQueueItem = z.infer<typeof taskQueueItemSchema>;

export const taskQueueResponseSchema = z.object({
  items: z.array(taskQueueItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type TaskQueueResponse = z.infer<typeof taskQueueResponseSchema>;

export const pickListItemSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  barcode: z.string().nullable().optional(),
  lotId: z.string(),
  batchCode: z.string(),
  expiryDate: z.string(),
  quantity: z.number(),
});

export type PickListItem = z.infer<typeof pickListItemSchema>;

export const pickListResponseSchema = z.object({
  fulfillmentOrderId: z.string(),
  fulfillmentOrderNumber: z.string(),
  sourceLocationId: z.string(),
  sourceLocationName: z.string(),
  status: z.string(),
  totalItemsCount: z.number(),
  items: z.array(pickListItemSchema),
});

export type PickListResponse = z.infer<typeof pickListResponseSchema>;

export const packageDimensionSchema = z.object({
  weight: z.number().min(0.01, "Cân nặng phải lớn hơn 0 kg"),
  length: z.number().min(1, "Chiều dài phải lớn hơn 0 cm"),
  width: z.number().min(1, "Chiều rộng phải lớn hơn 0 cm"),
  height: z.number().min(1, "Chiều cao phải lớn hơn 0 cm"),
});

export const completePackingInputSchema = z.object({
  packages: z.array(packageDimensionSchema).min(1, "Phải có ít nhất 1 kiện hàng"),
  expectedVersion: z.number().optional(),
});

export type CompletePackingInput = z.infer<typeof completePackingInputSchema>;
