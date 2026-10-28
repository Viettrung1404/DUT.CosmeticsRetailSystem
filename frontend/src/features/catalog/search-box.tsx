"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Camera, Search } from "lucide-react";
import { readBff } from "@/shared/api/browser";
import { formatPrice } from "./components";
import { searchHintsSchema, type SearchHints } from "./search-hints";

const empty: SearchHints = { keywords: [], brands: [], products: [] };
export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [hints, setHints] = useState<SearchHints>(empty);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const query = value.trim();
  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      readBff(
        `/api/catalog/search-hints?q=${encodeURIComponent(query)}`,
        searchHintsSchema,
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) {
            setHints(result);
            setLoading(false);
            setOpen(true);
            setActive(-1);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setHints(empty);
            setLoading(false);
            setOpen(true);
          }
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const options = useMemo(
    () => [
      ...[
        query,
        ...hints.keywords.filter(
          (keyword) => keyword.toLocaleLowerCase("vi").trim() !== query.toLocaleLowerCase("vi"),
        ),
      ]
        .slice(0, 5)
        .map((keyword) => ({
          kind: "keyword" as const,
          label: keyword,
          href: `/search?q=${encodeURIComponent(keyword)}`,
        })),
      ...hints.brands.map((brand) => ({
        kind: "brand" as const,
        label: brand.name,
        href: `/products?brandId=${brand.id}`,
      })),
      ...hints.products.map((product) => ({
        kind: "product" as const,
        label: product.name,
        price: product.price,
        href: `/products/${product.slug}`,
      })),
    ],
    [query, hints],
  );
  let index = -1;
  const option = (
    kind: "keyword" | "brand" | "product",
    label: string,
    href: string,
    price?: number,
  ) => {
    index += 1;
    const current = index;
    return (
      <Link
        key={`${kind}-${href}`}
        id={`search-suggestion-${current}`}
        role="option"
        aria-selected={active === current}
        href={href}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen(false)}
      >
        <span>{label}</span>
        {price !== undefined && <small>{formatPrice(price)}</small>}
      </Link>
    );
  };
  return (
    <form
      action="/search"
      role="search"
      className="header-search search-suggest"
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
        aria-expanded={open && query.length >= 2}
        aria-controls="search-suggestions"
        aria-activedescendant={open && active >= 0 ? `search-suggestion-${active}` : undefined}
        role="combobox"
        autoComplete="off"
        placeholder="Tìm kiếm sản phẩm, thương hiệu…"
        required
        maxLength={200}
        value={value}
        onFocus={() => {
          if (query.length >= 2) setOpen(true);
        }}
        onChange={(event) => {
          setValue(event.target.value);
          setActive(-1);
          setLoading(event.target.value.trim().length >= 2);
          setOpen(event.target.value.trim().length >= 2);
          setHints(empty);
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
      {open && query.length >= 2 && (
        <div id="search-suggestions" role="listbox" className="search-suggestions">
          {loading && <p className="search-hints-status">Đang tìm gợi ý…</p>}
          <div role="group" aria-label="Từ khóa">
            <strong>Từ khóa</strong>
            {options
              .filter((item) => item.kind === "keyword")
              .map((item) => option(item.kind, item.label, item.href))}
          </div>
          {hints.brands.length > 0 && (
            <div role="group" aria-label="Thương hiệu">
              <strong>Thương hiệu</strong>
              {options
                .filter((item) => item.kind === "brand")
                .map((item) => option(item.kind, item.label, item.href))}
            </div>
          )}
          {hints.products.length > 0 && (
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
