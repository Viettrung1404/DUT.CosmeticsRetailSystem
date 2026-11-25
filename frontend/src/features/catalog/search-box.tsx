"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, Search, Clock, TrendingUp, X } from "lucide-react";
import { readBff } from "@/shared/api/browser";
import { formatPrice } from "./components";
import { searchHintsSchema, type SearchHints } from "./search-hints";

const empty: SearchHints = { keywords: [], brands: [], products: [] };
const hintsCache = new Map<string, SearchHints>();
const STORAGE_KEY = "glowup_web_search_history";

export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [hints, setHints] = useState<SearchHints>(empty);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([
    "Son thỏi",
    "Serum B5",
    "Kem chống nắng",
    "Nước tẩy trang",
    "Toner làm dịu da",
  ]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const query = value.trim();

  // 1. Tải lịch sử tìm kiếm từ localStorage & API
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSearches(parsed);
        }
      }
    } catch {}

    // Lấy thêm từ backend nếu có
    fetch("/api/catalog/search-history")
      .then((r) => r.json())
      .then((res) => {
        const history = res?.data?.history;
        if (Array.isArray(history) && history.length > 0) {
          const queries: string[] = history.map((item: any) => item.query || item).filter(Boolean);
          setRecentSearches((prev) => {
            const merged = Array.from(new Set([...queries, ...prev])).slice(0, 8);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
        const trending = res?.data?.trending;
        if (Array.isArray(trending) && trending.length > 0) {
          const tQueries: string[] = trending.map((item: any) => item.query || item).filter(Boolean);
          if (tQueries.length > 0) {
            setTrendingSearches(tQueries.slice(0, 6));
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveQueryToHistory = (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const updated = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Bắn API lưu vào database
    fetch("/api/catalog/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean }),
    }).catch(() => {});
  };

  const removeHistoryItem = (itemToRemove: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    fetch(`/api/catalog/search-history?query=${encodeURIComponent(itemToRemove)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const clearAllHistory = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    fetch("/api/catalog/search-history", { method: "DELETE" }).catch(() => {});
  };

  // Lọc lịch sử tìm kiếm nếu người dùng đang gõ
  const matchingHistory = useMemo(() => {
    if (!query) return recentSearches;
    return recentSearches.filter((item) =>
      item.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, recentSearches]);

  useEffect(() => {
    if (query.length < 1) {
      setHints(empty);
      setLoading(false);
      return;
    }

    if (hintsCache.has(query)) {
      setHints(hintsCache.get(query)!);
      setLoading(false);
      setOpen(true);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      readBff(
        `/api/catalog/search-hints?q=${encodeURIComponent(query)}`,
        searchHintsSchema,
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            hintsCache.set(query, result);
            setHints(result);
            setLoading(false);
            setOpen(true);
            setActive(-1);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Danh sách các options theo thứ tự
  const options = useMemo(() => {
    const list: Array<{
      kind: "history" | "keyword" | "brand" | "product" | "trending";
      label: string;
      href: string;
      price?: number;
    }> = [];

    // Nếu có lịch sử tìm kiếm phù hợp, đưa lên đầu
    matchingHistory.slice(0, 5).forEach((h) => {
      list.push({
        kind: "history",
        label: h,
        href: `/search?q=${encodeURIComponent(h)}`,
      });
    });

    // Nếu chưa nhập gì và không có lịch sử, gợi ý xu hướng tìm kiếm
    if (!query && matchingHistory.length === 0) {
      trendingSearches.slice(0, 5).forEach((t) => {
        list.push({
          kind: "trending",
          label: t,
          href: `/search?q=${encodeURIComponent(t)}`,
        });
      });
    }

    // Từ khóa gợi ý
    if (query.length >= 1) {
      const distinctKeywords = [
        query,
        ...hints.keywords.filter(
          (k) =>
            k.toLocaleLowerCase("vi").trim() !== query.toLocaleLowerCase("vi") &&
            !matchingHistory.includes(k)
        ),
      ].slice(0, 5);

      distinctKeywords.forEach((k) => {
        list.push({
          kind: "keyword",
          label: k,
          href: `/search?q=${encodeURIComponent(k)}`,
        });
      });

      hints.brands.forEach((brand) => {
        list.push({
          kind: "brand",
          label: brand.name,
          href: `/products?brandId=${brand.id}`,
        });
      });

      hints.products.forEach((product) => {
        list.push({
          kind: "product",
          label: product.name,
          price: product.price,
          href: `/products/${product.slug}`,
        });
      });
    }

    return list;
  }, [query, matchingHistory, trendingSearches, hints]);

  let index = -1;
  const option = (
    kind: "history" | "keyword" | "brand" | "product" | "trending",
    label: string,
    href: string,
    price?: number,
  ) => {
    index += 1;
    const current = index;
    const isHistory = kind === "history";
    const isTrending = kind === "trending";

    if (isHistory) {
      return (
        <div key={`${kind}-${href}`} className="search-history-row">
          <Link
            id={`search-suggestion-${current}`}
            role="option"
            aria-selected={active === current}
            href={href}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              saveQueryToHistory(label);
              setOpen(false);
            }}
          >
            <Clock size={14} color="#9d394f" />
            <span>{label}</span>
          </Link>
          <button
            type="button"
            className="search-history-delete"
            title="Xóa khỏi lịch sử"
            aria-label={`Xóa "${label}" khỏi lịch sử`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => removeHistoryItem(label, event)}
          >
            <X size={13} />
          </button>
        </div>
      );
    }

    if (isTrending) {
      return (
        <Link
          key={`${kind}-${href}`}
          id={`search-suggestion-${current}`}
          role="option"
          aria-selected={active === current}
          href={href}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            saveQueryToHistory(label);
            setOpen(false);
          }}
        >
          <TrendingUp size={14} color="#e05a80" />
          <span>{label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={`${kind}-${href}`}
        id={`search-suggestion-${current}`}
        role="option"
        aria-selected={active === current}
        href={href}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (kind === "keyword") saveQueryToHistory(label);
          setOpen(false);
        }}
      >
        <span>{label}</span>
        {price !== undefined && <small>{formatPrice(price)}</small>}
      </Link>
    );
  };

  const shouldShowDropdown =
    open &&
    (matchingHistory.length > 0 ||
      (!query && trendingSearches.length > 0) ||
      (query.length >= 1 && (options.length > 0 || loading)));

  return (
    <form
      action="/search"
      role="search"
      className="header-search search-suggest"
      onSubmit={() => {
        if (query) {
          saveQueryToHistory(query);
          setOpen(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActive((current) => Math.min(current + 1, options.length - 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive((current) => Math.max(current - 1, -1));
        } else if (event.key === "Escape") {
          setOpen(false);
          setActive(-1);
        } else if (event.key === "Enter" && active >= 0 && options[active]) {
          event.preventDefault();
          saveQueryToHistory(options[active].label);
          router.push(options[active].href);
          setOpen(false);
        }
      }}
    >
      <Search size={19} />
      <input
        name="q"
        type="search"
        aria-label="Tìm kiếm sản phẩm"
        aria-expanded={shouldShowDropdown}
        aria-controls="search-suggestions"
        aria-activedescendant={open && active >= 0 ? `search-suggestion-${active}` : undefined}
        role="combobox"
        autoComplete="off"
        placeholder="Tìm kiếm sản phẩm, thương hiệu…"
        required
        maxLength={200}
        value={value}
        onFocus={() => {
          setOpen(true);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          setActive(-1);
          setOpen(true);
          const q = next.trim();
          if (q.length >= 1) {
            if (hintsCache.has(q)) {
              setHints(hintsCache.get(q)!);
              setLoading(false);
            } else {
              setLoading(true);
            }
          } else {
            setLoading(false);
            setHints(empty);
          }
        }}
      />
      <button type="submit" className="sr-only">
        Tìm kiếm
      </button>
      <button
        type="button"
        className="image-search"
        aria-label="Tìm kiếm bằng hình ảnh — sắp ra mắt"
        title="Tìm kiếm bằng hình ảnh — sắp ra mắt"
        disabled
      >
        <Camera size={20} />
      </button>

      {shouldShowDropdown && (
        <div id="search-suggestions" role="listbox" className="search-suggestions">
          {loading && <p className="search-hints-status">Đang tìm gợi ý…</p>}

          {/* Nhóm lịch sử tìm kiếm (hiện khi mới bấm vào hoặc khi gõ có chứa từ trong lịch sử) */}
          {matchingHistory.length > 0 && (
            <div role="group" aria-label="Lịch sử tìm kiếm">
              <div className="search-history-header">
                <strong>{query.length < 1 ? "Tìm kiếm gần đây" : "Lịch sử tìm kiếm"}</strong>
                <button
                  type="button"
                  className="search-history-clear"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearAllHistory}
                >
                  Xóa tất cả
                </button>
              </div>
              {options
                .filter((item) => item.kind === "history")
                .map((item) => option(item.kind, item.label, item.href))}
            </div>
          )}

          {/* Nhóm xu hướng tìm kiếm (hiện khi chưa gõ gì và không có lịch sử) */}
          {!query && matchingHistory.length === 0 && options.some((item) => item.kind === "trending") && (
            <div role="group" aria-label="Xu hướng tìm kiếm">
              <div className="search-history-header">
                <strong>Xu hướng tìm kiếm</strong>
              </div>
              {options
                .filter((item) => item.kind === "trending")
                .map((item) => option(item.kind, item.label, item.href))}
            </div>
          )}

          {/* Nhóm từ khóa gợi ý */}
          {query.length >= 1 && options.some((item) => item.kind === "keyword") && (
            <div role="group" aria-label="Từ khóa">
              <strong>Từ khóa gợi ý</strong>
              {options
                .filter((item) => item.kind === "keyword")
                .map((item) => option(item.kind, item.label, item.href))}
            </div>
          )}

          {/* Nhóm thương hiệu */}
          {query.length >= 1 && hints.brands.length > 0 && (
            <div role="group" aria-label="Thương hiệu">
              <strong>Thương hiệu</strong>
              {options
                .filter((item) => item.kind === "brand")
                .map((item) => option(item.kind, item.label, item.href))}
            </div>
          )}

          {/* Nhóm sản phẩm */}
          {query.length >= 1 && hints.products.length > 0 && (
            <div role="group" aria-label="Sản phẩm">
              <strong>Sản phẩm</strong>
              {options
                .filter((item) => item.kind === "product")
                .map((item) => option(item.kind, item.label, item.href, item.price))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
