import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { categories, getProductsByCategory } from "@/data/mockCatalog";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = categories.find((item) => item.slug === params.slug);

  if (!category) {
    notFound();
  }

  const products = getProductsByCategory(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-rose-500">Trang chủ</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">{category.name}</span>
      </div>

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-100">Danh mục</p>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">{category.name}</h1>
        <p className="mt-3 max-w-2xl text-violet-50">{category.description}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {products.length > 0 ? (
          products.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
            Chưa có sản phẩm trong danh mục này.
          </div>
        )}
      </div>
    </div>
  );
}
