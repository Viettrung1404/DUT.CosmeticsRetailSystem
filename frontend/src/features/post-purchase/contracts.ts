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
  "REQUESTED",
  "APPROVED",
  "RECEIVED",
  "INSPECTED",
  "COMPLETED",
  "REJECTED",
]);
export const returnSummarySchema = z.object({
  id: z.uuid(),
  returnCode: z.string(),
  orderId: z.uuid(),
  returnType: z.enum(["REFUND", "EXCHANGE"]),
  status: z.string(),
  reason: z.string(),
  refundAmount: money.nullable(),
  createdAt: z.string(),
});
export const returnsSchema = page.extend({ items: z.array(returnSummarySchema) });
export const returnDetailSchema = returnSummarySchema.extend({
  quoteVersion: z.number(),
  quoteExpiresAt: z.string().nullable(),
  quoteSnapshot: z
    .object({
      policyVersion: z.string(),
      fee: money,
      credit: money,
      payable: money,
      lines: z.array(
        z.object({
          variantId: z.uuid(),
          quantity: z.number(),
          price: money,
          name: z.string(),
          sku: z.string(),
        }),
      ),
    })
    .nullable(),
  items: z.array(
    z.object({
      id: z.uuid(),
      orderItemId: z.uuid(),
      productVariantId: z.uuid(),
      quantity: z.number(),
      condition: z.string().nullable(),
      refundAmount: money,
      pointsToRestore: z.number(),
    }),
  ),
  settlement: z
    .object({
      replacementOrderId: z.uuid(),
      additionalDue: money,
      refundDue: money,
      status: z.string(),
    })
    .nullable(),
  refunds: z.array(z.object({ id: z.uuid(), amount: money, status: z.string() })),
  history: z.array(
    z.object({ status: z.string(), note: z.string().nullable(), createdAt: z.string() }),
  ),
  attachments: z.array(z.object({ id: z.uuid(), mimeType: z.string(), size: z.number() })),
});
export const createReturnInputSchema = z
  .object({
    orderId: z.uuid(),
    type: z.enum(["REFUND", "EXCHANGE"]),
    reason: z.enum(["WRONG_ITEM", "DEFECTIVE", "EXPIRED", "ALLERGIC", "CUSTOMER_CHANGE_MIND"]),
    items: z
      .array(z.object({ orderItemId: z.uuid(), quantity: z.number().int().min(1).max(10000) }))
      .min(1)
      .max(50),
    attachmentIds: z.array(z.uuid()).max(5).optional(),
    replacements: z
      .array(z.object({ productVariantId: z.uuid(), quantity: z.number().int().min(1).max(10000) }))
      .max(50)
      .optional(),
    idempotencyKey: z.uuid(),
  })
  .strict();
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
