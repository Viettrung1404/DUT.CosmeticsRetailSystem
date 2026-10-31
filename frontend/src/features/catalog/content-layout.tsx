import Link from "next/link";
import { ChevronRight, Home, ArrowRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function ContentBreadcrumb({
  current,
  parent,
}: {
  current: string;
  parent?: { label: string; href: string };
}) {
  return (
    <nav aria-label="Đường dẫn" className="content-breadcrumb">
      <Link href="/">
        <Home size={15} /> Trang chủ
      </Link>
      <ChevronRight size={13} />
      {parent && (
        <>
          <Link href={parent.href}>{parent.label}</Link>
          <ChevronRight size={13} />
        </>
      )}
      <span aria-current="page">{current}</span>
    </nav>
  );
}
export function ContentBadge({ children }: { children: ReactNode }) {
  return (
    <span className="content-badge">
      <Sparkles size={14} />
      {children}
    </span>
  );
}
export function ContentEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="content-empty">
      <Sparkles size={32} />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      <Link href="/products">
        Tiếp tục khám phá sản phẩm <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function ContentPagination({
  page,
  total,
  limit,
  base,
}: {
  page: number;
  total: number;
  limit: number;
  base: string;
}) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <nav className="content-pagination" aria-label="Phân trang">
      {page > 1 && <Link href={`${base}?page=${page - 1}`}>← Trang trước</Link>}
      <span>
        Trang {page} / {pages}
      </span>
      {page < pages && <Link href={`${base}?page=${page + 1}`}>Trang sau →</Link>}
    </nav>
  );
}
export const contentDate = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
