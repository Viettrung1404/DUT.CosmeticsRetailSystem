"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { cartSchema } from "./cart";
import { CatalogImage, formatPrice } from "./components";
import {
  ArrowLeft,
  ShoppingCart,
  Info,
  Truck,
  LockKeyhole,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Ticket,
} from "lucide-react";
import { previewSchema } from "@/features/checkout/contracts";
import { useHydrated } from "@/shared/lib/use-hydrated";

export function CartContents({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const client = useQueryClient();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const [error, setError] = useState("");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["cart"],
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });
  const selection =
    data?.items
      .filter((item) => item.isSelected && item.isAvailable && !item.isQuantityExceeded)
      .map((item) => ({ variantId: item.productVariantId, quantity: item.quantity })) ?? [];
  const quote = useQuery({
    queryKey: ["cart-quote", selection],
    enabled: !compact && selection.length > 0,
    queryFn: ({ signal }) =>
      requestBff("/api/checkout/preview", previewSchema, {
        method: "POST",
        body: { items: selection },
        signal,
      }),
    retry: false,
  });
  async function selectAll() {
    if (mutationInFlight.current || !data) return;
    const available = data.items.filter((item) => item.isAvailable);
    const selected = !available.every((item) => item.isSelected);
    mutationInFlight.current = true;
    setBusy("all");
    setError("");
    try {
      for (const item of available.filter((item) => item.isSelected !== selected))
        client.setQueryData(
          ["cart"],
          await requestBff(`/api/cart/items/${item.id}`, cartSchema, {
            method: "PUT",
            body: { isSelected: selected },
          }),
        );
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      mutationInFlight.current = false;
      setBusy(null);
    }
  }
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
  if (!hydrated || isPending)
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
    <>
      {!compact && (
        <>
          <header className="cart-page-heading">
            <h1>
              Giỏ hàng của bạn <span>({data.totalQuantity} sản phẩm)</span>
            </h1>
            <p>
              <ShieldCheck size={16} />
              Kiểm tra sản phẩm trước khi thanh toán
            </p>
          </header>
          <div className="cart-shipping-notice">
            <Truck size={22} />
            <p>
              {quote.data ? (
                quote.data.shippingFee === 0 ? (
                  <>
                    Đơn hàng đã chọn được <strong>MIỄN PHÍ VẬN CHUYỂN!</strong>
                  </>
                ) : (
                  <>
                    Phí vận chuyển đơn hàng đã chọn:{" "}
                    <strong>{formatPrice(quote.data.shippingFee)}</strong>
                  </>
                )
              ) : (
                "Chọn sản phẩm để kiểm tra phí vận chuyển và ưu đãi."
              )}
            </p>
            {quote.data?.shippingFee === 0 && <small>ĐẠT TIÊU CHUẨN</small>}
          </div>
        </>
      )}
      <div className={`cart-contents ${compact ? "cart-compact" : ""}`}>
        <div className="cart-left-column">
          {!compact && (
            <div className="cart-selection-notice">
              <Info size={18} />
              <p>
                Đã chọn{" "}
                <strong>
                  {items.filter((item) => item.isSelected).length}/{items.length} sản phẩm
                </strong>{" "}
                để thanh toán (sản phẩm chưa chọn sẽ được lưu lại trong giỏ cho lần mua sau).
              </p>
            </div>
          )}
          <div className="cart-items">
            {!compact && (
              <div className="cart-table-head">
                <label className="cart-select-all">
                  <input
                    type="checkbox"
                    checked={data.items
                      .filter((item) => item.isAvailable)
                      .every((item) => item.isSelected)}
                    disabled={!!busy}
                    onChange={() => void selectAll()}
                  />
                  Chọn tất cả ({items.length} sản phẩm)
                </label>
                <span>Đơn giá</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
            )}
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                {!compact && (
                  <input
                    type="checkbox"
                    aria-label={`Chọn mua ${item.productName}`}
                    checked={item.isSelected}
                    disabled={!!busy || !item.isAvailable}
                    onChange={(event) =>
                      void change(item.id, "PUT", { isSelected: event.target.checked })
                    }
                  />
                )}
                <CatalogImage src={item.thumbnailUrl} alt={item.productName || "Sản phẩm"} />
                <div className="cart-item-copy">
                  <h2>{item.productName || "Sản phẩm GlowUp"}</h2>
                  <p>{item.variantName}</p>
                  {compact && (
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
                  )}
                  <span className="cart-mobile-price">{formatPrice(item.currentPrice)}</span>
                  {!item.isAvailable && (
                    <p className="cart-warning">Sản phẩm hiện không khả dụng</p>
                  )}
                  {item.isQuantityExceeded && (
                    <p className="cart-warning">Số lượng vượt tồn kho hiện tại</p>
                  )}
                  {item.priceChanged && (
                    <p className="cart-warning">Giá đã thay đổi. Vui lòng kiểm tra lại.</p>
                  )}
                </div>
                {!compact && (
                  <strong className="cart-unit-price">{formatPrice(item.currentPrice)}</strong>
                )}
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
                <div className="cart-line-total">
                  <strong>{formatPrice(item.totalPrice)}</strong>
                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`Xóa ${item.productName}`}
                    disabled={!!busy}
                    onClick={() => void change(item.id, "DELETE")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {!compact && (
                  <p className="cart-row-note">
                    {item.isSelected
                      ? "Đã chọn thanh toán"
                      : "Lưu mua sau · Chọn sản phẩm khi bạn sẵn sàng"}
                  </p>
                )}
              </article>
            ))}
          </div>
          {!compact && (
            <div className="cart-voucher-notice">
              <h2>
                <Ticket size={19} />
                Mã giảm giá & Voucher ưu đãi
              </h2>
              <p>Nhập mã giảm giá ở bước thanh toán để kiểm tra điều kiện áp dụng cho đơn hàng.</p>
              <Link href="/promotions">Khám phá ưu đãi →</Link>
            </div>
          )}
        </div>
        <div className="cart-right-column">
          <aside className="cart-summary">
            <h2>Tóm tắt đơn hàng</h2>
            <dl className="order-totals">
              <div>
                <dt>Tạm tính ({data.selectedQuantity} sản phẩm đã chọn):</dt>
                <dd>{formatPrice(quote.data?.subtotal ?? data.selectedSubtotal)}</dd>
              </div>
              {quote.data && (
                <>
                  <div>
                    <dt>Giảm giá khuyến mãi:</dt>
                    <dd className="cart-discount">−{formatPrice(quote.data.discountAmount)}</dd>
                  </div>
                  <div>
                    <dt>Phí vận chuyển:</dt>
                    <dd className={quote.data.shippingFee === 0 ? "cart-free-shipping" : ""}>
                      {quote.data.shippingFee === 0
                        ? "Miễn phí"
                        : formatPrice(quote.data.shippingFee)}
                    </dd>
                  </div>
                </>
              )}
              <div className="order-total-final">
                <dt>Tổng thanh toán:</dt>
                <dd>{formatPrice(quote.data?.totalAmount ?? data.selectedSubtotal)}</dd>
              </div>
            </dl>
            {!quote.data && <p>Phí giao hàng và ưu đãi được xác nhận ở bước thanh toán.</p>}
            {eligible.length > 0 &&
            eligible.length === data.items.filter((item) => item.isSelected).length ? (
              <Link href="/checkout" className="button" onClick={onNavigate}>
                <ShoppingCart size={18} /> Tiến hành thanh toán ({eligible.length})
              </Link>
            ) : (
              <p className="cart-warning">Chọn sản phẩm còn hàng để thanh toán.</p>
            )}
            <Link
              href={compact ? "/cart" : "/products"}
              className="cart-continue"
              onClick={onNavigate}
            >
              <ArrowLeft size={14} /> {compact ? "Xem giỏ hàng đầy đủ" : "Tiếp tục mua sắm"}
            </Link>
          </aside>
          {!compact && (
            <aside className="cart-assurances">
              <h2>YÊN TÂM MUA SẮM TẠI GLOWUP</h2>
              <div>
                <ShieldCheck />
                <p>
                  <strong>Thông tin minh bạch</strong>
                  <small>Kiểm tra giá và ưu đãi trước khi đặt hàng</small>
                </p>
              </div>
              <div>
                <LockKeyhole />
                <p>
                  <strong>Bảo mật thông tin đơn hàng</strong>
                  <small>Thanh toán COD hoặc qua VNPAY</small>
                </p>
              </div>
              <div>
                <RotateCcw />
                <p>
                  <strong>Đổi trả trong 7 ngày</strong>
                  <small>Theo điều kiện chính sách đổi trả</small>
                </p>
              </div>
            </aside>
          )}
        </div>
        {error && (
          <p role="alert" className="cart-warning">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
