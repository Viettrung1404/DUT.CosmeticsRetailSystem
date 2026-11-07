/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapApiProductToFrontend(apiProduct: any) {
  // Safe format ingredients (could be string[] or object[])
  const rawIngredients = Array.isArray(apiProduct.ingredients) ? apiProduct.ingredients : [];
  const formattedIngredients: string[] = rawIngredients.map((item: any) => {
    if (typeof item === "string") return item;
    if (item && item.ingredientName) {
      let str = item.ingredientName;
      if (item.percentage) str += ` (${item.percentage})`;
      if (item.isKeyIngredient) str += " • Hoạt chất chính";
      return str;
    }
    return String(item);
  });

  return {
    id: apiProduct.id,
    slug: apiProduct.slug,
    name: apiProduct.name,
    sku: apiProduct.sku,
    category: apiProduct.categoryName || "Danh mục",
    categorySlug: apiProduct.categoryName ? apiProduct.categoryName.toLowerCase().replace(/\s+/g, '-') : 'skin-care',
    brand: apiProduct.brandName || "GlowUp",
    price: apiProduct.salePrice || apiProduct.basePrice || 0,
    originalPrice: apiProduct.basePrice || 0,
    rating: apiProduct.avgRating || 5,
    reviews: apiProduct.totalReviews || 0,
    totalSold: apiProduct.totalSold || 0,
    badge: apiProduct.isFeatured ? "Bestseller" : undefined,
    stockStatus: "Còn hàng" as const,
    description: apiProduct.description || "",
    shortDescription: apiProduct.shortDescription || "",
    ingredients: formattedIngredients,
    rawIngredients: rawIngredients,
    tags: apiProduct.tags || [],
    option1Name: apiProduct.option1Name || "Phân loại",
    option2Name: apiProduct.option2Name,
    gallery: (apiProduct.images && apiProduct.images.length > 0)
      ? apiProduct.images.map((img: any) => {
          const url = img.imageUrl || "";
          return url.includes("photo-1608248597359-5970377ebff2")
            ? "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800"
            : url;
        })
      : [
          apiProduct.primaryImage?.includes("photo-1608248597359-5970377ebff2")
            ? "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800"
            : (apiProduct.primaryImage || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80")
        ],
    variants: Array.isArray(apiProduct.variants)
      ? apiProduct.variants.map((v: any) => ({
          id: v.id,
          name: apiProduct.option1Name || "Phân loại",
          label: v.option1Value || v.sku,
          option1Value: v.option1Value,
          option2Value: v.option2Value,
          price: v.price || apiProduct.salePrice || apiProduct.basePrice || 0,
          costPrice: v.costPrice,
          stock: v.stockQuantity !== undefined ? v.stockQuantity : 100,
          stockQuantity: v.stockQuantity !== undefined ? v.stockQuantity : 100,
          sku: v.sku,
          isActive: v.isActive ?? true,
        }))
      : []
  };
}

