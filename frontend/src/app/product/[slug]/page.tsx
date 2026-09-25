import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, products } from "@/data/mockCatalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = products.filter((item) => item.categorySlug === product.categorySlug && item.slug !== product.slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-rose-500">Trang chủ</Link>
        <span>/</span>
        <Link href={`/category/${product.categorySlug}`} className="hover:text-rose-500">{product.category}</Link>
        <span>/</span>
        <span className="font-medium text-gray-700">{product.name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <Image src={product.gallery[0]} alt={product.name} width={1200} height={900} className="h-[520px] w-full object-cover" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {product.gallery.map((image, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-1">
                <Image src={image} alt={`${product.name} ${index + 1}`} width={800} height={600} className="h-28 w-full rounded-xl object-cover" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-600">{product.badge}</span>
            <span className="text-sm font-medium text-gray-500">{product.brand}</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
              <span className="text-yellow-500">★</span>
              <span className="font-semibold text-gray-800">{product.rating}</span>
              <span>({product.reviews} đánh giá)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-rose-500">{product.price.toLocaleString("vi-VN")}đ</span>
            <span className="text-lg text-gray-400 line-through">{product.originalPrice.toLocaleString("vi-VN")}đ</span>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Tình trạng:</p>
            <p className="mt-1 text-emerald-600">{product.stockStatus}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Biến thể</h2>
            <div className="flex flex-wrap gap-3">
              {product.variants.map((variant) => (
                <button key={variant.sku} className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-rose-400 hover:text-rose-500">
                  {variant.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 rounded-full bg-gray-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-rose-500">Thêm vào giỏ</button>
            <button className="rounded-full border border-gray-300 px-5 py-3 text-base font-semibold text-gray-700 transition hover:border-rose-400 hover:text-rose-500">Yêu thích</button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Mô tả sản phẩm</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">{product.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-bold text-gray-900">Thông tin chi tiết</h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-800">Thành phần</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {product.ingredients.map((ingredient) => (
                  <li key={ingredient} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-800">Tag</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">Sản phẩm liên quan</h2>
          <div className="space-y-4">
            {relatedProducts.map((item) => (
              <Link key={item.id} href={`/product/${item.slug}`} className="flex gap-3 rounded-2xl border border-gray-200 p-2 transition hover:border-rose-300">
                <Image src={item.gallery[0]} alt={item.name} width={100} height={100} className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.brand}</p>
                  <p className="mt-2 text-sm font-bold text-rose-500">{item.price.toLocaleString("vi-VN")}đ</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
