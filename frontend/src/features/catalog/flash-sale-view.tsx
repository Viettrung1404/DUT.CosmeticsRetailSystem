import { Info, Zap } from "lucide-react";
import type { FlashCard } from "./server";
import { FlashGrid } from "./components";
import { ContentBadge } from "./content-layout";
import { FlashCountdown } from "./home-motion";

export function FlashSaleHero({ cards }: { cards: FlashCard[] }) {
  const first = cards[0];
  const endDate = cards.map((card) => card.endDate).sort()[0];

  return (
    <div className="flash-hero-layout">
      <div>
        <ContentBadge>
          <Zap size={14} /> DEAL GIỚI HẠN · ƯU ĐÃI MỖI NGÀY
        </ContentBadge>
        <h1>
          FLASH SALE CỰC XINH
          <br />
          GIÁ SỐC GIỜ VÀNG
        </h1>
        {first?.campaignStartDate && first?.campaignEndDate && (
          <p>
            Chiến dịch{" "}
            {new Date(first.campaignStartDate).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            đến{" "}
            {new Date(Date.parse(first.campaignEndDate) - 1).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
            . Mỗi khung 2 giờ có 20 sản phẩm nổi bật. Tất cả sản phẩm khác vẫn có giá sale.
          </p>
        )}
        <p>
          Săn ưu đãi cho những sản phẩm yêu thích. Số lượt ưu đãi và giá được xác nhận tại bước
          thanh toán.
        </p>
      </div>
      <div className="flash-clock-panel">
        <p>Ưu đãi hiện tại kết thúc sau</p>
        {first && endDate ? (
          <FlashCountdown endDate={endDate} serverTime={first.serverTime} />
        ) : (
          <span className="muted">Chờ chương trình tiếp theo</span>
        )}
      </div>
    </div>
  );
}

export function FlashSaleBody({ cards }: { cards: FlashCard[] }) {
  return (
    <>
      <div className="flash-active-bar">
        <div className="content-container">
          <ContentBadge>
            <Zap size={15} /> Đang diễn ra
          </ContentBadge>
          <span>{cards.length} lựa chọn đang có ưu đãi</span>
        </div>
      </div>
      <section className="content-container content-section campaign-products">
        <FlashGrid cards={cards} />
      </section>
      <section className="content-container">
        <div className="campaign-rules">
          <h2>
            <Info size={20} style={{ display: "inline", marginRight: 8 }} />
            Quy định mua hàng Flash Sale tại GlowUp Beauty
          </h2>
          <p>
            Ưu đãi có số lượt giới hạn. Thêm sản phẩm vào giỏ hàng không giữ giá hoặc giữ lượt ưu
            đãi; hệ thống xác nhận lại khi đặt hàng.
          </p>
          <p>
            Với sản phẩm có điều kiện áp dụng, xem chi tiết và tổng tiền tại bước thanh toán trước
            khi xác nhận.
          </p>
        </div>
      </section>
    </>
  );
}
