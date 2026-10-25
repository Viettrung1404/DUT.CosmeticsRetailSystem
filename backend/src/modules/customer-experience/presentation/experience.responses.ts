import { ApiResponse } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const uuid: SchemaObject = { type: 'string', format: 'uuid' };
const text: SchemaObject = { type: 'string' };
const number: SchemaObject = { type: 'number' };
const integer: SchemaObject = { type: 'integer' };
const timestamp: SchemaObject = { type: 'string', format: 'date-time' };
const array = (items: SchemaObject): SchemaObject => ({ type: 'array', items });
const object = (properties: Record<string, SchemaObject>): SchemaObject => ({
  type: 'object',
  properties,
});
const paged = (items: SchemaObject): SchemaObject =>
  object({
    items: array(items),
    total: integer,
    page: integer,
    limit: integer,
  });
const review = object({
  id: uuid,
  productId: uuid,
  rating: { type: 'integer', minimum: 1, maximum: 5 },
  title: text,
  content: text,
  isApproved: { type: 'boolean' },
  isVerifiedPurchase: { type: 'boolean' },
  reviewerName: text,
  adminReply: text,
  createdAt: timestamp,
});
const post = object({
  id: uuid,
  title: text,
  slug: text,
  content: { ...text, description: 'HTML sanitized by the shared allowlist' },
  excerpt: text,
  featuredImage: text,
  metaTitle: text,
  metaDescription: text,
  publishedAt: timestamp,
  viewsCount: integer,
  author: object({ fullName: text }),
  category: object({ id: uuid, name: text, slug: text }),
});
const promotion = object({
  id: uuid,
  name: text,
  description: text,
  type: {
    type: 'string',
    enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'],
  },
  value: {
    type: 'string',
    description: 'Prisma Decimal encoded as a JSON string',
  },
  minOrderAmount: { type: 'string' },
  maxDiscountAmount: { type: 'string', nullable: true },
  startDate: timestamp,
  endDate: timestamp,
  isFlashSale: { type: 'boolean' },
  applicableProducts: array(uuid),
  applicableCategories: array(uuid),
  variants: array(
    object({
      variantId: uuid,
      remaining: integer,
      effectivePrice: number,
      conditional: { type: 'boolean' },
    }),
  ),
});
export const experienceSchemas: Record<string, SchemaObject> = {
  review,
  reviews: {
    ...paged(review),
    properties: {
      ...paged(review).properties,
      histogram: { type: 'object', additionalProperties: { type: 'integer' } },
      avgRating: number,
      totalReviews: integer,
    },
  },
  page: object({
    title: text,
    slug: text,
    content: text,
    metaTitle: text,
    metaDescription: text,
    updatedAt: timestamp,
  }),
  posts: paged(post),
  post,
  categories: array(
    object({ id: uuid, name: text, slug: text, description: text }),
  ),
  faqs: array(
    object({
      category: text,
      items: array(object({ id: uuid, question: text, answer: text })),
    }),
  ),
  banners: array(
    object({
      id: uuid,
      title: text,
      imageUrl: text,
      linkUrl: { ...text, nullable: true },
      position: text,
    }),
  ),
  promotions: object({
    items: array(promotion),
    page: integer,
    limit: integer,
    serverTime: timestamp,
    reservation: { type: 'boolean', example: false },
  }),
  quote: object({
    valid: { type: 'boolean' },
    reasonCode: { type: 'string', nullable: true },
    subtotal: number,
    lineDiscount: number,
    couponDiscount: number,
    pointsDiscount: number,
    pointsUsed: integer,
    shippingFee: number,
    taxAmount: number,
    totalAmount: number,
    couponId: { ...uuid, nullable: true },
    quoteVersion: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    calculatedAt: timestamp,
    reservation: { type: 'boolean', example: false },
    items: array(
      object({
        variantId: uuid,
        quantity: integer,
        originalPrice: number,
        effectivePrice: number,
        tierDiscount: number,
        promotionDiscount: number,
        promotionId: { ...uuid, nullable: true },
        couponDiscount: number,
        pointsValue: number,
        pointsUsed: integer,
        cashValue: number,
      }),
    ),
  }),
};
export function ExperienceResponse(
  name: keyof typeof experienceSchemas,
  status = 200,
) {
  return ApiResponse({
    status,
    schema: object({
      statusCode: { type: 'integer', example: status },
      success: { type: 'boolean', example: true },
      message: text,
      data: experienceSchemas[name],
    }),
  });
}
