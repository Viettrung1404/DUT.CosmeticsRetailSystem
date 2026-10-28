"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { readBff } from "@/shared/api/browser";
import { cartSchema } from "./cart";
import { CatalogImage, formatPrice } from "./components";
export function CartContents() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["cart"],
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });
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
  if (!data.items.length)
    return (
      <div className="catalog-empty">
        Giỏ hàng đang trống. <Link href="/products">Khám phá sản phẩm</Link>
      </div>
    );
  return (
    <div className="cart-contents">
      <div className="cart-items">
        {data.items.map((item) => (
          <article key={item.id} className="cart-item">
            <CatalogImage src={item.thumbnailUrl} alt={item.productName || "Sản phẩm"} />
            <div>
              <h2>{item.productName || "Sản phẩm GlowUp"}</h2>
              <p>{item.variantName}</p>
              <small>Số lượng: {item.quantity}</small>
              {!item.isAvailable && <p className="cart-warning">Sản phẩm hiện không khả dụng</p>}
            </div>
            <strong>{formatPrice(item.totalPrice)}</strong>
          </article>
        ))}
      </div>
      <aside className="cart-summary">
        <h2>Tóm tắt đơn hàng</h2>
        <p>{data.totalQuantity} sản phẩm</p>
        <strong>{formatPrice(data.subtotal)}</strong>
        <p>Đơn hàng và phí giao hàng sẽ được xác nhận ở bước thanh toán.</p>
        <Link href="/products" className="button">
          Tiếp tục mua sắm
        </Link>
      </aside>
    </div>
  );
}
