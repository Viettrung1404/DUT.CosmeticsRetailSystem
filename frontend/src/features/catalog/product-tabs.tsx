"use client";

import { useState, type ReactNode } from "react";

export function ProductTabs({
  description,
  ingredients,
  brand,
  category,
  reviewCount,
  reviews,
}: {
  description: string;
  ingredients: { ingredientName: string; percentage?: string | null }[];
  brand?: string | null;
  category?: string;
  reviewCount: number;
  reviews: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const tabs = [
    "Thông tin chi tiết",
    "Bảng thành phần",
    "Hướng dẫn sử dụng",
    `Đánh giá (${reviewCount})`,
  ];
  return (
    <section className="pdp-tabs">
      <div className="pdp-tab-list" role="tablist" aria-label="Thông tin sản phẩm">
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            id={`pdp-tab-${index}`}
            role="tab"
            aria-controls={`pdp-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
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
            {label}
          </button>
        ))}
      </div>
      <div
        className="pdp-tab-panel"
        id={`pdp-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`pdp-tab-${active}`}
        tabIndex={0}
      >
        {active === 0 && (
          <>
            <p className="pdp-tab-eyebrow">KHÁM PHÁ SẢN PHẨM</p>
            <h2>Thông tin chi tiết</h2>
            <p className="pdp-description">{description}</p>
            <dl className="pdp-specs">
              {brand && (
                <>
                  <dt>Thương hiệu</dt>
                  <dd>{brand}</dd>
                </>
              )}
              {category && (
                <>
                  <dt>Danh mục</dt>
                  <dd>{category}</dd>
                </>
              )}
            </dl>
          </>
        )}
        {active === 1 && (
          <>
            <p className="pdp-tab-eyebrow">CÔNG THỨC SẢN PHẨM</p>
            <h2>Bảng thành phần</h2>
            {ingredients.length ? (
              <ul className="pdp-ingredient-list">
                {ingredients.map((item, index) => (
                  <li key={`${item.ingredientName}-${index}`}>
                    <span>{item.ingredientName}</span>
                    {item.percentage && <span>{item.percentage}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nhà sản xuất chưa cung cấp bảng thành phần cho sản phẩm này.</p>
            )}
            <p className="pdp-tab-note">
              Vui lòng kiểm tra thông tin trên bao bì để có danh sách thành phần mới nhất.
            </p>
          </>
        )}
        {active === 2 && (
          <>
            <p className="pdp-tab-eyebrow">SỬ DỤNG AN TOÀN</p>
            <h2>Hướng dẫn sử dụng &amp; bảo quản</h2>
            <p>
              Đọc hướng dẫn sử dụng và lưu ý riêng của nhà sản xuất trên bao bì trước khi dùng. Thử
              sản phẩm trên một vùng da nhỏ nếu bạn có làn da nhạy cảm.
            </p>
            <p>
              Bảo quản theo chỉ dẫn trên bao bì, tránh ánh nắng trực tiếp và đậy kín sau khi sử
              dụng.
            </p>
          </>
        )}
        {active === 3 && reviews}
      </div>
    </section>
  );
}
