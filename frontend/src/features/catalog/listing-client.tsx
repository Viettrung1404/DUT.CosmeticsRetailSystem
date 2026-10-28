"use client";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { readBff } from "@/shared/api/browser";
import { productPageSchema, type ProductPage } from "./contracts";
import { ProductGrid } from "./components";
import { filtersFromSearch, filtersToSearch, type ProductFilters } from "./filters";
import type { Category } from "./server";

type Facets = {
  categories: { id: string; count: number }[];
  brands: { id: string; name: string; count: number }[];
  tags: { name: string; count: number }[];
};
type Props = {
  base: string;
  categoryId?: string;
  categories?: Category[];
  facets: Facets | null;
  initialFilters: ProductFilters;
  initialResult: ProductPage;
};
const skinTag = /da khô|da dầu|da nhạy cảm|da hỗn hợp|da thường|mọi loại da|mụn|lão hóa/i;

export function CatalogListingClient({
  base,
  categoryId,
  categories,
  facets,
  initialFilters,
  initialResult,
}: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [priceDraft, setPriceDraft] = useState({
    min: String(initialFilters.minPrice ?? ""),
    max: String(initialFilters.maxPrice ?? ""),
  });
  const key = filtersToSearch(filters).toString();
  const initialKey = filtersToSearch(initialFilters).toString();
  const result = useQuery({
    queryKey: ["catalog-list", categoryId, key],
    queryFn: ({ signal }) => {
      const params = filtersToSearch(filters);
      if (categoryId) params.set("categoryId", categoryId);
      return readBff(`/api/catalog/products?${params}`, productPageSchema, signal);
    },
    initialData: key === initialKey ? initialResult : undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  useEffect(() => {
    const onPopState = () => {
      const next = filtersFromSearch(new URLSearchParams(window.location.search));
      setFilters(next);
      setPriceDraft({ min: String(next.minPrice ?? ""), max: String(next.maxPrice ?? "") });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  function update(next: ProductFilters) {
    const normalized = { ...next, page: 1 };
    setFilters(normalized);
    const search = filtersToSearch(normalized).toString();
    window.history.pushState(null, "", `${base}${search ? `?${search}` : ""}`);
  }
  function page(number: number) {
    const next = { ...filters, page: number };
    setFilters(next);
    const search = filtersToSearch(next).toString();
    window.history.pushState(null, "", `${base}${search ? `?${search}` : ""}`);
    document
      .querySelector(".catalog-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function toggle(field: "brandIds" | "tags", value: string, checked: boolean) {
    const current = filters[field] || [];
    update({
      ...filters,
      [field]: checked ? [...current, value] : current.filter((item) => item !== value),
    });
  }
  const brands = new Set(filters.brandIds);
  const tags = new Set(filters.tags);
  const skinTags = facets?.tags.filter((item) => skinTag.test(item.name)).slice(0, 12) || [];
  const data = result.data;
  return (
    <div className="catalog-layout">
      <aside className="catalog-filters">
        <h2>Bộ lọc sản phẩm</h2>
        {categories && (
          <div className="filter-group">
            <h3>Danh mục</h3>
            {categories.map((item) => (
              <Link key={item.id} href={`/categories/${item.slug}`}>
                {item.name}
                {facets?.categories.find((facet) => facet.id === item.id)?.count !== undefined
                  ? ` (${facets.categories.find((facet) => facet.id === item.id)?.count})`
                  : ""}
              </Link>
            ))}
          </div>
        )}
        {facets && (
          <fieldset className="filter-checks filter-group">
            <legend>Thương hiệu</legend>
            {facets.brands.slice(0, 15).map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={brands.has(item.id)}
                  onChange={(event) => toggle("brandIds", item.id, event.target.checked)}
                />
                {item.name} <small>({item.count})</small>
              </label>
            ))}
          </fieldset>
        )}
        {skinTags.length > 0 && (
          <fieldset className="filter-checks filter-group">
            <legend>Tình trạng da</legend>
            {skinTags.map((item) => (
              <label key={item.name}>
                <input
                  type="checkbox"
                  checked={tags.has(item.name)}
                  onChange={(event) => toggle("tags", item.name, event.target.checked)}
                />
                {item.name} <small>({item.count})</small>
              </label>
            ))}
          </fieldset>
        )}
        <form
          className="filter-group"
          onSubmit={(event) => {
            event.preventDefault();
            const min = Number(priceDraft.min);
            const max = Number(priceDraft.max);
            update({
              ...filters,
              minPrice: priceDraft.min && min >= 0 ? min : undefined,
              maxPrice: priceDraft.max && max >= min ? max : undefined,
            });
          }}
        >
          <h3>Khoảng giá</h3>
          <div className="price-inputs">
            <input
              aria-label="Giá từ"
              type="number"
              min="0"
              value={priceDraft.min}
              onChange={(event) =>
                setPriceDraft((draft) => ({ ...draft, min: event.target.value }))
              }
              placeholder="Từ"
            />
            <input
              aria-label="Giá đến"
              type="number"
              min="0"
              value={priceDraft.max}
              onChange={(event) =>
                setPriceDraft((draft) => ({ ...draft, max: event.target.value }))
              }
              placeholder="Đến"
            />
          </div>
          <button className="button" type="submit">
            Áp dụng giá
          </button>
        </form>
        <div className="filter-group">
          <h3>Đánh giá</h3>
          <select
            aria-label="Đánh giá tối thiểu"
            value={filters.rating || ""}
            onChange={(event) =>
              update({
                ...filters,
                rating: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          >
            <option value="">Tất cả</option>
            {[4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                Từ {value} sao
              </option>
            ))}
          </select>
          <button
            className="filter-reset"
            type="button"
            onClick={() => {
              setPriceDraft({ min: "", max: "" });
              update({
                q: filters.q,
                tag: filters.tag,
                brandId: filters.brandId,
                categoryId,
                sortBy: "newest",
                limit: 20,
              });
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </aside>
      <section
        className="catalog-results"
        aria-label="Kết quả sản phẩm"
        aria-busy={result.isFetching}
      >
        <div className="catalog-sort">
          <span>{data?.meta.itemCount ?? 0} sản phẩm phù hợp</span>
          <label>
            Sắp xếp{" "}
            <select
              value={filters.sortBy || "newest"}
              onChange={(event) => update({ ...filters, sortBy: event.target.value })}
            >
              <option value="newest">Mới nhất</option>
              <option value="bestseller">Bán chạy</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao</option>
            </select>
          </label>
        </div>
        <div className="catalog-results-body">
          {result.isFetching && (
            <div className="catalog-loading" role="status">
              Đang cập nhật sản phẩm…
            </div>
          )}
          {result.isError ? (
            <div className="catalog-empty">
              Không tải được sản phẩm.{" "}
              <button type="button" onClick={() => result.refetch()}>
                Thử lại
              </button>
            </div>
          ) : (
            <ProductGrid products={data?.data || []} />
          )}
        </div>
        {!!data && data.meta.pageCount > 1 && (
          <nav aria-label="Phân trang" className="catalog-pagination">
            <button
              type="button"
              disabled={filters.page === 1 || result.isFetching}
              onClick={() => page((filters.page || 1) - 1)}
            >
              ← Trước
            </button>
            <span>
              Trang {filters.page || 1} / {data.meta.pageCount}
            </span>
            <button
              type="button"
              disabled={(filters.page || 1) >= data.meta.pageCount || result.isFetching}
              onClick={() => page((filters.page || 1) + 1)}
            >
              Sau →
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
