import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/data/mockCatalog";
import { mapApiProductToFrontend } from "@/utils/mapProduct";
import { customerService } from "@/services";
import { routing } from "@/i18n/routing";
import ProductDetailView from "./ProductDetailView";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({ locale, slug: product.slug }))
  );
}

export default async function ProductDetailPage({ 
  params 
}: { 
  params: { locale: string; slug: string } | Promise<{ locale: string; slug: string }> 
}) {
  const resolvedParams = await Promise.resolve(params);
  const slug = decodeURIComponent(resolvedParams?.slug || "");
  let product: any = null;
  let relatedProducts: any[] = [];

  // 1. Fetch real product details from Backend NestJS API via customerService
  try {
    const res = await customerService.getProductBySlug(slug);
    if (res && res.data) {
      product = mapApiProductToFrontend(res.data);

      // 2. Fetch related products from backend
      try {
        const relatedRes = await customerService.getRelatedProducts(res.data.id, 4);
        if (relatedRes && Array.isArray(relatedRes.data)) {
          relatedProducts = relatedRes.data.map(mapApiProductToFrontend);
        }
      } catch (err) {
        console.warn("Failed to fetch related products from backend:", err);
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch real product for slug "${slug}":`, error);
  }

  // Fallback to mock data if not found in DB
  if (!product) {
    const mockProd = getProductBySlug(slug);
    if (mockProd) {
      product = {
        ...mockProd,
        sku: "GLW-MOCK-01",
        shortDescription: mockProd.description?.slice(0, 120),
        rawIngredients: mockProd.ingredients?.map((name) => ({
          ingredientName: name,
          isKeyIngredient: true,
        })),
        variants: mockProd.variants?.map((v) => ({
          ...v,
          stockQuantity: 100,
          isActive: true,
        })) || [],
      };

      relatedProducts = products
        .filter((item) => item.categorySlug === product.categorySlug && item.slug !== product.slug)
        .slice(0, 3);
    }
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailView product={product} relatedProducts={relatedProducts} />;
}
