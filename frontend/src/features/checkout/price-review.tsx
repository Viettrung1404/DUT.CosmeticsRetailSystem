"use client";

import { useEffect, useRef } from "react";
import type { z } from "zod";
import type { previewSchema } from "./contracts";
import { formatPrice } from "@/features/catalog/components";

export type CheckoutQuote = z.infer<typeof previewSchema>;

export function PriceReview({
  previous,
  previousShippingFee,
  current,
  shippingFee,
  pending,
  error,
  onClose,
  onRetry,
}: {
  previous: CheckoutQuote;
  previousShippingFee: number;
  current: CheckoutQuote | null;
  shippingFee: number;
  pending: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="checkout-price-review"
      aria-labelledby="price-review-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id="price-review-title">Giá và ưu đãi đã thay đổi</h2>
      <p>Đơn hàng chưa được tạo. Vui lòng kiểm tra báo giá mới trước khi bấm đặt hàng lại.</p>
      {pending && <p role="status">Đang cập nhật báo giá…</p>}
      {error && <p role="alert">{error}</p>}
      {current && (
        <>
          <ul>
            {current.items.map((item) => {
              const before = previous.items.find(
                (line) => line.productVariantId === item.productVariantId,
              );
              return (
                <li key={item.productVariantId}>
                  <strong>
                    {item.productName}
                    {item.variantName ? ` · ${item.variantName}` : ""} × {item.quantity}
                  </strong>
                  <span>
                    {before ? formatPrice(before.totalPrice) : "—"} → {formatPrice(item.totalPrice)}
                  </span>
                  {before?.originalPrice != null &&
                    item.originalPrice != null &&
                    before.originalPrice !== item.originalPrice && (
                      <small>
                        Đơn giá gốc: {formatPrice(before.originalPrice)} →{" "}
                        {formatPrice(item.originalPrice)}
                      </small>
                    )}
                  {item.quotaQuantity != null &&
                    item.quotaQuantity > 0 &&
                    item.quotaQuantity < item.quantity && (
                      <small>
                        {item.quotaQuantity} sản phẩm được áp dụng flash sale; phần còn lại tính giá
                        thường.
                      </small>
                    )}
                </li>
              );
            })}
          </ul>
          <dl>
            {(
              [
                ["Tiền hàng", previous.subtotal, current.subtotal],
                ["Giảm giá", previous.discountAmount, current.discountAmount],
                ["Dùng xu", previous.pointsDiscount, current.pointsDiscount],
                ["Phí vận chuyển", previousShippingFee, shippingFee],
                [
                  "Tổng thanh toán",
                  previous.totalAmount - previous.shippingFee + previousShippingFee,
                  current.totalAmount - current.shippingFee + shippingFee,
                ],
              ] as const
            ).map(([label, before, after]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {formatPrice(before)} → {formatPrice(after)}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <div className="checkout-price-review-actions">
        {!current && !pending && (
          <button className="button secondary" onClick={onRetry}>
            Thử tải lại giá
          </button>
        )}
        <button className="button" onClick={onClose}>
          {current ? "Đã hiểu, xem lại đơn hàng" : "Đóng"}
        </button>
      </div>
    </dialog>
  );
}
