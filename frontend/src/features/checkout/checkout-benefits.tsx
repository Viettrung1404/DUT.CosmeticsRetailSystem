"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import { useState, type CSSProperties } from "react";
import { z } from "zod";
import { Check, ChevronRight, Coins, Gift, TicketPercent, X } from "lucide-react";
import { checkoutBenefitsSchema, previewSchema } from "./contracts";
import { formatPrice } from "@/features/catalog/components";

export function maximumCheckoutPoints(
  policy: z.infer<typeof checkoutBenefitsSchema>["points"] | undefined,
  quote: z.infer<typeof previewSchema> | null | undefined,
) {
  if (!policy || !quote || policy.balance <= 0) return 0;
  const base = Math.max(0, quote.subtotal - quote.discountAmount);
  const step = policy.step || 1;
  const value = policy.value || 1;
  const maxRatio = policy.maxRatio ?? 1;
  if (Math.min(policy.balance * value, base * maxRatio) < policy.minimumBalance) return 0;
  return Math.floor(Math.min(policy.balance, Math.floor((base * maxRatio) / value)) / step) * step;
}

export function CheckoutBenefits({
  data,
  pending,
  loadError,
  retry,
  appliedCode,
  quote,
  pointsUsed,
  maximumPoints,
  onPointsChange,
  onApply,
  disabled,
  pointsDisabled,
}: {
  data?: z.infer<typeof checkoutBenefitsSchema>;
  pending: boolean;
  loadError: boolean;
  retry: () => void;
  appliedCode: string;
  quote: z.infer<typeof previewSchema> | null;
  pointsUsed: number;
  maximumPoints: number;
  onPointsChange: (points: number) => void;
  onApply: (code: string) => Promise<void>;
  disabled: boolean;
  pointsDisabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || applying;
  const pointsLocked = (pointsDisabled ?? disabled) || applying;
  const coinProgress =
    maximumPoints > 0 ? Math.min(100, Math.max(0, (pointsUsed / maximumPoints) * 100)) : 0;
  async function apply(code: string) {
    setError("");
    setApplying(true);
    try {
      await onApply(code.trim());
      setDraft("");
      setOpen(false);
    } catch {
      setError(
        "Mã chưa áp dụng được cho đơn này. Vui lòng kiểm tra hạn dùng, giá trị đơn và điều kiện của mã.",
      );
    } finally {
      setApplying(false);
    }
  }
  return (
    <div className="checkout-benefits">
      <div className="checkout-voucher-title">
        <TicketPercent size={19} />
        <strong>Voucher GlowUp</strong>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          disabled={applying}
        >
          Chọn mã ưu đãi <ChevronRight size={16} />
        </button>
      </div>
      <div className="checkout-coupon-input">
        <TicketPercent size={18} />
        <input
          aria-label="Mã ưu đãi"
          maxLength={50}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (draft.trim() && !locked) void apply(draft);
            }
          }}
          placeholder="Nhập mã giảm giá của bạn"
        />
        <button type="button" disabled={!draft.trim() || locked} onClick={() => void apply(draft)}>
          {applying ? "Đang kiểm tra…" : "Áp dụng"}
        </button>
      </div>
      {appliedCode && (
        <div className="checkout-applied-coupon" role="status">
          <Check size={16} />
          <span>
            <strong>{appliedCode}</strong>
            {quote ? ` · Giảm ${formatPrice(quote.couponDiscount ?? 0)}` : " · Đang cập nhật…"}
          </span>
          <button
            type="button"
            aria-label="Gỡ mã ưu đãi"
            disabled={locked}
            onClick={() => void apply("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="checkout-inline-error">
          {error}
        </p>
      )}
      {open && (
        <div className="checkout-voucher-wallet" aria-label="Kho voucher của bạn">
          <div className="checkout-wallet-heading">
            <strong>
              <Gift size={16} /> Ưu đãi dành cho bạn
            </strong>
            <small>Mỗi đơn dùng 1 voucher</small>
          </div>
          {pending ? (
            <ContentLoading variant="list" label="Đang tải voucher…" heading={false} compact />
          ) : loadError ? (
            <p role="alert">
              Chưa tải được kho voucher.{" "}
              <button type="button" onClick={retry}>
                Thử lại
              </button>
            </p>
          ) : !data?.coupons.length ? (
            <p className="checkout-voucher-empty">
              Chưa có voucher khả dụng. Bạn vẫn có thể nhập mã được cửa hàng cung cấp.
            </p>
          ) : (
            <div className="checkout-voucher-list">
              {data.coupons.map((coupon) => {
                const base = quote
                  ? quote.subtotal -
                    (quote.lineDiscount ?? quote.discountAmount - (quote.couponDiscount ?? 0))
                  : 0;
                const eligible = !!quote && base >= coupon.minOrderAmount;
                return (
                  <article
                    key={coupon.id}
                    className={`checkout-voucher-card ${eligible ? "" : "is-unavailable"}`}
                  >
                    <div className="checkout-voucher-stamp">
                      <TicketPercent size={26} />
                      <span>GLOWUP</span>
                    </div>
                    <div>
                      <strong>
                        {coupon.discountType === "PERCENTAGE"
                          ? `Giảm ${coupon.discountValue}%`
                          : `Giảm ${formatPrice(coupon.discountValue)}`}
                      </strong>
                      <p>
                        Đơn từ {formatPrice(coupon.minOrderAmount)}
                        {coupon.maxDiscountAmount != null
                          ? ` · Tối đa ${formatPrice(coupon.maxDiscountAmount)}`
                          : ""}
                      </p>
                      <code>{coupon.code}</code>
                      <small>
                        HSD:{" "}
                        {new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(
                          new Date(coupon.endDate),
                        )}
                      </small>
                      {!eligible && <small>Cần đủ giá trị đơn sau ưu đãi sản phẩm</small>}
                    </div>
                    <button
                      type="button"
                      disabled={!eligible || locked || appliedCode === coupon.code}
                      onClick={() => void apply(coupon.code)}
                    >
                      {appliedCode === coupon.code ? "Đã chọn" : "Dùng mã"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="checkout-coins">
        <div className="checkout-coins-heading">
          <span className="checkout-coin-icon">
            <Coins size={23} />
          </span>
          <div>
            <strong>Xu GlowUp</strong>
            <small>
              {pending
                ? "Đang tải số dư…"
                : data
                  ? `Bạn có ${data.points.balance.toLocaleString("vi-VN")} xu${
                      maximumPoints > 0
                        ? ` · Tối đa ${maximumPoints.toLocaleString("vi-VN")} xu/đơn`
                        : ""
                    }`
                  : "Chưa tải được số dư xu"}
            </small>
          </div>
          <button
            type="button"
            className="checkout-switch"
            role="switch"
            aria-label="Sử dụng xu GlowUp"
            aria-checked={pointsUsed > 0}
            disabled={!maximumPoints || pointsLocked}
            onClick={() => onPointsChange(pointsUsed ? 0 : maximumPoints)}
          >
            <span />
          </button>
        </div>
        {data && (
          <>
            <div className="checkout-coins-value">
              <span>
                {pointsUsed > 0 ? (
                  <>
                    Đang chọn: <strong>{pointsUsed.toLocaleString("vi-VN")} xu</strong>
                  </>
                ) : maximumPoints > 0 ? (
                  "Kéo thanh trượt để chọn số xu muốn dùng"
                ) : (
                  "Chưa đủ điều kiện dùng xu cho đơn này"
                )}
              </span>
              <strong className={pointsUsed > 0 ? "is-active" : "is-hint"}>
                {pointsUsed > 0
                  ? `−${formatPrice(pointsUsed * data.points.value)}`
                  : maximumPoints > 0
                    ? `Tối đa −${formatPrice(maximumPoints * data.points.value)}`
                    : `1 xu = ${formatPrice(data.points.value)}`}
              </strong>
            </div>
            {maximumPoints > 0 && (
              <>
                <div className="checkout-coins-slider-wrap">
                  <input
                    type="range"
                    className="checkout-coins-slider"
                    aria-label="Số xu muốn sử dụng"
                    min={0}
                    max={maximumPoints}
                    step={data.points.step}
                    value={pointsUsed}
                    disabled={pointsLocked}
                    style={{ "--coin-progress": `${coinProgress}%` } as CSSProperties}
                    onChange={(event) => onPointsChange(Number(event.target.value))}
                  />
                  <label className="checkout-coins-number">
                    <input
                      type="number"
                      aria-label="Nhập số xu muốn sử dụng"
                      min={0}
                      max={maximumPoints}
                      step={data.points.step}
                      value={pointsUsed}
                      disabled={pointsLocked}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        if (!Number.isFinite(raw)) {
                          onPointsChange(0);
                          return;
                        }
                        const clamped = Math.min(maximumPoints, Math.max(0, Math.floor(raw)));
                        const step = data.points.step || 1;
                        onPointsChange(Math.floor(clamped / step) * step);
                      }}
                    />
                    <span>xu</span>
                  </label>
                </div>
                <div className="checkout-coins-range">
                  <button
                    type="button"
                    disabled={pointsLocked || pointsUsed === 0}
                    onClick={() => onPointsChange(0)}
                  >
                    0 xu
                  </button>
                  <button
                    type="button"
                    disabled={pointsLocked || pointsUsed === maximumPoints}
                    onClick={() => onPointsChange(maximumPoints)}
                  >
                    Dùng tối đa {maximumPoints.toLocaleString("vi-VN")} xu
                  </button>
                </div>
              </>
            )}
            <p>Dùng xu tương đương tiền thật (1 xu = 1đ). Khấu trừ tối đa 100% tiền hàng.</p>
          </>
        )}
        {loadError && (
          <button type="button" onClick={retry}>
            Tải lại số dư
          </button>
        )}
      </div>
    </div>
  );
}
