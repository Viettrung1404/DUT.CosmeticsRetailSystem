import { z } from "zod";
import { orderSchema } from "@/features/checkout/contracts";

export const profileSchema = z.object({
  id: z.uuid(),
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  gender: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  totalPoints: z.number(),
  totalSpent: z.number(),
  totalOrders: z.number(),
  loyaltyTier: z.object({ name: z.string() }).nullable(),
});
export const profileInputSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100),
    phone: z
      .string()
      .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/)
      .optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dateOfBirth: z.iso.date().optional(),
  })
  .strict();
export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "SHIPPED",
  "PARTIALLY_SHIPPED",
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
  "PARTIALLY_RETURNED",
]);
export const orderDetailSchema = orderSchema.extend({
  createdAt: z.string(),
  shippingFee: z.number(),
  subtotal: z.number(),
  discountAmount: z.number(),
  shippingAddress: z
    .object({
      recipientName: z.string(),
      phone: z.string(),
      addressLine: z.string(),
      ward: z.string().optional(),
      district: z.string().optional(),
      city: z.string(),
    })
    .nullable(),
  items: z.array(
    z.object({
      id: z.uuid(),
      thumbnailUrl: z.string().nullable().optional(),
      productName: z.string(),
      variantName: z.string(),
      quantity: z.number(),
      totalPrice: z.number(),
    }),
  ),
});
export const ordersSchema = z.object({
  orders: z.array(orderDetailSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
export const shipmentPackageItemSchema = z.object({
  quantity: z.number(),
  productName: z.string(),
  variantName: z.string().optional(),
});

export const shipmentPackageSchema = z.object({
  id: z.string(),
  packageCode: z.string(),
  actualWeightGrams: z.number(),
  items: z.array(shipmentPackageItemSchema).default([]),
});

export const shipmentAttemptSchema = z.object({
  id: z.string().optional(),
  attemptNumber: z.number(),
  attemptedAt: z.string(),
  failureReasonCode: z.string().nullable().optional(),
  failureReasonDetail: z.string().nullable().optional(),
});

export const shipmentEventSchema = z.object({
  id: z.string(),
  status: z.string(),
  occurredAt: z.string(),
  receivedAt: z.string().optional(),
});

export const shipmentTrackingSchema = z.object({
  id: z.string(),
  shipmentCode: z.string().optional(),
  carrierCode: z.string(),
  carrierServiceCode: z.string().nullable().optional(),
  trackingCode: z.string().nullable(),
  status: z.string(),
  trackingUrl: z.string().nullable().optional(),
  failedAttempts: z.number().int().nonnegative().default(0),
  handedOverAt: z.string().nullable().optional(),
  deliveredAt: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  packages: z.array(shipmentPackageSchema).default([]),
  attempts: z.array(shipmentAttemptSchema).default([]),
  events: z.array(shipmentEventSchema).default([]),
});

export const trackingSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  statusHistories: z.array(
    z.object({
      status: z.string(),
      createdAt: z.string(),
      note: z.string().nullable().optional(),
    }),
  ),
  shipments: z.array(shipmentTrackingSchema),
});
