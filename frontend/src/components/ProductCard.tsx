import Image from "next/image";
import Link from "next/link";
import { Product } from "@/data/mockCatalog";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden">
          <Image
            src={product.gallery[0]}
            alt={product.name}
            width={800}
            height={640}
            className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white">{product.badge}</span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{product.brand}</span>
          <span>{product.stockStatus}</span>
        </div>
        <Link href={`/product/${product.slug}`} className="block text-lg font-semibold text-gray-900 hover:text-rose-500">
          {product.name}
        </Link>
        <div className="flex items-center gap-2 text-sm text-yellow-500">
          <span>★</span>
          <span className="font-medium text-gray-700">{product.rating}</span>
          <span className="text-gray-400">({product.reviews} đánh giá)</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold text-rose-500">{product.price.toLocaleString("vi-VN")}đ</span>
            <span className="ml-2 text-sm text-gray-400 line-through">{product.originalPrice.toLocaleString("vi-VN")}đ</span>
          </div>
          <Link href={`/product/${product.slug}`} className="rounded-full bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500">
            Mua ngay
          </Link>
        </div>
      </div>
    </article>
  );
}
