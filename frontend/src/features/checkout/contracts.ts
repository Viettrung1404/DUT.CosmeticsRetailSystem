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
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .strict();
export const previewSchema = z.object({
  quoteVersion: z.string().regex(/^[a-f0-9]{64}$/),
  subtotal: z.number(),
  shippingFee: z.number(),
  shippingPolicy: z
    .object({
      fee: z.number().nonnegative(),
      freeFrom: z.number().nonnegative(),
      basis: z.literal("AFTER_DISCOUNTS"),
    })
    .optional(),
  discountAmount: z.number(),
  lineDiscount: z.number().optional(),
  couponDiscount: z.number().optional(),
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
export const checkoutBenefitsSchema = z.object({
  coupons: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      discountType: z.string(),
      discountValue: z.number(),
      minOrderAmount: z.number(),
      maxDiscountAmount: z.number().nullable(),
      endDate: z.string(),
    }),
  ),
  points: z.object({
    balance: z.number().int().nonnegative(),
    value: z.number().positive(),
    minimumBalance: z.number().nonnegative(),
    step: z.number().int().positive(),
    maxRatio: z.number().min(0).max(1),
  }),
});
export const orderSchema = z.object({
  isGuest: z.boolean().optional(),
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
    paymentMethod: z.enum(["COD", "SEPAY"]),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const paymentSchema = z.object({
  paymentId: z.uuid(),
  orderId: z.uuid(),
  method: z.string(),
  status: z.string(),
  paymentUrl: z.string().nullable(),
  qrCodeData: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});
export const paymentStatusSchema = paymentSchema.extend({
  paymentStatus: z.string(),
  orderStatus: z.string(),
  verificationPending: z.boolean(),
  refundPending: z.boolean(),
});
