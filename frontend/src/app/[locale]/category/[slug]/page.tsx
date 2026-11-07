import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import ProductCard from "@/components/ProductCard";
import { categories as mockCategories, getProductsByCategory } from "@/data/mockCatalog";
import { mapApiProductToFrontend } from "@/utils/mapProduct";
import { customerService } from "@/services";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    mockCategories.map((category) => ({ locale, slug: category.slug }))
  );
}

export default async function CategoryPage({ 
  params 
}: { 
  params: { locale: string; slug: string } 
}) {
  const category = mockCategories.find((item) => item.slug === params.slug);
  let categoryProducts: any[] = getProductsByCategory(params.slug);

  try {
    const res = await customerService.getProducts({
      search: params.slug,
      limit: 20,
    });
    if (res && res.data && res.data.data && res.data.data.length > 0) {
      categoryProducts = res.data.data.map(mapApiProductToFrontend);
    }
  } catch (error) {
    console.warn(`Failed to fetch API products for category ${params.slug}:`, error);
  }

  if (!category && categoryProducts.length === 0) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2 text-xs uppercase tracking-wider text-text-secondary">
          <Link href="/" className="hover:text-primary-rose transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary-rose transition-colors">Categories</Link>
          <span>/</span>
          <span className="font-medium text-text-primary">{category?.name || params.slug}</span>
        </div>

        <div className="mb-12 rounded-[24px] border border-nude/40 bg-surface p-10 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-rose">Category</p>
          <h1 className="mt-4 text-3xl font-bold text-text-primary md:text-5xl">{category?.name || params.slug}</h1>
          {category?.description && (
            <p className="mx-auto mt-4 max-w-2xl text-text-secondary">{category.description}</p>
          )}
        </div>

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {categoryProducts.length > 0 ? (
            categoryProducts.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-nude/60 bg-surface p-12 text-center text-text-secondary">
              Chưa có sản phẩm nào trong danh mục này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
