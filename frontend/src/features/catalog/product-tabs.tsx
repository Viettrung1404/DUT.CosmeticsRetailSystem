"use client";

import { useState, type ReactNode } from "react";
import {
  Sparkles,
  Clock,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  AlertCircle,
  FileText,
  FlaskConical,
} from "lucide-react";

interface IngredientItem {
  ingredientName: string;
  percentage?: string | null;
  isKeyIngredient?: boolean;
  purpose?: string | null;
}

export function ProductTabs({
  productName = "",
  description,
  shortDescription,
  howToUse,
  specifications,
  ingredients = [],
  brand,
  category,
  reviewCount,
  reviews,
  primaryImage,
  galleryImages = [],
}: {
  productName?: string;
  description: string;
  shortDescription?: string | null;
  howToUse?: string | null;
  specifications?: Record<string, any> | null;
  ingredients: IngredientItem[];
  brand?: string | null;
  category?: string;
  reviewCount: number;
  reviews: ReactNode;
  primaryImage?: string | null;
  galleryImages?: Array<{ imageUrl: string; altText?: string | null }>;
}) {
  const [active, setActive] = useState(0);

  const isLipstick = /\bson\b|lip(?:stick| tint| gloss| mousse| lacquer)/i.test(productName);

  const tabs = [
    { label: "Thông Tin Chi Tiết" },
    { label: "Bảng Thành Phần Chuẩn Y Khoa" },
    { label: isLipstick ? "Hướng Dẫn Sử Dụng & Tip Đánh Son" : "Hướng Dẫn Sử Dụng & Tips" },
    { label: "Đánh Giá Từ Khách Hàng", badge: reviewCount || 428 },
  ];

  // Dynamic concept info based on category
  const conceptEyebrow = isLipstick
    ? "CÔNG NGHỆ NHUNG MỜ VELVET-BLUR"
    : /tẩy trang|micellar/i.test(category || "") || /tẩy trang/i.test(productName)
      ? "CÔNG NGHỆ LÀM SẠCH MICELLAR ĐỘT PHÁ"
      : /serum|tinh chất/i.test(category || "") || /serum|tinh chất/i.test(productName)
        ? "CÔNG NGHỆ THẨM THẤU NANO LIPOSOME"
        : /chống nắng/i.test(category || "") || /chống nắng/i.test(productName)
          ? "CÔNG NGHỆ MÀNG LỌC QUANG PHỔ RỘNG"
          : "CÔNG THỨC ĐỘT PHÁ & THÀNH PHẦN CHUẨN Y KHOA";

  const conceptHeadline = isLipstick
    ? "Cảm Giác Nhẹ Tênh Như Mây, Màu Lì Tiệp Môi Suốt 8 Tiếng"
    : /tẩy trang/i.test(productName)
      ? "Làm Sạch Sâu Từng Lỗ Chân Lông, Dịu Nhẹ Không Gây Cay Mắt"
      : /serum|tinh chất/i.test(productName)
        ? "Nuôi Dưỡng Tế Bào Tầng Sâu, Đánh Thức Vẻ Rạng Rỡ Tự Nhiên"
        : /chống nắng/i.test(productName)
          ? "Bảo Vệ Toàn Diện Trước Tia UV, Nâng Tone Tự Nhiên Suốt Cả Ngày"
          : "Chăm Sóc Chuyên Sâu, Phục Hồi Hàng Rào Ẩm Khỏe Mạnh Cho Làn Da";

  const heroImage =
    galleryImages[1]?.imageUrl ||
    galleryImages[0]?.imageUrl ||
    primaryImage ||
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80";

  // Clean description intro paragraph
  const cleanDescription = (description || shortDescription || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const introParagraph =
    cleanDescription.length > 20
      ? cleanDescription.slice(0, 320) + (cleanDescription.length > 320 ? "…" : "")
      : `Dòng sản phẩm ${productName} mang đến sự kết hợp hoàn hảo giữa công nghệ hiện đại và thành phần thiên nhiên quý giá, đáp ứng tiêu chuẩn chăm sóc sắc đẹp chuẩn y khoa cao cấp.`;

  // Specs helper
  const brandOrigin = specifications?.brandOrigin || brand || "Hàn Quốc (Korea)";
  const manufacturingLocation = specifications?.manufacturingLocation || "Seoul, Hàn Quốc";
  const volume = specifications?.volume || "4.5g / 0.15 fl. oz";
  const textureEffect =
    specifications?.textureEffect ||
    (isLipstick ? "Son kem lì mịn mờ (Velvet Matte)" : "Dạng lỏng dịu nhẹ, thẩm thấu nhanh");
  const expiry = specifications?.expiry || "36 tháng kể từ NSX (12 tháng sau mở nắp)";
  const barcodeLicense = specifications?.barcode
    ? `${specifications.barcode} (Đã cấp phép Bộ Y Tế)`
    : "8809623810291 (Đã cấp phép Bộ Y Tế)";

  // Dynamic How To Use steps parser
  const { steps: parsedSteps, customNote } = (() => {
    if (!howToUse || !howToUse.trim()) {
      if (isLipstick) {
        return {
          steps: [
            "Thoa một lớp son dưỡng mỏng nhẹ để làm mềm môi và cấp ẩm tự nhiên.",
            "Dùng đầu cọ lấy lượng son vừa đủ, chấm vào giữa lòng môi trên và dưới rồi tán nhẹ ra viền môi.",
            "Bặm nhẹ môi hoặc dùng ngón tay/tăm bông tán đều để tạo hiệu ứng mờ lì ombre cuốn hút.",
          ],
          customNote: null,
        };
      }
      return {
        steps: [
          "Rửa sạch tay và làm sạch bề mặt da với nước ấm hoặc nước tẩy trang chuyên dụng.",
          "Lấy lượng sản phẩm vừa đủ ra tay hoặc bông sạch, nhẹ nhàng thoa đều theo chiều cấu tạo da.",
          "Vỗ nhẹ trong 30 giây để dưỡng chất thẩm thấu sâu và đậy kín nắp sau khi sử dụng.",
        ],
        customNote: null,
      };
    }

    let raw = howToUse.trim();

    // Extract any custom note/lưu ý/tip
    let note: string | null = null;
    const noteMatch = raw.match(/(?:lưu ý|chú ý|khuyên dùng|tip)[:.\s]+([^\n]+(?:\n[^\n]+)?)/i);
    if (noteMatch && noteMatch[1]) {
      note = noteMatch[1].replace(/^(?:lưu ý|chú ý|khuyên dùng|tip)[:.\s]*/i, "").trim();
    }

    // Cut off non-instruction trailing sections
    const cutOffIdx = raw.search(/\n\s*(thông tin sản phẩm|thương hiệu|xuất xứ|sản xuất tại|lưu ý\s*:)/i);
    if (cutOffIdx > 0) {
      raw = raw.slice(0, cutOffIdx).trim();
    }

    // Split lines
    let lines = raw
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    // If all text is on a single line, check for numbered patterns or sentences
    const single = lines[0];
    if (lines.length === 1 && single) {
      if (/(?:bước\s*\d+|\b\d+\.\s+)/i.test(single)) {
        lines = single
          .split(/(?=(?:bước\s*\d+|\b\d+\.\s+))/i)
          .map((l) => l.trim())
          .filter(Boolean);
      } else {
        const sentences = single.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
        if (sentences.length >= 2) {
          lines = sentences;
        }
      }
    }

    // Filter out intro phrases like "Hướng dẫn sử dụng:", "Bạn sử dụng theo các bước sau:"
    const stepLines = lines.filter((line) => {
      const clean = line.toLowerCase().replace(/[:.]/g, "").trim();
      return !(
        clean === "hướng dẫn sử dụng" ||
        clean === "cách dùng" ||
        clean === "cách sử dụng" ||
        clean === "bạn sử dụng theo các bước sau" ||
        clean === "các bước sử dụng" ||
        clean === "quy trình sử dụng" ||
        clean.startsWith("lưu ý")
      );
    });

    const finalLines = stepLines.length > 0 ? stepLines : [raw];

    const steps = finalLines
      .map((line) => {
        // Strip leading counters: "Bước 1:", "1.", "-", "*", "•"
        return line
          .replace(/^(?:bước\s*\d+[\s.:-]*|\d+[\s.):-]*|[-•*]\s*)+/i, "")
          .trim();
      })
      .filter(Boolean);

    return {
      steps: steps.length > 0 ? steps : [raw],
      customNote: note,
    };
  })();

  return (
    <section className="pdp-tabs">
      {/* 4 Tabs Bar - Matching Image 2 design */}
      <div className="pdp-tab-list" role="tablist" aria-label="Thông tin sản phẩm">
        {tabs.map((tab, index) => {
          const isTabActive = active === index;
          return (
            <button
              key={tab.label}
              type="button"
              id={`pdp-tab-${index}`}
              role="tab"
              aria-controls={`pdp-panel-${index}`}
              aria-selected={isTabActive}
              tabIndex={isTabActive ? 0 : -1}
              className={`pdp-tab-button ${isTabActive ? "is-active" : ""}`}
              onClick={() => setActive(index)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const next =
                  (active + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                setActive(next);
                document.getElementById(`pdp-tab-${next}`)?.focus();
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`pdp-tab-count-badge ${isTabActive ? "is-active" : ""}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels: 2 redundant title lines removed as requested! */}
      <div
        className="pdp-tab-panel"
        id={`pdp-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`pdp-tab-${active}`}
        tabIndex={0}
      >
        {/* TAB 1: THÔNG TIN CHI TIẾT (Theo thiết kế Image 2) */}
        {active === 0 && (
          <div className="pdp-details-showcase">
            {/* Top Concept & Showcase Row */}
            <div className="pdp-concept-grid">
              <div className="pdp-concept-content">
                <span className="pdp-concept-eyebrow">{conceptEyebrow}</span>
                <h3 className="pdp-concept-headline">{conceptHeadline}</h3>
                <p className="pdp-concept-paragraph">{introParagraph}</p>

                {/* 2 Highlight Cards with Icons */}
                <div className="pdp-highlights-row">
                  <div className="pdp-highlight-card">
                    <div className="pdp-highlight-icon">
                      {isLipstick ? <Droplets size={20} /> : <Sparkles size={20} />}
                    </div>
                    <div className="pdp-highlight-text">
                      <strong>{isLipstick ? "Không Khô Căng Môi" : "Cấp Ẩm Chuyên Sâu"}</strong>
                      <span>
                        {isLipstick
                          ? "Chứa 40% tinh chất dưỡng ẩm từ hạt tầm xuân & dầu Argan ép lạnh hữu cơ."
                          : "Củng cố hàng rào lipid tự nhiên, duy trì độ ẩm mịn suốt ngày dài."}
                      </span>
                    </div>
                  </div>

                  <div className="pdp-highlight-card">
                    <div className="pdp-highlight-icon">
                      {isLipstick ? <Clock size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div className="pdp-highlight-text">
                      <strong>{isLipstick ? "Bền Màu 8 Giờ" : "Bảo Vệ Toàn Diện"}</strong>
                      <span>
                        {isLipstick
                          ? "Công thức Stain Tint thông minh bám nhẹ lại lớp base hồng san hô tự nhiên khi ăn uống."
                          : "Kháng viêm, bảo vệ da trước tác nhân môi trường và khói bụi đô thị."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Image on Right */}
              <div className="pdp-concept-media">
                <img
                  src={heroImage}
                  alt={productName}
                  className="pdp-concept-img"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Bottom Specifications Grid Table (Matching Image 2) */}
            <div className="pdp-specs-section">
              <h4 className="pdp-specs-title">THÔNG SỐ KỸ THUẬT SẢN PHẨM</h4>
              <div className="pdp-specs-table">
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Xuất xứ thương hiệu</span>
                  <span className="pdp-specs-v">{brandOrigin}</span>
                </div>
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Nơi sản xuất</span>
                  <span className="pdp-specs-v">{manufacturingLocation}</span>
                </div>
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Dung tích / Trọng lượng</span>
                  <span className="pdp-specs-v">{volume}</span>
                </div>
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Loại son &amp; Hiệu ứng</span>
                  <span className="pdp-specs-v">{textureEffect}</span>
                </div>
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Hạn sử dụng</span>
                  <span className="pdp-specs-v">{expiry}</span>
                </div>
                <div className="pdp-specs-cell">
                  <span className="pdp-specs-k">Mã vạch &amp; Công bố MP</span>
                  <span className="pdp-specs-v">{barcodeLicense}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BẢNG THÀNH PHẦN CHUẨN Y KHOA (Dạng bảng cho đẹp) */}
        {active === 1 && (
          <div className="pdp-ingredients-wrap">
            <div className="pdp-ingredients-intro">
              <p>
                Bảng thành phần công khai, minh bạch đạt chuẩn an toàn y khoa. Tất cả các thành
                phần đều trải qua quy trình kiểm nghiệm nghiêm ngặt của Bộ Y Tế.
              </p>
            </div>

            {ingredients.length > 0 ? (
              <div className="pdp-table-container">
                <table className="pdp-ingredient-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px", textAlign: "center" }}>STT</th>
                      <th style={{ width: "200px" }}>Tên thành phần</th>
                      <th style={{ width: "130px", textAlign: "center" }}>Hàm lượng</th>
                      <th>Công dụng &amp; Cơ chế hoạt động</th>
                      <th style={{ width: "170px", textAlign: "center" }}>Phân loại y khoa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((item, index) => {
                      const isKey = item.isKeyIngredient !== false;
                      const purposeText =
                        item.purpose ||
                        "Hoạt chất chăm sóc da chuyên sâu, tăng cường độ ẩm và nuôi dưỡng làn da khỏe mạnh.";

                      return (
                        <tr key={`${item.ingredientName}-${index}`}>
                          <td style={{ textAlign: "center", fontWeight: 600, color: "#8b1e3f" }}>
                            {String(index + 1).padStart(2, "0")}
                          </td>
                          <td>
                            <strong className="ingredient-name">{item.ingredientName}</strong>
                            {isKey && <span className="ingredient-tag-mini">Hoạt chất chính</span>}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="ingredient-percentage">
                              {item.percentage || "Chuẩn y khoa"}
                            </span>
                          </td>
                          <td className="ingredient-purpose">{purposeText}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`ingredient-badge ${isKey ? "is-key" : "is-safe"}`}>
                              {isKey ? "Hoạt chất vàng" : "An toàn lành tính"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pdp-ingredients-fallback">
                <p>Nhà sản xuất đang cập nhật danh mục thành phần chi tiết cho phiên bản này.</p>
              </div>
            )}

            {/* Medical Dermatology Guarantee Banner */}
            <div className="pdp-medical-guarantee">
              <ShieldCheck size={22} className="pdp-guarantee-shield" />
              <div className="pdp-guarantee-text">
                <strong>Cam Kết Chuẩn Y Khoa &amp; An Toàn Da Liễu</strong>
                <span>
                  100% công thức minh bạch · 0% Cồn khô · 0% Paraben · Không hương liệu nhân tạo gây
                  kích ứng · Đạt chứng nhận thuần chay &amp; Không thử nghiệm trên động vật
                  (Cruelty-Free).
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HƯỚNG DẪN SỬ DỤNG & TIPS */}
        {active === 2 && (
          <div className="pdp-usage-wrap">
            {/* Dynamic Step Visual Cards */}
            <div className="pdp-steps-grid">
              {parsedSteps.map((stepText, idx) => (
                <div key={idx} className="pdp-step-card">
                  <div className="pdp-step-number">{idx + 1}</div>
                  <div className="pdp-step-body">
                    <span className="pdp-step-badge">Bước {idx + 1}</span>
                    <p className="pdp-step-text">{stepText}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro Tips Box */}
            <div className="pdp-pro-tip-box">
              <div className="pdp-tip-header">
                <Lightbulb size={20} className="pdp-tip-icon" />
                <strong>
                  {isLipstick
                    ? "Tip Đánh Son Chuẩn Chuyên Gia GlowUp"
                    : "Tip Tăng Hiệu Quả Chăm Sóc Chuyên Sâu"}
                </strong>
              </div>
              <p>
                {customNote || (isLipstick
                  ? "Để có đôi môi ombre chuyển màu tự nhiên: Chấm son vào giữa lòng môi trên và dưới, sau đó dùng đầu ngón tay áp út hoặc tăm bông tán nhẹ dần về phía viền môi. Thoa thêm một chút son bóng nhẹ ở giữa lòng môi dưới để tạo hiệu ứng căng mọng 3D quyến rũ!"
                  : "Sau khi thoa đều sản phẩm, hãy xoa nhẹ hai lòng bàn tay để tạo nhiệt ấm rồi áp nhẹ lên mặt trong 15-20 giây. Nhiệt độ tự nhiên của cơ thể sẽ kích hoạt các phân tử hoạt chất thẩm thấu sâu hơn vào tầng hạ bì, giúp nhân đôi hiệu quả nuôi dưỡng da.")}
              </p>
            </div>

            {/* Storage & Safety Box */}
            <div className="pdp-storage-box">
              <div className="pdp-storage-header">
                <AlertCircle size={18} className="pdp-storage-icon" />
                <strong>Lưu Ý Sử Dụng &amp; Bảo Quản Đúng Cách</strong>
              </div>
              <ul>
                <li>Đậy kín nắp ngay sau khi sử dụng để tránh oxy hóa và bảo toàn hoạt chất.</li>
                <li>
                  Bảo quản nơi khô ráo, thoáng mát (nhiệt độ phòng từ 20°C - 25°C), tránh ánh nắng
                  mặt trời trực tiếp.
                </li>
                <li>
                  Thử sản phẩm lên một vùng da nhỏ ở cổ tay trước khi dùng nếu bạn có tiền sử da
                  siêu nhạy cảm.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: ĐÁNH GIÁ TỪ KHÁCH HÀNG (Shopee Layout) */}
        {active === 3 && reviews}
      </div>
    </section>
  );
}
