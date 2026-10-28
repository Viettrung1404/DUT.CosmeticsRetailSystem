import { z } from "zod";
export const cartSchema = z.object({
  id: z.string(),
  totalQuantity: z.number(),
  subtotal: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      productVariantId: z.string(),
      productName: z.string().optional(),
      variantName: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      quantity: z.number(),
      currentPrice: z.number(),
      totalPrice: z.number(),
      isAvailable: z.boolean(),
    }),
  ),
});
