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
import { Check, Package, MapPin, Clock3 } from "lucide-react";

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
          {!order.data.isGuest && (
            <Link className="button" href={`/account/orders/${id}`}>
              Theo dõi đơn hàng
            </Link>
          )}
          <Link href="/products">Tiếp tục mua sắm</Link>
        </div>
        {order.data.isGuest && (
          <p className="muted">
            Bạn có thể mở lại trang này để xem đơn hàng trên thiết bị và trình duyệt đang dùng.
          </p>
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
