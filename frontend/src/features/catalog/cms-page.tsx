import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCmsPage } from "@/features/catalog/server";
import { ApiError } from "@/shared/api/errors";
import { ChevronRight } from "lucide-react";
import { ContentBadge, ContentBreadcrumb } from "./content-layout";
import { articleHeadings } from "./editorial-pages";

async function load(slug: string) {
  try {
    return await getCmsPage(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
export async function cmsMetadata(slug: string): Promise<Metadata> {
  const page = await load(slug);
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
    alternates: { canonical: `/${page.slug}` },
  };
}
export async function CmsPage({ slug }: { slug: string }) {
  const page = await load(slug);
  const { html, headings } = articleHeadings(page.content);
  const policies = [
    { slug: "chinh-sach-doi-tra", title: "Chính sách đổi trả & Hoàn tiền" },
    { slug: "chinh-sach-giao-hang", title: "Chính sách giao hàng" },
    { slug: "chinh-sach-bao-mat", title: "Chính sách bảo mật thông tin" },
  ];
  return (
    <main id="main-content" className="content-page">
      <div className="content-container">
        <ContentBreadcrumb current={page.title} parent={{ label: "Trợ giúp", href: "/help" }} />
        <header className="policy-header">
          <ContentBadge>CHÍNH SÁCH MUA SẮM GLOWUP</ContentBadge>
          <h1>{page.title}</h1>
          <p>Thông tin và điều kiện áp dụng khi mua sắm tại GlowUp.</p>
        </header>
        <div className="policy-layout">
          <aside className="policy-sidebar">
            <h2>Trung tâm chính sách</h2>
            <nav>
              {policies.map((item) => (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  aria-current={slug === item.slug ? "page" : undefined}
                >
                  {item.title}
                  <ChevronRight size={15} />
                </Link>
              ))}
            </nav>
            {headings.length > 0 && (
              <div className="policy-toc">
                <h2>Trong trang này</h2>
                {headings.map((item) => (
                  <a href={`#${item.id}`} key={item.id}>
                    {item.text}
                  </a>
                ))}
              </div>
            )}
            <Link href="/faq">
              Câu hỏi thường gặp
              <ChevronRight size={15} />
            </Link>
          </aside>
          <article className="policy-article" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </main>
  );
}
