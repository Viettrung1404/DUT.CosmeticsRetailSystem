"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  HelpCircle,
  Search,
  LayoutGrid,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Store,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import { ContentBadge, ContentBreadcrumb, ContentEmpty } from "./content-layout";

type Group = { category: string; items: { id: string; question: string; answer: string }[] };

const BEAUTY_SEARCH_HINTS = [
  "Chính hãng 100%",
  "Giao hỏa tốc 2H",
  "Đồng kiểm khi nhận",
  "Bảo hiểm dị ứng da",
  "Hạn mở nắp PAO",
  "Tích điểm GlowUp Xu",
  "Soi da miễn phí",
];

function categoryIcon(category: string) {
  if (category.includes("chính hãng") || category.includes("Nguồn gốc")) {
    return <ShieldCheck size={18} />;
  }
  if (category.includes("Giao") || category.includes("vận chuyển")) {
    return <Truck size={18} />;
  }
  if (category.includes("đổi trả") || category.includes("Làn da")) {
    return <RotateCcw size={18} />;
  }
  if (category.includes("Thành viên") || category.includes("Tích điểm")) {
    return <Sparkles size={18} />;
  }
  if (category.includes("Showroom") || category.includes("Soi da")) {
    return <Store size={18} />;
  }
  return <HelpCircle size={18} />;
}

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
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, "yes" | "no">>({});

  const handleVote = (id: string, type: "yes" | "no") => {
    setHelpfulFeedback((prev) => ({ ...prev, [id]: type }));
  };

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
      {(compact ? items.slice(0, 5) : items).map((item) => {
        const feedback = helpfulFeedback[item.id];
        return (
          <details key={item.id} className="faq-details">
            <summary>
              <span className="content-icon">{categoryIcon(item.category)}</span>
              <span>
                <strong>{item.question}</strong>
                <small>{item.category}</small>
              </span>
              <ChevronDown size={20} />
            </summary>
            <div className="faq-answer-wrap">
              <div className="faq-answer" dangerouslySetInnerHTML={{ __html: item.answer }} />
              <div className="faq-feedback-bar">
                {feedback ? (
                  <div className="faq-feedback-thanks">
                    <CheckCircle2 size={16} />
                    <span>
                      {feedback === "yes"
                        ? "Cảm ơn bạn đã phản hồi! GlowUp rất vui vì thông tin này hữu ích."
                        : "Cảm ơn bạn! GlowUp sẽ cập nhật câu trả lời chi tiết và rõ ràng hơn."}
                    </span>
                  </div>
                ) : (
                  <div className="faq-feedback-prompt">
                    <span>Thông tin này có hữu ích với bạn không?</span>
                    <div className="faq-feedback-actions">
                      <button
                        type="button"
                        className="feedback-btn"
                        onClick={() => handleVote(item.id, "yes")}
                        aria-label="Đánh giá có ích"
                      >
                        <ThumbsUp size={14} /> Có ích
                      </button>
                      <button
                        type="button"
                        className="feedback-btn"
                        onClick={() => handleVote(item.id, "no")}
                        aria-label="Đánh giá chưa rõ"
                      >
                        <ThumbsDown size={14} /> Chưa rõ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </details>
        );
      })}
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
          <ContentBadge>TRUNG TÂM HỎI ĐÁP & CHĂM SÓC KHÁCH HÀNG</ContentBadge>
          <h1>Câu Hỏi Thường Gặp (FAQ)</h1>
          <p>
            Giải đáp mọi thắc mắc về nguồn gốc chính hãng, quy trình đồng kiểm, chính sách bảo hiểm
            dị ứng làn da và đặc quyền thành viên GlowUp.
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
              placeholder="Tìm kiếm nhanh: chính hãng, giao 2H, đồng kiểm, hạn mở nắp, đổi trả..."
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="support-suggestions">
            <span>Từ khóa nổi bật:</span>
            {BEAUTY_SEARCH_HINTS.map((term) => (
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
        <nav className="content-pills faq-nav-pills" aria-label="Nhóm câu hỏi">
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
              {categoryIcon(group.category)}
              {group.category}
              <small>{group.items.length}</small>
            </button>
          ))}
        </nav>

        <p className="faq-result-count" aria-live="polite">
          Hiển thị <strong>{items.length}</strong> câu hỏi
          {category && ` trong nhóm “${category}”`}
          {query && ` cho từ khóa “${query}”`}
        </p>

        {items.length ? (
          accordion
        ) : (
          <ContentEmpty title="Không tìm thấy câu hỏi phù hợp">
            Thử tìm kiếm với từ khóa khác hoặc bấm nút &quot;Tất cả&quot; để duyệt toàn bộ danh mục câu hỏi.
          </ContentEmpty>
        )}

        {/* Multi-channel Customer Care Center matching Hasaki / BeautyBox */}
        <section className="support-channels-section">
          <div className="support-channels-header">
            <ContentBadge>GLOWUP ĐỒNG HÀNH CÙNG LÀN DA BẠN</ContentBadge>
            <h2>Bạn Vẫn Cần Hỗ Trợ Thêm?</h2>
            <p>
              Đội ngũ Dược sĩ da liễu và Chuyên viên tư vấn luôn sẵn sàng giải đáp thắc mắc và đồng
              hành cùng chu trình dưỡng da của bạn.
            </p>
          </div>
          <div className="support-channels-grid">
            <div className="support-channel-card">
              <div
                className="channel-icon-wrap"
                style={{ background: "#fef0f2", color: "#c85a70" }}
              >
                <PhoneCall size={24} />
              </div>
              <h3>Tổng Đài Miễn Cước</h3>
              <strong>1800 6868</strong>
              <p>8:00 - 21:30 tất cả các ngày (kể cả Thứ 7, Chủ Nhật và ngày Lễ)</p>
              <a href="tel:18006868" className="channel-action-btn">
                Gọi ngay (0đ)
              </a>
            </div>

            <div className="support-channel-card">
              <div
                className="channel-icon-wrap"
                style={{ background: "#e8f5e9", color: "#2e7d32" }}
              >
                <MessageCircle size={24} />
              </div>
              <h3>Tư Vấn Routine Da</h3>
              <strong>Zalo Official Account</strong>
              <p>Gửi ảnh da để nhận phác đồ chăm sóc khoa học từ Dược sĩ GlowUp</p>
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                className="channel-action-btn"
              >
                Chat Zalo ngay
              </a>
            </div>

            <div className="support-channel-card">
              <div
                className="channel-icon-wrap"
                style={{ background: "#e3f2fd", color: "#1565c0" }}
              >
                <Store size={24} />
              </div>
              <h3>Trải Nghiệm Showroom</h3>
              <strong>Soi Da Đa Tầng Miễn Phí</strong>
              <p>Trải nghiệm mẫu thử tester chính hãng và phân tích da chuyên sâu</p>
              <Link href="/stores" className="channel-action-btn">
                Tìm showroom gần nhất
              </Link>
            </div>

            <div className="support-channel-card">
              <div
                className="channel-icon-wrap"
                style={{ background: "#fff8e1", color: "#f57f17" }}
              >
                <RotateCcw size={24} />
              </div>
              <h3>Bảo Hiểm Làn Da</h3>
              <strong>Đổi Trả 1-1 Trong 7 Ngày</strong>
              <p>Đổi trả tận nơi miễn phí nếu bị kích ứng da hoặc sản phẩm có lỗi</p>
              <Link href="/help" className="channel-action-btn">
                Xem chính sách đổi trả
              </Link>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
