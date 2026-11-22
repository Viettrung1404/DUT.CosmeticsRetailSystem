"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { readBff } from "@/shared/api/browser";
import { formatPrice } from "@/features/catalog/components";
import { paymentStatusSchema } from "./contracts";
import { ContinueSepayPayment } from "./continue-sepay-payment";
import { orderDetailSchema } from "@/features/account/contracts";
import { OrderLines, OrderTotals, CheckoutSteps, StatusBadge } from "@/features/account/account-ui";
import { Check, Package, MapPin, Clock3, Truck, Search } from "lucide-react";

export function OrderResult({ id }: { id: string }) {
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: ({ signal }) => readBff(`/api/checkout/order/${id}`, orderDetailSchema, signal),
  });
  const paymentId = order.data?.payments?.find((item) =>
    ["SEPAY", "VNPAY"].includes(item.paymentMethod),
  )?.id;
  const status = useQuery({
    queryKey: ["payment", paymentId],
    enabled: !!paymentId,
    queryFn: ({ signal }) =>
      readBff(`/api/checkout/payment/${paymentId}`, paymentStatusSchema, signal),
    refetchInterval: (query) => {
      const value = query.state.data;
      return value && ["COMPLETED", "FAILED", "CANCELLED"].includes(value.paymentStatus)
        ? false
        : 10000;
    },
  });
  if (order.isPending) return <ContentLoading variant="detail" label="Đang tải đơn hàng…" />;
  if (order.isError)
    return (
      <p role="alert">
        Không xem được đơn hàng này trong phiên hiện tại.{" "}
        <button type="button" onClick={() => order.refetch()}>
          Thử lại
        </button>{" "}
        hoặc <Link href="/login">đăng nhập</Link> nếu bạn mua bằng tài khoản.
      </p>
    );
  const payment = status.data;
  const completed = !paymentId || payment?.paymentStatus === "COMPLETED";
  const currentStatus = payment?.orderStatus ?? order.data.status;
  const cancelled = currentStatus === "CANCELLED";
  const isGuest = Boolean(order.data.isGuest);
  const guestPhone = order.data.shippingAddress?.phone || "";
  const guestTrackingUrl = `/order-tracking?orderNumber=${encodeURIComponent(
    order.data.orderNumber,
  )}&phone=${encodeURIComponent(guestPhone)}`;
  return (
    <div className="result-page">
      <CheckoutSteps current={2} />
      <section className="result-hero">
        <span className={`result-symbol ${!completed || cancelled ? "is-pending" : ""}`}>
          {completed && !cancelled ? <Check size={40} /> : <Clock3 size={40} />}
        </span>
        <h1>
          {cancelled
            ? "Đơn hàng đã được hủy"
            : currentStatus === "PENDING_PAYMENT"
              ? "Đơn hàng đang chờ thanh toán"
              : completed && currentStatus === "PENDING"
                ? "Đơn hàng đang chờ xác nhận"
                : completed
                  ? "Đặt hàng thành công!"
                  : "Đơn hàng đã được tiếp nhận"}
        </h1>
        <p>
          {cancelled
            ? "Đơn hàng đã hủy. Nếu đã chuyển khoản, vui lòng liên hệ cửa hàng để tra soát và hoàn tiền."
            : paymentId
              ? payment?.paymentStatus === "COMPLETED"
                ? "Hệ thống đã ghi nhận thanh toán. Vui lòng xem trạng thái đơn hàng bên dưới."
                : payment?.paymentStatus === "FAILED" || payment?.paymentStatus === "CANCELLED"
                  ? "Thanh toán chưa thành công. Bạn có thể kiểm tra và thử thanh toán lại."
                  : "Hệ thống đang chờ xác nhận thanh toán."
              : "Cảm ơn bạn đã tin tưởng GlowUp. Thanh toán khi nhận hàng theo đơn đã xác nhận."}
        </p>
        <div className="result-reference">
          <div>
            <small>Mã đơn hàng của bạn</small>
            <strong>{order.data.orderNumber}</strong>
          </div>
          <div>
            <small>Tổng thanh toán</small>
            <strong>{formatPrice(order.data.totalAmount)}</strong>
          </div>
          <StatusBadge value={payment?.orderStatus ?? order.data.status} />
        </div>
        <ContinueSepayPayment
          orderId={id}
          orderStatus={currentStatus}
          payments={
            payment
              ? [
                  {
                    id: payment.paymentId,
                    paymentMethod: payment.method,
                    status: payment.paymentStatus,
                  },
                ]
              : order.data.payments
          }
        />
        <div className="result-actions">
          {!isGuest ? (
            <Link className="button" href={`/account/orders/${id}`}>
              Theo dõi đơn hàng
            </Link>
          ) : (
            <Link className="button" href={guestTrackingUrl}>
              Theo dõi đơn hàng
            </Link>
          )}
          <Link href="/products">Tiếp tục mua sắm</Link>
        </div>
        {isGuest && (
          <div
            style={{
              marginTop: 20,
              padding: "16px 20px",
              borderRadius: 12,
              backgroundColor: currentStatus === "PENDING_PAYMENT" ? "#fffbeb" : "#f0fdf4",
              border: `1px solid ${currentStatus === "PENDING_PAYMENT" ? "#fde68a" : "#bbf7d0"}`,
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Truck
              size={22}
              style={{
                color: currentStatus === "PENDING_PAYMENT" ? "#d97706" : "#16a34a",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: currentStatus === "PENDING_PAYMENT" ? "#92400e" : "#166534",
                  margin: "0 0 4px",
                }}
              >
                {currentStatus === "PENDING_PAYMENT"
                  ? "Tra cứu đơn hàng khi chưa thanh toán"
                  : "Tra cứu & theo dõi hành trình đơn hàng"}
              </h4>
              <p
                style={{
                  fontSize: 13,
                  color: currentStatus === "PENDING_PAYMENT" ? "#78350f" : "#15803d",
                  margin: "0 0 10px",
                  lineHeight: 1.5,
                }}
              >
                {currentStatus === "PENDING_PAYMENT"
                  ? "Bạn đang đặt hàng với tư cách Khách. Bạn có thể tra cứu mã QR chuyển khoản và tiến trình xử lý đơn hàng bất kỳ lúc nào tại:"
                  : "Bạn đang đặt hàng với tư cách Khách. Bạn có thể theo dõi tiến trình đóng gói và lộ trình giao vận theo thời gian thực tại:"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href={guestTrackingUrl}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: currentStatus === "PENDING_PAYMENT" ? "#d97706" : "#16a34a",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Search size={14} /> Tra cứu đơn hàng tại đây
                </Link>
                <span
                  style={{
                    fontSize: 12,
                    color: currentStatus === "PENDING_PAYMENT" ? "#b45309" : "#166534",
                    backgroundColor: currentStatus === "PENDING_PAYMENT" ? "#fef3c7" : "#dcfce7",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  Mã đơn: {order.data.orderNumber} {guestPhone ? `• SĐT: ${guestPhone}` : ""}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
      <div className="result-order-details">
        <section className="account-surface order-recipient">
          <h2>
            <MapPin size={20} style={{ display: "inline", marginRight: 8 }} />
            Thông tin nhận hàng
          </h2>
          {order.data.shippingAddress && (
            <>
              <p>
                <strong>{order.data.shippingAddress.recipientName}</strong> ·{" "}
                {order.data.shippingAddress.phone}
              </p>
              <p>
                {[
                  order.data.shippingAddress.addressLine,
                  order.data.shippingAddress.ward,
                  order.data.shippingAddress.district,
                  order.data.shippingAddress.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </>
          )}
        </section>
        <section className="account-surface">
          <h2>
            <Package size={20} style={{ display: "inline", marginRight: 8 }} />
            Sản phẩm đã đặt
          </h2>
          <OrderLines items={order.data.items} />
          <OrderTotals order={order.data} />
        </section>
      </div>
    </div>
  );
}
