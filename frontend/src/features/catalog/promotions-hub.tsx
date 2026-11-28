"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Gift, Zap } from "lucide-react";
import type { FlashCard, PromotionPage } from "./server";
import { CatalogImage } from "./components";
import {
  ContentBadge,
  ContentBreadcrumb,
  ContentEmpty,
  ContentPagination,
  contentDate,
} from "./content-layout";
import { FlashSaleBody, FlashSaleHero } from "./flash-sale-view";

export type PromotionsTab = "campaigns" | "flash-sale";

export function PromotionsHub({
  campaigns,
  flashCards,
  page,
  initialTab = "campaigns",
}: {
  campaigns: PromotionPage;
  flashCards: FlashCard[];
  page: number;
  initialTab?: PromotionsTab;
}) {
  const [activeTab, setActiveTab] = useState<PromotionsTab>(initialTab);

  function switchTab(nextTab: PromotionsTab) {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    const url = new URL(window.location.href);
    if (nextTab === "flash-sale") {
      url.searchParams.set("tab", "flash-sale");
      url.searchParams.delete("page");
    } else {
      url.searchParams.delete("tab");
      if (page > 1) url.searchParams.set("page", String(page));
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <main id="main-content" className="content-page">
      <section className="content-hero">
        <div className="content-container">
          <ContentBreadcrumb current="Khuyến mãi" />
          {activeTab === "campaigns" ? (
            <div className="content-hero-row">
              <div>
                <ContentBadge>GLOWUP EXCLUSIVE OFFERS</ContentBadge>
                <h1>ƯU ĐÃI DÀNH RIÊNG CHO BẠN</h1>
                <p>Khám phá các chương trình làm đẹp và ưu đãi đang diễn ra tại GlowUp Beauty.</p>
              </div>
              <div className="content-metric">
                <span className="content-icon">
                  <Gift />
                </span>
                <div>
                  <strong>{campaigns.total.toString().padStart(2, "0")} ƯU ĐÃI</strong>
                  <small>Đang áp dụng hôm nay</small>
                </div>
              </div>
            </div>
          ) : (
            <FlashSaleHero cards={flashCards} />
          )}
          <nav
            className="content-pills"
            aria-label="Chương trình khuyến mãi"
            style={{ marginTop: 32 }}
          >
            <button
              type="button"
              aria-pressed={activeTab === "campaigns"}
              onClick={() => switchTab("campaigns")}
            >
              Đang diễn ra <small>{campaigns.total}</small>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === "flash-sale"}
              onClick={() => switchTab("flash-sale")}
            >
              <Zap size={15} /> Flash Sale <small>{flashCards.length}</small>
            </button>
          </nav>
        </div>
      </section>

      {activeTab === "campaigns" ? (
        <section className="content-container content-section">
          <div className="content-section-heading">
            <h2>Chiến dịch nổi bật</h2>
          </div>
          {campaigns.items.length ? (
            <div className="campaign-grid">
              {campaigns.items.map((campaign, index) => (
                <article key={campaign.id} className="campaign-tile">
                  <Link className="campaign-art" href={`/promotions/${campaign.id}`}>
                    <CatalogImage
                      src={`/images/stitch/content/campaign-${(index % 4) + 1}.webp`}
                      alt=""
                    />
                    <span>{campaign.isFlashSale ? "FLASH SALE" : "ĐANG DIỄN RA"}</span>
                    <div>
                      <h2>{campaign.name}</h2>
                      {campaign.slotStartHour != null ? (
                        <strong>Giá riêng từng biến thể</strong>
                      ) : (
                        campaign.type === "PERCENTAGE" && <strong>{campaign.value}%</strong>
                      )}
                    </div>
                  </Link>
                  <div className="campaign-copy">
                    <p>
                      {campaign.description ||
                        "Xem chi tiết sản phẩm và điều kiện áp dụng của chương trình."}
                    </p>
                    <div>
                      <span>
                        <CalendarDays size={14} style={{ display: "inline", marginRight: 5 }} />
                        {contentDate(campaign.startDate)} – {contentDate(campaign.endDate)}
                      </span>
                      <Link href={`/promotions/${campaign.id}`}>
                        Khám phá ngay <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ContentEmpty title="Chưa có chương trình đang diễn ra">
              Các ưu đãi mới sẽ được cập nhật tại đây.
            </ContentEmpty>
          )}
          <ContentPagination
            page={page}
            total={campaigns.total}
            limit={campaigns.limit}
            base="/promotions"
          />
        </section>
      ) : (
        <FlashSaleBody cards={flashCards} />
      )}
    </main>
  );
}
