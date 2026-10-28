"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { cartSchema } from "./cart";
import { CatalogImage, formatPrice } from "./components";

export function CartContents({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const [error, setError] = useState("");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["cart"],
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });
  async function change(id: string, method: "PUT" | "DELETE", body: object = {}) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setBusy(id);
    setError("");
    try {
      const result = await requestBff(`/api/cart/items/${id}`, cartSchema, { method, body });
      client.setQueryData(["cart"], result);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      mutationInFlight.current = false;
      setBusy(null);
    }
  }
  if (isPending)
    return (
      <div className="catalog-empty" role="status">
        Đang tải giỏ hàng…
      </div>
    );
  if (isError)
    return (
      <div className="catalog-empty">
        Không tải được giỏ hàng. <button onClick={() => refetch()}>Thử lại</button>
      </div>
    );
  const items = [
    ...data.items,
    ...data.unavailableItems.filter(
      (item) => !data.items.some((existing) => existing.id === item.id),
    ),
  ];
  if (!items.length)
    return (
      <div className="catalog-empty">
        Giỏ hàng đang trống.{" "}
        <Link href="/products" onClick={onNavigate}>
          Khám phá sản phẩm
        </Link>
      </div>
    );
  const eligible = data.items.filter(
    (item) => item.isSelected && item.isAvailable && !item.isQuantityExceeded,
  );
  return (
    <div className={`cart-contents ${compact ? "cart-compact" : ""}`}>
      <div className="cart-items">
        {items.map((item) => (
          <article key={item.id} className="cart-item">
            <CatalogImage src={item.thumbnailUrl} alt={item.productName || "Sản phẩm"} />
            <div>
              <h2>{item.productName || "Sản phẩm GlowUp"}</h2>
              <p>{item.variantName}</p>
              <label className="cart-select">
                <input
                  type="checkbox"
                  checked={item.isSelected}
                  disabled={!!busy || !item.isAvailable}
                  onChange={(event) =>
                    void change(item.id, "PUT", { isSelected: event.target.checked })
                  }
                />{" "}
                Chọn mua
              </label>
              <div className="cart-quantity">
                <button
                  type="button"
                  aria-label={`Giảm số lượng ${item.productName}`}
                  disabled={!!busy || item.quantity <= 1}
                  onClick={() => void change(item.id, "PUT", { quantity: item.quantity - 1 })}
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  aria-label={`Tăng số lượng ${item.productName}`}
                  disabled={!!busy || item.quantity >= 100}
                  onClick={() => void change(item.id, "PUT", { quantity: item.quantity + 1 })}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="cart-remove"
                disabled={!!busy}
                onClick={() => void change(item.id, "DELETE")}
              >
                Xóa
              </button>
              {!item.isAvailable && <p className="cart-warning">Sản phẩm hiện không khả dụng</p>}
              {item.isQuantityExceeded && (
                <p className="cart-warning">Số lượng vượt tồn kho hiện tại</p>
              )}
              {item.priceChanged && (
                <p className="cart-warning">Giá đã thay đổi. Vui lòng kiểm tra lại.</p>
              )}
            </div>
            <strong>{formatPrice(item.totalPrice)}</strong>
          </article>
        ))}
      </div>
      <aside className="cart-summary">
        <h2>Tóm tắt đơn hàng</h2>
        <p>{data.selectedQuantity} sản phẩm đã chọn</p>
        <strong>{formatPrice(data.selectedSubtotal)}</strong>
        <p>Phí giao hàng và ưu đãi sẽ được xác nhận ở bước thanh toán.</p>
        {eligible.length > 0 &&
        eligible.length === data.items.filter((item) => item.isSelected).length ? (
          <Link href="/checkout" className="button" onClick={onNavigate}>
            Tiến hành thanh toán
          </Link>
        ) : (
          <p className="cart-warning">Chọn sản phẩm còn hàng để thanh toán.</p>
        )}
        <Link href="/products" className="button cart-continue" onClick={onNavigate}>
          Tiếp tục mua sắm
        </Link>
      </aside>
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}
    </div>
  );
}
