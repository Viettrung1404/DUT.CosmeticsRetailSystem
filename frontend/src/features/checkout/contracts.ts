import { z } from "zod";

export const orderItemsSchema = z
  .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(100) }))
  .min(1)
  .max(100);
export const previewInputSchema = z
  .object({
    items: orderItemsSchema,
    couponCode: z.string().trim().max(50).optional(),
    usePoints: z.number().int().min(0).optional(),
  })
  .strict();
export const shippingSchema = z
  .object({
    recipientName: z.string().trim().min(1).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/),
    addressLine: z.string().trim().min(1).max(255),
    ward: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    city: z.string().trim().min(1).max(100),
  })
  .strict();
export const previewSchema = z.object({
  quoteVersion: z.string().regex(/^[a-f0-9]{64}$/),
  subtotal: z.number(),
  shippingFee: z.number(),
  discountAmount: z.number(),
  pointsDiscount: z.number(),
  totalAmount: z.number(),
  items: z.array(
    z.object({
      productVariantId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      totalPrice: z.number(),
    }),
  ),
});
export const orderSchema = z.object({
  id: z.uuid(),
  orderNumber: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  payments: z
    .array(z.object({ id: z.uuid(), paymentMethod: z.string(), status: z.string() }))
    .optional(),
});
export const createOrderInputSchema = previewInputSchema
  .extend({
    quoteVersion: previewSchema.shape.quoteVersion,
    shippingAddress: shippingSchema,
    paymentMethod: z.enum(["COD", "VNPAY"]),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const paymentSchema = z.object({
  paymentId: z.uuid(),
  orderId: z.uuid(),
  method: z.string(),
  status: z.string(),
  paymentUrl: z.string().nullable(),
  expiresAt: z.string().nullable().optional(),
});
export const paymentStatusSchema = paymentSchema.extend({
  paymentStatus: z.string(),
  orderStatus: z.string(),
  verificationPending: z.boolean(),
  refundPending: z.boolean(),
});
