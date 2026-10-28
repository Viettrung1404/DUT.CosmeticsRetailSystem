import "server-only";
import { z } from "zod";
import { getServerEnv } from "@/shared/config/env";
import { readApiResponse } from "@/shared/api/response";
import { fetchWithTimeout } from "@/shared/api/transport";
import { productSchema, productPageSchema } from "./contracts";
import { searchHintsSchema } from "./search-hints";
export type { Product, ProductPage } from "./contracts";

const money = z.union([z.number(), z.string()]).transform(Number);
export const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    imageUrl: z.string().nullable().optional(),
    children: z.array(categorySchema),
  }),
);
export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  children: Category[];
}
const bannerSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    imageUrl: z.string(),
    linkUrl: z.string().nullable().optional(),
    position: z.string(),
  }),
);
const postSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      excerpt: z.string().nullable().optional(),
      featuredImage: z.string().nullable().optional(),
      publishedAt: z.string().nullable().optional(),
      category: z.object({ name: z.string() }).nullable().optional(),
    }),
  ),
  total: z.number(),
});
const blogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});
const brandSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logoUrl: z.string().nullable().optional(),
  }),
);
const reviewsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      rating: z.number(),
      title: z.string().nullable().optional(),
      content: z.string().nullable().optional(),
      reviewerName: z.string().nullable().optional(),
      createdAt: z.string(),
    }),
  ),
  total: z.number(),
  avgRating: z.number(),
  histogram: z.record(z.string(), z.number()),
});
const facetsSchema = z.object({
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string(), count: z.number() }),
  ),
  brands: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string(), count: z.number() }),
  ),
  tags: z.array(z.object({ name: z.string(), count: z.number() })),
});
const availabilitySchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    available: z.number(),
  }),
);
export const tryOnColorsSchema = z.array(
  z.object({ variantId: z.string(), label: z.string(), colorHex: z.string().nullable() }),
);
const flashCardsSchema = z.array(
  z.object({
    promotionId: z.string(),
    promotionName: z.string(),
    endDate: z.string(),
    conditional: z.boolean(),
    remaining: z.number(),
    variantId: z.string(),
    productId: z.string(),
    name: z.string(),
    slug: z.string(),
    brandName: z.string().nullable(),
    imageUrl: z.string().nullable(),
    originalPrice: money,
    effectivePrice: money,
  }),
);
export const suggestionsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    imageUrl: z.string().nullable().optional(),
    price: money,
  }),
);
export type FlashCard = z.infer<typeof flashCardsSchema>[number];

async function request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const env = getServerEnv();
  const response = await fetchWithTimeout(
    `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}${path}`,
    { headers: { Accept: "application/json", "X-Request-Id": crypto.randomUUID() } },
    env.BACKEND_TIMEOUT_MS,
  );
  return (await readApiResponse(response, schema)).data;
}
export interface ProductFilters {
  q?: string;
  categoryId?: string;
  brandId?: string;
  categoryIds?: string[];
  brandIds?: string[];
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  tag?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}
export function getProducts(filters: ProductFilters = {}) {
  const { q, ...rest } = filters;
  const params = new URLSearchParams();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  if (q) params.set("q", q);
  return request(`/customer/products${q ? "/search" : ""}?${params}`, productPageSchema);
}
export const getProduct = (slug: string) =>
  request(`/customer/products/${encodeURIComponent(slug)}`, productSchema);
export const getRelated = (id: string) =>
  request(`/customer/products/${encodeURIComponent(id)}/related?limit=4`, z.array(productSchema));
export const getCategories = () => request("/categories/tree", z.array(categorySchema));
export const getBanners = (position: string) =>
  request(`/banners?position=${encodeURIComponent(position)}`, bannerSchema);
export const getPosts = () => request("/blog/posts?page=1&limit=3", postSchema);
export const getBlogPosts = (page = 1) => request(`/blog/posts?page=${page}&limit=12`, postSchema);
export const getBlogPost = (slug: string) =>
  request(`/blog/posts/${encodeURIComponent(slug)}`, blogPostSchema);
export const getBrands = (limit = 8) =>
  request(`/brands?limit=${Math.min(Math.max(limit, 1), 100)}`, brandSchema);
export const getReviews = (id: string, page = 1) =>
  request(
    `/customer/products/${encodeURIComponent(id)}/reviews?page=${page}&limit=5`,
    reviewsSchema,
  );
export const getFlashCards = () =>
  request("/promotions/flash-sale/cards?limit=5", flashCardsSchema);
export const getFacets = () => request("/customer/products/facets", facetsSchema);
export const getAvailability = (productId: string, variantId: string) =>
  request(
    `/customer/products/${encodeURIComponent(productId)}/availability?variantId=${encodeURIComponent(variantId)}`,
    availabilitySchema,
  );
export const getTryOnColors = (productId: string) =>
  request(`/customer/products/${encodeURIComponent(productId)}/try-on`, tryOnColorsSchema);
export const getSuggestions = (query: string) =>
  request(`/customer/products/suggest?q=${encodeURIComponent(query)}&limit=6`, suggestionsSchema);
export const getSearchHints = (query: string) =>
  request(
    `/customer/products/search-hints?q=${encodeURIComponent(query)}&limit=5`,
    searchHintsSchema,
  );
export function findCategory(nodes: Category[], slug: string): Category | undefined {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findCategory(node.children, slug);
    if (child) return child;
  }
}
