import { z } from "zod";
import { productSchema } from "@/features/catalog/contracts";

const money = z.union([z.number(), z.string()]).transform(Number);
const page = z.object({ page: z.number(), limit: z.number(), total: z.number() });
export const wishlistSchema = page.extend({ items: z.array(productSchema) });
export const wishlistChangeSchema = z
  .object({ productId: z.uuid(), selected: z.boolean(), idempotencyKey: z.uuid() })
  .strict();
export const wishlistResultSchema = z.object({ productId: z.uuid(), isWishlisted: z.boolean() });
export const loyaltySchema = page.extend({
  balance: z.number(),
  tier: z.object({ name: z.string() }).nullable(),
  nextTier: z.object({ name: z.string(), minPoints: z.number() }).nullable(),
  history: z.array(
    z.object({
      id: z.uuid(),
      orderId: z.uuid().nullable(),
      points: z.number(),
      type: z.string(),
      description: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export const rewardSchema = z.object({
  code: z.string(),
  version: z.string(),
  pointsCost: z.number(),
  discountType: z.string(),
  discountValue: z.number(),
  minOrderAmount: z.number(),
  validityDays: z.number(),
});
export const rewardsSchema = z.array(rewardSchema);
export const redemptionSchema = z.object({
  redemptionId: z.uuid(),
  balance: z.number(),
  coupon: z.object({
    id: z.uuid(),
    code: z.string(),
    discountType: z.string(),
    discountValue: money,
    endDate: z.string(),
  }),
});
export const redeemInputSchema = z
  .object({ rewardCode: z.string().min(1).max(60), idempotencyKey: z.uuid() })
  .strict();
export const notificationsSchema = page.extend({
  unreadCount: z.number(),
  items: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      message: z.string(),
      type: z.string(),
      isRead: z.boolean(),
      createdAt: z.string(),
    }),
  ),
});
export const readNotificationSchema = z.object({ id: z.uuid(), isRead: z.literal(true) });

export const returnStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "SHIPPED",
  "RECEIVED",
  "INSPECTING",
  "INSPECTED",
  "RESOLUTION_PENDING",
  "DISPUTED",
  "COMPLETED",
  "CANCELLED",
]);

export const allowedReturnRuleSchema = z.object({
  reasonCode: z.string(),
  windowDays: z.number(),
  daysRemaining: z.number(),
  requiresOriginalSeal: z.boolean(),
  maxUsagePercentage: z.number().optional(),
  shippingFeeBearer: z.string().optional(),
  requiresEvidenceVideo: z.boolean(),
  requiresEvidenceImage: z.boolean(),
  allowStoreDropoff: z.boolean(),
  allowCarrierPickup: z.boolean(),
  requiresManualReview: z.boolean().optional(),
});

export const itemEligibilitySchema = z.object({
  orderItemId: z.string(),
  productId: z.string().optional(),
  productVariantId: z.string().optional(),
  productName: z.string(),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  unitPrice: z.number().optional(),
  purchasedQuantity: z.number(),
  alreadyReturnedQuantity: z.number(),
  availableReturnQuantity: z.number(),
  isEligible: z.boolean(),
  ineligibleReason: z.string().optional(),
  allowedRules: z.array(allowedReturnRuleSchema).default([]),
});

export const orderEligibilitySchema = z.object({
  orderId: z.string(),
  orderCode: z.string().optional(),
  deliveredAt: z.string().nullable().optional(),
  policyVersionName: z.string().optional(),
  isEligible: z.boolean(),
  ineligibleReasons: z.array(z.string()).default([]),
  items: z.array(itemEligibilitySchema).default([]),
});

export const storeLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  address: z.string(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  openingHours: z.unknown().nullable().optional(),
});
export const storeLocationsSchema = z.array(storeLocationSchema);

export const returnItemSubmissionSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().int().min(1),
  reasonCode: z.string(),
  customerNote: z.string().optional(),
  evidenceImages: z.array(z.string()).min(1, "Mỗi sản phẩm hoàn trả phải có ít nhất 1 hình ảnh bằng chứng"),
  evidenceVideoUrl: z.string().optional(),
});

export const submitReturnInputSchema = z.object({
  orderId: z.string(),
  returnChannel: z.enum(["STORE_DROPOFF", "CARRIER_PICKUP"]).default("CARRIER_PICKUP"),
  dropoffLocationId: z.string().optional(),
  pickupAddress: z.record(z.string(), z.any()).optional(),
  customerNote: z.string().optional(),
  items: z.array(returnItemSubmissionSchema).min(1, "Hồ sơ đổi trả phải chứa ít nhất 1 sản phẩm"),
  idempotencyKey: z.string().optional(),
});

export const returnSummarySchema = z.object({
  id: z.string(),
  returnCode: z.string(),
  orderId: z.string(),
  returnType: z.string().default("REFUND"),
  status: z.string(),
  reason: z.string(),
  refundAmount: money.nullable().optional(),
  createdAt: z.string(),
  returnChannel: z.string().optional(),
  dropoffLocation: z
    .object({ id: z.string(), name: z.string(), address: z.string() })
    .nullable()
    .optional(),
  order: z
    .object({
      orderNumber: z.string().optional(),
      totalAmount: money.optional(),
    })
    .optional(),
  items: z.array(z.any()).optional(),
});
export const returnsSchema = z.object({
  items: z.array(returnSummarySchema),
  total: z.number(),
  page: z.number().optional(),
  limit: z.number().optional(),
  totalPages: z.number().optional(),
});
export const returnDetailSchema = returnSummarySchema.extend({
  quoteVersion: z.number().optional(),
  quoteExpiresAt: z.string().nullable().optional(),
  quoteSnapshot: z
    .object({
      policyVersion: z.string(),
      fee: money,
      credit: money,
      payable: money,
      lines: z.array(
        z.object({
          variantId: z.string(),
          quantity: z.number(),
          price: money,
          name: z.string(),
          sku: z.string(),
        }),
      ),
    })
    .nullable()
    .optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      orderItemId: z.string().optional(),
      productVariantId: z.string().optional(),
      quantity: z.number(),
      reasonCode: z.string().optional(),
      condition: z.string().nullable().optional(),
      inspectionStatus: z.string().nullable().optional(),
      inspectionCondition: z.string().nullable().optional(),
      disposition: z.string().nullable().optional(),
      inspectionNote: z.string().nullable().optional(),
      refundAmount: money.nullable().optional(),
      pointsToRestore: z.number().optional(),
      evidenceImages: z.array(z.string()).optional(),
      evidenceVideoUrl: z.string().nullable().optional(),
      variant: z
        .object({
          sku: z.string().optional(),
          option1Value: z.string().nullable().optional(),
          price: money.optional(),
          product: z
            .object({
              name: z.string().optional(),
              images: z.array(z.any()).optional(),
            })
            .optional(),
        })
        .optional(),
    }),
  ),
  dropoffLocationId: z.string().nullable().optional(),
  dropoffLocation: z
    .object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  pickupAddress: z.record(z.string(), z.any()).nullable().optional(),
  customerNote: z.string().nullable().optional(),
  policyVersion: z
    .object({
      id: z.string().optional(),
      versionName: z.string().optional(),
      description: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  settlement: z
    .object({
      replacementOrderId: z.string().optional(),
      additionalDue: money.optional(),
      refundDue: money.optional(),
      status: z.string().optional(),
    })
    .nullable()
    .optional(),
  refunds: z.array(z.object({ id: z.string(), amount: money, status: z.string() })).default([]),
  history: z
    .array(
      z.object({
        status: z.string(),
        note: z.string().nullable().optional(),
        createdAt: z.string(),
      }),
    )
    .default([]),
  attachments: z
    .array(z.object({ id: z.string(), mimeType: z.string(), size: z.number() }))
    .default([]),
});
export const createReturnInputSchema = submitReturnInputSchema;
export const returnCreatedSchema = z.object({
  id: z.uuid(),
  returnCode: z.string(),
  status: z.string(),
});
export const acceptExchangeInputSchema = z
  .object({
    quoteVersion: z.number().int().min(1),
    paymentMethod: z.literal("COD").optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const exchangeSchema = z.object({
  replacementOrderId: z.uuid(),
  settlement: z.object({ status: z.string(), additionalDue: money, refundDue: money }),
});
export const imageUploadSchema = z.object({
  attachmentId: z.uuid(),
  mimeType: z.string(),
  size: z.number(),
});
export const imageUrlSchema = z.object({ url: z.url(), expiresIn: z.number() });
export const reviewInputSchema = z
  .object({
    productId: z.uuid(),
    orderId: z.uuid().optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(255).optional(),
    content: z.string().max(10000).optional(),
  })
  .strict();
export const reviewResultSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  rating: z.number(),
  isApproved: z.boolean(),
});
