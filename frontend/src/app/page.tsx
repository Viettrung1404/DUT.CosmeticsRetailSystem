import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { categories, products } from "@/data/mockCatalog";

export default function Home() {
  return (
    <main className="bg-gray-50">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[32px] bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 p-8 text-white shadow-xl md:grid-cols-[1.2fr_0.8fr] md:p-12">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-rose-100">GlowUp Beauty</p>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">Mỹ phẩm chất lượng cho làn da rạng ngời</h1>
            <p className="mt-5 max-w-xl text-base text-rose-50 md:text-lg">
              Khám phá bộ sưu tập chăm sóc da, trang điểm và làm đẹp được yêu thích nhất với ưu đãi lên đến 50%.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products" className="rounded-full bg-white px-6 py-3 font-semibold text-rose-600 transition hover:bg-rose-50">Mua ngay</Link>
              <Link href="/register" className="rounded-full border border-white/70 px-6 py-3 font-semibold text-white transition hover:bg-white/10">Tạo tài khoản</Link>
            </div>
          </div>

          <div className="rounded-[28px] bg-white/10 p-4 backdrop-blur-sm">
            <Image
              src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80"
              alt="Beauty products"
              width={900}
              height={900}
              className="h-full min-h-[300px] w-full rounded-[22px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Danh mục nổi bật</h2>
          <Link href="/products" className="text-sm font-semibold text-rose-500 hover:text-rose-600">Xem tất cả</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`} className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className={`mb-4 rounded-2xl bg-gradient-to-r ${category.accent} p-4 text-xl font-bold text-white`}>
                {category.name}
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm đang hot</h2>
          <Link href="/products" className="text-sm font-semibold text-rose-500 hover:text-rose-600">Xem thêm</Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}