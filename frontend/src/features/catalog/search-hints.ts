import { z } from "zod";
export const searchHintsSchema = z.object({
  keywords: z.array(z.string()),
  brands: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  products: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      imageUrl: z.string().nullable().optional(),
      price: z.number(),
    }),
  ),
});
export type SearchHints = z.infer<typeof searchHintsSchema>;
