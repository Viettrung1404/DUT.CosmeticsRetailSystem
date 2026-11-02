"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import { useState } from "react";
import { z } from "zod";
import { Check, ChevronRight, Coins, Gift, TicketPercent, X } from "lucide-react";
import { checkoutBenefitsSchema, previewSchema } from "./contracts";
import { formatPrice } from "@/features/catalog/components";

export function maximumCheckoutPoints(
  policy: z.infer<typeof checkoutBenefitsSchema>["points"] | undefined,
  quote: z.infer<typeof previewSchema> | null | undefined,
) {
  if (!policy || !quote || policy.balance < policy.minimumBalance) return 0;
  const base = Math.max(0, quote.subtotal - quote.discountAmount);
  return (
    Math.floor(
      Math.min(policy.balance, Math.floor((base * policy.maxRatio) / policy.value)) / policy.step,
    ) * policy.step
  );
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
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || applying;
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
                  ? `Bạn có ${data.points.balance.toLocaleString("vi-VN")} xu`
                  : "Chưa tải được số dư xu"}
            </small>
          </div>
          <button
            type="button"
            className="checkout-switch"
            role="switch"
            aria-label="Sử dụng xu GlowUp"
            aria-checked={pointsUsed > 0}
            disabled={!maximumPoints || locked}
            onClick={() => onPointsChange(pointsUsed ? 0 : maximumPoints)}
          >
            <span />
          </button>
        </div>
        {data && (
          <>
            <div className="checkout-coins-value">
              <span>
                {pointsUsed
                  ? `Dùng ${pointsUsed.toLocaleString("vi-VN")} xu`
                  : "Dùng xu để giảm tiền hàng"}
              </span>
              <strong>
                {pointsUsed
                  ? `−${formatPrice(pointsUsed * data.points.value)}`
                  : `1 xu = ${formatPrice(data.points.value)}`}
              </strong>
            </div>
            {maximumPoints > 0 && (
              <>
                <input
                  type="range"
                  aria-label="Số xu muốn sử dụng"
                  min={0}
                  max={maximumPoints}
                  step={data.points.step}
                  value={pointsUsed}
                  disabled={locked}
                  onChange={(event) => onPointsChange(Number(event.target.value))}
                />
                <div className="checkout-coins-range">
                  <span>0 xu</span>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => onPointsChange(maximumPoints)}
                  >
                    Dùng tối đa {maximumPoints.toLocaleString("vi-VN")} xu
                  </button>
                </div>
              </>
            )}
            <p>
              {data.points.balance < data.points.minimumBalance
                ? `Tích lũy đủ ${data.points.minimumBalance.toLocaleString("vi-VN")} xu để bắt đầu sử dụng.`
                : `Dùng theo mức ${data.points.step.toLocaleString("vi-VN")} xu, tối đa ${Math.round(data.points.maxRatio * 100)}% tiền hàng sau giảm giá.`}
            </p>
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
