"use client";
import Link from "next/link";
import { useState } from "react";
import { CatalogImage } from "@/features/catalog/components";
import { Search } from "lucide-react";
import { ContentEmpty } from "./content-layout";
type Brand = { id: string; name: string; slug: string; logoUrl?: string | null };
export function BrandDirectory({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");
  const shown = brands.filter(
    (brand) =>
      brand.name.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")) &&
      (!letter || brand.name.toUpperCase().startsWith(letter)),
  );
  return (
    <>
      <div className="brand-directory-tools">
        <h2>{brands.length} thương hiệu tại GlowUp</h2>
        <label className="support-search">
          <Search size={20} />
          <span className="sr-only">Tìm thương hiệu</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên thương hiệu"
          />
        </label>
      </div>
      <nav className="brand-alphabet" aria-label="Lọc thương hiệu theo chữ cái">
        <button type="button" aria-pressed={!letter} onClick={() => setLetter("")}>
          Tất cả
        </button>
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((char) => (
          <button
            type="button"
            key={char}
            aria-pressed={letter === char}
            onClick={() => setLetter(char)}
          >
            {char}
          </button>
        ))}
      </nav>
      {shown.length ? (
        <div className="brand-directory-grid">
          {shown.map((brand) => (
            <Link href={`/brands/${brand.slug}`} key={brand.id}>
              {brand.logoUrl ? (
                <CatalogImage src={brand.logoUrl} alt={brand.name} />
              ) : (
                <span>{brand.name.slice(0, 2).toUpperCase()}</span>
              )}
              <strong>{brand.name}</strong>
            </Link>
          ))}
        </div>
      ) : (
        <ContentEmpty title="Không tìm thấy thương hiệu phù hợp">
          Thử tên thương hiệu hoặc chữ cái khác.
        </ContentEmpty>
      )}
    </>
  );
}
