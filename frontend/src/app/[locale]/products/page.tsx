"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import ProductCard from "@/components/ProductCard";
import { customerService } from "@/services";
import type { Product, CategoryTreeItem } from "@/types/api";
import { categories as mockCategories, products as mockProducts } from "@/data/mockCatalog";
import { Loader2, AlertCircle, RefreshCw, Filter, ArrowUpDown } from "lucide-react";

export default function ProductsPage() {
  const tProd = useTranslations("product");
  const tCommon = useTranslations("common");
  const { formatPrice } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter & Sort State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number } | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Fetch Category Tree
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await customerService.getCategoryTree();
        if (res.data && res.data.length > 0) {
          setCategories(res.data);
        }
      } catch (err) {
        console.warn("[ProductsPage] Failed to fetch category tree, using fallback", err);
      }
    }
    loadCategories();
  }, []);

  // Fetch Products from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customerService.getProducts({
        page,
        limit: 12,
        categoryId: selectedCategoryId || undefined,
        minPrice: priceRange?.min,
        maxPrice: priceRange?.max,
        sortBy,
        sortOrder,
      });

      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const total = res.data?.total || res.data?.meta?.total || list.length;

      if (list.length > 0) {
        setProducts(list);
        setTotalCount(total);
      } else {
        // If API returns empty or offline, fallback to mock products for smooth preview
        setProducts(mockProducts as unknown as Product[]);
        setTotalCount(mockProducts.length);
      }
    } catch (err: unknown) {
      console.warn("[ProductsPage] Backend API error, displaying offline catalog", err);
      setError(tCommon("error"));
      setProducts(mockProducts as unknown as Product[]);
      setTotalCount(mockProducts.length);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategoryId, priceRange, sortBy, sortOrder, tCommon]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Banner Khám Phá Sản Phẩm */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#044a36] via-[#065f46] to-[#0a6c50] p-8 text-white shadow-lg relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-[#FFA6C9]/20 blur-3xl" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FFA6C9] font-poppins">GlowUp Swiss Catalog</p>
        <h1 className="text-3xl font-bold font-serif md:text-5xl">{tProd("catalogTitle")}</h1>
        <p className="max-w-2xl text-base text-emerald-100 font-light font-poppins">
          {tProd("catalogSubtitle")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar Bộ Lọc Danh Mục & Giá */}
        <aside className="rounded-3xl border border-[#F3E5E8] bg-white p-5 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F8EAED]">
            <Filter className="h-4 w-4 text-[#065F46]" />
            <h2 className="text-base font-bold text-[#211A1C] font-poppins">{tProd("filterByCategory")}</h2>
          </div>

          <div className="space-y-1.5 font-poppins text-sm">
            <button
              onClick={() => { setSelectedCategoryId(""); setPage(1); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between ${
                selectedCategoryId === ""
                  ? "bg-[#FEF0F3] text-[#DE5D83] font-bold"
                  : "text-[#766970] hover:bg-gray-50 hover:text-[#211A1C]"
              }`}
            >
              <span>{tProd("allCategories")}</span>
            </button>

            {categories.length > 0 ? (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryId(cat.id); setPage(1); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between ${
                    selectedCategoryId === cat.id
                      ? "bg-[#FEF0F3] text-[#DE5D83] font-bold"
                      : "text-[#766970] hover:bg-gray-50 hover:text-[#211A1C]"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))
            ) : (
              mockCategories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => { setSelectedCategoryId(cat.slug); setPage(1); }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-medium transition flex items-center justify-between ${
                    selectedCategoryId === cat.slug
                      ? "bg-[#FEF0F3] text-[#DE5D83] font-bold"
                      : "text-[#766970] hover:bg-gray-50 hover:text-[#211A1C]"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Lọc theo khoảng giá */}
          <div className="mt-8 pt-5 border-t border-[#F8EAED]">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#766970] font-poppins">{tProd("filterByPrice")}</h3>
            <div className="space-y-1.5 text-xs font-poppins">
              <button
                onClick={() => { setPriceRange(null); setPage(1); }}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                  priceRange === null ? "bg-[#065F46] text-white font-bold" : "bg-[#F8EAED]/50 text-[#4B5563] hover:bg-[#F8EAED]"
                }`}
              >
                {tProd("allPrices")}
              </button>
              <button
                onClick={() => { setPriceRange({ max: 300000 }); setPage(1); }}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                  priceRange?.max === 300000 ? "bg-[#065F46] text-white font-bold" : "bg-[#F8EAED]/50 text-[#4B5563] hover:bg-[#F8EAED]"
                }`}
              >
                {tProd("under300k")}
              </button>
              <button
                onClick={() => { setPriceRange({ min: 300000, max: 600000 }); setPage(1); }}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                  priceRange?.min === 300000 && priceRange?.max === 600000 ? "bg-[#065F46] text-white font-bold" : "bg-[#F8EAED]/50 text-[#4B5563] hover:bg-[#F8EAED]"
                }`}
              >
                {tProd("from300kTo600k")}
              </button>
              <button
                onClick={() => { setPriceRange({ min: 600000, max: 900000 }); setPage(1); }}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                  priceRange?.min === 600000 && priceRange?.max === 900000 ? "bg-[#065F46] text-white font-bold" : "bg-[#F8EAED]/50 text-[#4B5563] hover:bg-[#F8EAED]"
                }`}
              >
                {tProd("from600kTo900k")}
              </button>
              <button
                onClick={() => { setPriceRange({ min: 900000 }); setPage(1); }}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${
                  priceRange?.min === 900000 && !priceRange?.max ? "bg-[#065F46] text-white font-bold" : "bg-[#F8EAED]/50 text-[#4B5563] hover:bg-[#F8EAED]"
                }`}
              >
                {tProd("over900k")}
              </button>
            </div>
          </div>
        </aside>

        {/* Nội dung danh sách sản phẩm */}
        <section>
          {/* Header thanh lọc & sắp xếp */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-[#F3E5E8] shadow-2xs font-poppins">
            <p className="text-xs sm:text-sm text-[#766970] font-medium">
              {tProd("showingProducts", { count: products.length, total: totalCount })}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#766970] flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#065F46]" /> {tProd("sortBy")}:
              </span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order as "asc" | "desc");
                  setPage(1);
                }}
                className="rounded-xl border border-[#F3E5E8] bg-white px-3 py-2 text-xs font-semibold text-[#211A1C] outline-none focus:border-[#065F46] cursor-pointer"
              >
                <option value="createdAt-desc">{tProd("sortNewest")}</option>
                <option value="basePrice-asc">{tProd("sortPriceAsc")}</option>
                <option value="basePrice-desc">{tProd("sortPriceDesc")}</option>
                <option value="avgRating-desc">{tProd("sortRating")}</option>
                <option value="totalSold-desc">{tProd("sortBestseller")}</option>
              </select>
            </div>
          </div>

          {/* Thông báo lỗi & fallback nếu có */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-800 text-xs font-poppins">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchProducts()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition active:scale-95"
              >
                <RefreshCw className="h-3 w-3" /> {tCommon("retry")}
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-3xl bg-white p-4 border border-gray-100 shadow-xs">
                  <div className="aspect-[4/5] rounded-2xl bg-gray-200 mb-4" />
                  <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-full bg-gray-200 rounded mb-3" />
                  <div className="h-5 w-28 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
              <p className="text-gray-500 font-poppins text-sm mb-4">{tProd("noProductsFound")}</p>
              <button
                onClick={() => { setSelectedCategoryId(""); setPriceRange(null); setPage(1); }}
                className="px-5 py-2.5 rounded-full bg-[#065F46] text-white font-bold text-xs uppercase tracking-wider font-poppins shadow-sm"
              >
                {tProd("clearFilters")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
