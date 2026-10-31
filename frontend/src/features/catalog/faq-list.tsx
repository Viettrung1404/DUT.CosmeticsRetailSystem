"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, HelpCircle, Search, ArrowRight, LayoutGrid } from "lucide-react";
import { ContentBadge, ContentBreadcrumb, ContentEmpty } from "./content-layout";
type Group = { category: string; items: { id: string; question: string; answer: string }[] };
export function FaqList({
  groups,
  compact = false,
  initialQuery = "",
}: {
  groups: Group[];
  compact?: boolean;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const matching = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.question} ${item.answer.replace(/<[^>]+>/g, "")}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi").trim()),
      ),
    }))
    .filter((group) => group.items.length);
  const items = matching
    .filter((group) => !category || group.category === category)
    .flatMap((group) => group.items.map((item) => ({ ...item, category: group.category })));
  const accordion = (
    <div className="faq-items">
      {(compact ? items.slice(0, 5) : items).map((item) => (
        <details key={item.id}>
          <summary>
            <span className="content-icon">
              <HelpCircle size={20} />
            </span>
            <span>
              <strong>{item.question}</strong>
              <small>{item.category}</small>
            </span>
            <ChevronDown size={20} />
          </summary>
          <div className="faq-answer" dangerouslySetInnerHTML={{ __html: item.answer }} />
        </details>
      ))}
    </div>
  );
  if (compact) return accordion;
  return (
    <>
      <section className="content-hero content-hero-center">
        <div className="content-narrow">
          <ContentBreadcrumb
            current="Câu hỏi thường gặp"
            parent={{ label: "Trợ giúp", href: "/help" }}
          />
          <ContentBadge>TRUNG TÂM TRỢ GIÚP</ContentBadge>
          <h1>Câu hỏi thường gặp (FAQ)</h1>
          <p>
            Tra cứu nhanh câu trả lời về đơn hàng, giao nhận, đổi trả và quyền lợi thành viên
            GlowUp.
          </p>
          <form
            className="support-search"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search size={22} />
            <label className="sr-only" htmlFor="faq-query">
              Tìm câu hỏi
            </label>
            <input
              id="faq-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm theo từ khóa: đơn hàng, đổi trả, tích điểm..."
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="support-suggestions">
            <span>Gợi ý:</span>
            {["Giao hàng", "Đổi trả", "Thanh toán", "Điểm"].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setQuery(term);
                  setCategory("");
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="content-narrow faq-results">
        <nav className="content-pills" aria-label="Nhóm câu hỏi">
          <button type="button" aria-pressed={!category} onClick={() => setCategory("")}>
            <LayoutGrid size={15} />
            Tất cả <small>{groups.reduce((count, group) => count + group.items.length, 0)}</small>
          </button>
          {groups.map((group) => (
            <button
              type="button"
              key={group.category}
              aria-pressed={category === group.category}
              onClick={() => setCategory(group.category)}
            >
              {group.category}
              <small>{group.items.length}</small>
            </button>
          ))}
        </nav>
        <p className="faq-result-count" aria-live="polite">
          Hiển thị {items.length} câu hỏi{query && ` cho “${query}”`}
        </p>
        {items.length ? (
          accordion
        ) : (
          <ContentEmpty title="Không tìm thấy kết quả phù hợp">
            Thử từ khóa khác hoặc xem tất cả câu hỏi.
          </ContentEmpty>
        )}
        <div className="support-bottom">
          <div>
            <ContentBadge>GLOWUP ĐỒNG HÀNH</ContentBadge>
            <h2>Vẫn chưa tìm thấy câu trả lời bạn cần?</h2>
            <p>Xem chính sách mua sắm và các hướng dẫn tại trung tâm trợ giúp.</p>
          </div>
          <Link className="content-primary" href="/help">
            Trung tâm trợ giúp <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
