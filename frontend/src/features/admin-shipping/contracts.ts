import { z } from "zod";

export const shipmentItemSchema = z.object({
  id: z.string(),
  shipmentCode: z.string(),
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  carrierCode: z.string(),
  trackingCode: z.string().nullable().optional(),
  status: z.string(),
  codAmount: z.number().default(0),
  shippingFee: z.number().default(0),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  shippingLabelUrl: z.string().nullable().optional(),
  trackingUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  attemptCount: z.number().optional().default(0),
});

export type ShipmentItem = z.infer<typeof shipmentItemSchema>;

export const shipmentAttemptSchema = z.object({
  id: z.string(),
  shipmentId: z.string(),
  attemptNumber: z.number(),
  reason: z.string().optional(),
  attemptedAt: z.string(),
  notes: z.string().optional(),
  carrierProofUrl: z.string().nullable().optional(),
});

export type ShipmentAttempt = z.infer<typeof shipmentAttemptSchema>;

export const reconcileShipmentInputSchema = z.object({
  carrierFound: z.boolean(),
  trackingCode: z.string().optional(),
});

export type ReconcileShipmentInput = z.infer<typeof reconcileShipmentInputSchema>;

export const receiveRtoInputSchema = z.object({
  condition: z.enum(["INTACT", "DAMAGED"]),
  notes: z.string().optional(),
});

export type ReceiveRtoInput = z.infer<typeof receiveRtoInputSchema>;
