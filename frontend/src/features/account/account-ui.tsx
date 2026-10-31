import Link from "next/link";
import { Check, Package, ChevronRight, ShoppingBag, CreditCard, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
export const orderStatusText: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã trả hàng",
};
export const returnStatusText: Record<string, string> = {
  REQUESTED: "Đã gửi yêu cầu",
  APPROVED: "Đã chấp thuận",
  RECEIVED: "Đã nhận hàng",
  INSPECTED: "Đã kiểm tra",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
};
export function AccountHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="account-screen-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </header>
  );
}
export function StatusBadge({
  value,
  kind = "order",
}: {
  value: string;
  kind?: "order" | "return";
}) {
  return (
    <span className={`order-status status-${value.toLowerCase()}`}>
      {(kind === "order" ? orderStatusText : returnStatusText)[value] || value}
    </span>
  );
}
export function OrderProgress({ status }: { status: string }) {
  const stages = [
    { text: "Đặt hàng", icon: ShoppingBag },
    { text: "Xác nhận", icon: CheckCircle2 },
    { text: "Đang giao", icon: Package },
    { text: "Hoàn thành", icon: Check },
  ];
  const current =
    status === "PENDING"
      ? 0
      : ["CONFIRMED", "PROCESSING"].includes(status)
        ? 1
        : status === "SHIPPING"
          ? 2
          : ["DELIVERED", "COMPLETED"].includes(status)
            ? 3
            : -1;
  return (
    <ol className="order-progress" aria-label="Tiến trình đơn hàng">
      {stages.map((stage, index) => (
        <li
          key={stage.text}
          className={index <= current ? "is-complete" : ""}
          aria-current={index === current ? "step" : undefined}
        >
          <span>
            <stage.icon size={21} />
          </span>
          <strong>{stage.text}</strong>
        </li>
      ))}
    </ol>
  );
}
type Line = {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  totalPrice: number;
  thumbnailUrl?: string | null;
};
export function OrderLines({ items }: { items: Line[] }) {
  return (
    <div className="order-lines">
      {items.map((item) => (
        <article key={item.id}>
          <div className="order-line-image">
            {item.thumbnailUrl ? (
              <CatalogImage src={item.thumbnailUrl} alt={item.productName} />
            ) : (
              <Package size={28} />
            )}
          </div>
          <div>
            <h3>{item.productName}</h3>
            <p>{item.variantName}</p>
            <small>Số lượng: {item.quantity}</small>
          </div>
          <strong>{formatPrice(item.totalPrice)}</strong>
        </article>
      ))}
    </div>
  );
}
export function OrderTotals({
  order,
}: {
  order: { subtotal: number; discountAmount: number; shippingFee: number; totalAmount: number };
}) {
  return (
    <dl className="order-totals">
      <div>
        <dt>Tạm tính</dt>
        <dd>{formatPrice(order.subtotal)}</dd>
      </div>
      <div>
        <dt>Giảm giá</dt>
        <dd>−{formatPrice(order.discountAmount)}</dd>
      </div>
      <div>
        <dt>Phí vận chuyển</dt>
        <dd>{formatPrice(order.shippingFee)}</dd>
      </div>
      <div className="order-total-final">
        <dt>Thành tiền</dt>
        <dd>{formatPrice(order.totalAmount)}</dd>
      </div>
    </dl>
  );
}
export function CheckoutSteps({ current = 1 }: { current?: number }) {
  return (
    <ol className="checkout-steps" aria-label="Các bước mua hàng">
      {[
        { label: "Giỏ hàng", href: "/cart", icon: ShoppingBag },
        { label: "Thanh toán", href: "/checkout", icon: CreditCard },
        { label: "Hoàn tất", icon: Check },
      ].map((step, index) => (
        <li
          key={step.label}
          className={index <= current ? "is-complete" : ""}
          aria-current={index === current ? "step" : undefined}
        >
          <span>{index < current ? <Check size={16} /> : <step.icon size={16} />}</span>
          {step.href && index < current ? (
            <Link href={step.href}>{step.label}</Link>
          ) : (
            <strong>{step.label}</strong>
          )}
          {index < 2 && <ChevronRight size={14} />}
        </li>
      ))}
    </ol>
  );
}
