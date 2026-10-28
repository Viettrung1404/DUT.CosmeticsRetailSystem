export interface ListingParams {
  page?: string;
  sortBy?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  q?: string;
  tag?: string;
  brandId?: string;
  brandIds?: string | string[];
  tags?: string | string[];
}
export interface ProductFilters {
  q?: string;
  categoryId?: string;
  brandId?: string;
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
const sorts = ["newest", "bestseller", "price_asc", "price_desc", "rating"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asList = (value?: string | string[]) =>
  (Array.isArray(value) ? value : [value || ""])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
export function parseListingParams(params: ListingParams): ProductFilters {
  const parse = (value: string | undefined, max: number) =>
    value && /^\d+$/.test(value) && Number(value) <= max ? Number(value) : undefined;
  const minPrice = parse(params.minPrice, 100000000);
  const maxPrice = parse(params.maxPrice, 100000000);
  return {
    page: Math.max(1, parse(params.page, 10000) || 1),
    limit: 20,
    sortBy: sorts.includes(params.sortBy || "") ? params.sortBy : "newest",
    minPrice,
    maxPrice:
      maxPrice !== undefined && (minPrice === undefined || maxPrice >= minPrice)
        ? maxPrice
        : undefined,
    rating: parse(params.rating, 5),
    q: params.q?.trim().slice(0, 200) || undefined,
    tag: params.tag?.trim().slice(0, 100) || undefined,
    brandId: params.brandId && uuid.test(params.brandId) ? params.brandId : undefined,
    brandIds: asList(params.brandIds)
      .filter((id) => uuid.test(id))
      .slice(0, 20),
    tags: asList(params.tags).slice(0, 10),
  };
}
export function filtersFromSearch(search: URLSearchParams) {
  return parseListingParams({
    page: search.get("page") || undefined,
    sortBy: search.get("sortBy") || undefined,
    minPrice: search.get("minPrice") || undefined,
    maxPrice: search.get("maxPrice") || undefined,
    rating: search.get("rating") || undefined,
    q: search.get("q") || undefined,
    tag: search.get("tag") || undefined,
    brandId: search.get("brandId") || undefined,
    brandIds: search.getAll("brandIds"),
    tags: search.getAll("tags"),
  });
}
export function filtersToSearch(filters: ProductFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (
      key === "limit" ||
      key === "categoryId" ||
      value == null ||
      value === "" ||
      Array.isArray(value)
    )
      return;
    if (key === "page" && value === 1) return;
    params.set(key, String(value));
  });
  filters.brandIds?.forEach((id) => params.append("brandIds", id));
  filters.tags?.forEach((tag) => params.append("tags", tag));
  return params;
}
