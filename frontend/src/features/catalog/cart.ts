import { z } from "zod";
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined)
  .optional();

export const cartSchema = z.object({
  id: z.string(),
  totalQuantity: z.number(),
  subtotal: z.number(),
  selectedQuantity: z.number().default(0),
  selectedSubtotal: z.number().default(0),
  hasPriceChanges: z.boolean().default(false),
  items: z.array(
    z.object({
      id: z.string(),
      productVariantId: z.string(),
      productId: optionalText,
      productSlug: optionalText,
      productName: optionalText,
      variantName: optionalText,
      thumbnailUrl: optionalText,
      quantity: z.number(),
      currentPrice: z.number(),
      totalPrice: z.number(),
      isAvailable: z.boolean(),
      isSelected: z.boolean().default(true),
      priceChanged: z.boolean().default(false),
      isQuantityExceeded: z.boolean().default(false),
    }),
  ),
  unavailableItems: z
    .array(
      z.object({
        id: z.string(),
        productVariantId: z.string(),
        productSlug: optionalText,
        productName: optionalText,
        variantName: optionalText,
        thumbnailUrl: optionalText,
        quantity: z.number(),
        currentPrice: z.number(),
        totalPrice: z.number(),
        isAvailable: z.boolean(),
        isSelected: z.boolean().default(true),
        priceChanged: z.boolean().default(false),
        isQuantityExceeded: z.boolean().default(false),
      }),
    )
    .default([]),
});
