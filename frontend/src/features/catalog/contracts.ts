import { z } from "zod";

const money = z.union([z.number(), z.string()]).transform(Number);
const variant = z.object({
  id: z.string().optional(),
  sku: z.string(),
  price: money,
  effectivePrice: money.optional(),
  stockQuantity: z.number().optional(),
  option1Value: z.string().nullable().optional(),
  option2Value: z.string().nullable().optional(),
  option3Value: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const productSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  brandId: z.string().nullable().optional(),
  brandName: z.string().nullable().optional(),
  categoryName: z.string().optional(),
  primaryImage: z.string().nullable().optional(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  basePrice: money,
  salePrice: money.nullable().optional(),
  effectivePrice: money.nullable().optional(),
  avgRating: z.number().default(0),
  totalReviews: z.number().default(0),
  isFeatured: z.boolean().optional(),
  totalSold: z.number().optional(),
  option1Name: z.string().nullable().optional(),
  option2Name: z.string().nullable().optional(),
  variants: z.array(variant).default([]),
  images: z
    .array(
      z.object({
        imageUrl: z.string(),
        altText: z.string().nullable().optional(),
        isPrimary: z.boolean().optional(),
        productVariantId: z.string().nullable().optional(),
      }),
    )
    .optional(),
  ingredients: z
    .array(
      z.object({
        ingredientName: z.string(),
        percentage: z.string().nullable().optional(),
        isKeyIngredient: z.boolean().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
});
export type Product = z.infer<typeof productSchema>;
export const productPageSchema = z.object({
  data: z.array(productSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    itemCount: z.number(),
    pageCount: z.number(),
  }),
});
export type ProductPage = z.infer<typeof productPageSchema>;
