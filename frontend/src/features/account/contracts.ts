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
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
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
export const trackingSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  statusHistories: z.array(z.object({ status: z.string(), createdAt: z.string() })),
  shipments: z.array(
    z.object({
      id: z.uuid(),
      carrierCode: z.string(),
      trackingCode: z.string().nullable(),
      status: z.string(),
      trackingUrl: z.string().nullable(),
      events: z.array(z.object({ id: z.uuid(), status: z.string(), occurredAt: z.string() })),
    }),
  ),
});
