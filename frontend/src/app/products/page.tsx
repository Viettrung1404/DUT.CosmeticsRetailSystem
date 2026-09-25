import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { categories, products } from "@/data/mockCatalog";

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 p-8 text-white shadow-lg">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-rose-100">GlowUp catalog</p>
        <h1 className="text-3xl font-bold md:text-5xl">Khám phá mỹ phẩm chăm sóc da & làm đẹp</h1>
        <p className="max-w-2xl text-base text-rose-50">
          Tất cả sản phẩm được tuyển chọn kỹ lưỡng, an toàn cho da và phù hợp với thói quen làm đẹp hằng ngày.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Danh mục</h2>
          <div className="space-y-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-rose-300 hover:text-rose-500"
              >
                <span>{category.name}</span>
                <span className="text-xs text-gray-400">›</span>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Khoảng giá</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <button className="block w-full rounded-lg bg-gray-100 px-3 py-2 text-left hover:bg-gray-200">Dưới 300k</button>
              <button className="block w-full rounded-lg bg-gray-100 px-3 py-2 text-left hover:bg-gray-200">300k - 600k</button>
              <button className="block w-full rounded-lg bg-gray-100 px-3 py-2 text-left hover:bg-gray-200">600k - 900k</button>
              <button className="block w-full rounded-lg bg-gray-100 px-3 py-2 text-left hover:bg-gray-200">Trên 900k</button>
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng cộng {products.length} sản phẩm</p>
            </div>
            <div className="flex items-center gap-3">
              <select className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-rose-400">
                <option>Mặc định</option>
                <option>Giá tăng dần</option>
                <option>Giá giảm dần</option>
                <option>Đánh giá cao</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
