import { z } from "zod";

export const orderItemsSchema = z
  .array(
    z.object({
      variantId: z.uuid(),
      quantity: z.number().int().min(1).max(99),
      attributionSource: z.string().trim().max(60).optional(),
    }),
  )
  .min(1)
  .max(100);
export const previewInputSchema = z
  .object({
    items: orderItemsSchema,
    couponCode: z.string().trim().max(50).optional(),
    usePoints: z.number().int().min(0).optional(),
    quoteGroupId: z.string().optional(),
    shippingOptionId: z.string().optional(),
  })
  .strict();

export const shippingQuoteOptionSchema = z.object({
  id: z.string().optional(),
  carrierCode: z.enum(["AHAMOVE", "GHN"]).or(z.string()),
  serviceCode: z.enum(["EXPRESS_2H", "STANDARD"]).or(z.string()),
  serviceName: z.string(),
  sourceLocationId: z.string(),
  sourceLocationName: z.string(),
  estimatedFee: z.number().nonnegative(),
  estimatedDeliveryTime: z.string(),
  distanceKm: z.number().nullable().optional(),
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable().optional(),
});

export const shippingQuoteResponseSchema = z.object({
  quoteGroupId: z.string(),
  expiresAt: z.string(),
  options: z.array(shippingQuoteOptionSchema),
});

export const shippingQuoteInputSchema = z.object({
  items: orderItemsSchema,
  shippingAddress: z.object({
    provinceCity: z.string().min(1),
    district: z.string().min(1),
    ward: z.string().optional(),
    addressLine: z.string().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
  orderType: z.string().optional(),
});
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
      variantName: z.string().optional(),
      originalPrice: z.number().optional(),
      effectivePrice: z.number().optional(),
      lineDiscount: z.number().optional(),
      quotaQuantity: z.number().int().nonnegative().optional(),
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
