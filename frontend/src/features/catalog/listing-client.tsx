"use client";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
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
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [draftBrandIds, setDraftBrandIds] = useState<Set<string>>(new Set());

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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
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

  useEffect(() => {
    if (!brandModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBrandModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [brandModalOpen]);

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
  function toggle(field: "brandIds", value: string, checked: boolean) {
    const current = filters[field] || [];
    update({
      ...filters,
      [field]: checked ? [...current, value] : current.filter((item) => item !== value),
    });
  }

  function openBrandModal() {
    setDraftBrandIds(new Set(filters.brandIds || []));
    setBrandSearch("");
    setBrandModalOpen(true);
  }

  function applyBrandModal() {
    update({
      ...filters,
      brandIds: Array.from(draftBrandIds),
    });
    setBrandModalOpen(false);
  }

  function toggleDraftBrand(id: string, checked: boolean) {
    setDraftBrandIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function clearDraftBrands() {
    setDraftBrandIds(new Set());
  }

  const brands = new Set(filters.brandIds);
  const data = result.data;
  const brandList = facets?.brands.filter((item) => item.count > 0) || [];

  const displayedBrands = useMemo(() => {
    const top10 = brandList.slice(0, 10);
    const selectedBeyondTop10 = brandList.filter(
      (b) => brands.has(b.id) && !top10.some((t) => t.id === b.id),
    );
    return [...top10, ...selectedBeyondTop10];
  }, [brandList, brands]);

  const filteredModalBrands = useMemo(() => {
    if (!brandSearch.trim()) return brandList;
    const q = brandSearch.trim().toLowerCase();
    return brandList.filter((b) => b.name.toLowerCase().includes(q));
  }, [brandList, brandSearch]);

  return (
    <div className="catalog-layout">
      <aside className="catalog-filters">
        <h2>Bộ lọc sản phẩm</h2>
        {categories && categories.length > 0 && (
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
        {brandList.length > 0 && (
          <div className="filter-group">
            <fieldset className="filter-checks">
              <legend className="filter-legend-header">
                <span>Thương hiệu</span>
                <button
                  type="button"
                  className="filter-more-brands-btn"
                  onClick={openBrandModal}
                  aria-label="Xem tất cả thương hiệu"
                  title="Xem tất cả thương hiệu"
                >
                  <ChevronRight size={16} />
                </button>
              </legend>
              {displayedBrands.map((item) => (
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
          </div>
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
          <label htmlFor="catalog-sort-select">
            Sắp xếp{" "}
            <select
              id="catalog-sort-select"
              name="sortBy"
              aria-label="Sắp xếp sản phẩm"
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

      {brandModalOpen && (
        <div
          className="brand-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBrandModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className="brand-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-modal-title"
          >
            <div className="brand-modal-header">
              <h3 id="brand-modal-title">
                Tất cả thương hiệu
                <span className="brand-count-badge">{brandList.length}</span>
              </h3>
              <button
                type="button"
                className="brand-modal-close"
                onClick={() => setBrandModalOpen(false)}
                aria-label="Đóng popup thương hiệu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="brand-modal-toolbar">
              <div className="brand-modal-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thương hiệu..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  autoFocus
                />
                {brandSearch && (
                  <button
                    type="button"
                    className="brand-modal-search-clear"
                    onClick={() => setBrandSearch("")}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="brand-modal-actions">
                <span className="brand-modal-selected-text">
                  Đã chọn: <strong>{draftBrandIds.size}</strong> thương hiệu
                </span>
                {draftBrandIds.size > 0 && (
                  <button
                    type="button"
                    className="brand-modal-clear-btn"
                    onClick={clearDraftBrands}
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="brand-modal-body">
              {filteredModalBrands.length === 0 ? (
                <div className="brand-modal-empty">
                  Không tìm thấy thương hiệu phù hợp với &quot;{brandSearch}&quot;
                </div>
              ) : (
                <div className="brand-modal-grid">
                  {filteredModalBrands.map((item) => {
                    const isChecked = draftBrandIds.has(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`brand-modal-item ${isChecked ? "is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleDraftBrand(item.id, e.target.checked)}
                        />
                        <span className="brand-modal-item-name" title={item.name}>
                          {item.name}
                        </span>
                        <span className="brand-modal-item-count">({item.count})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="brand-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setBrandModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-apply"
                onClick={applyBrandModal}
              >
                Áp dụng {draftBrandIds.size > 0 ? `(${draftBrandIds.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
