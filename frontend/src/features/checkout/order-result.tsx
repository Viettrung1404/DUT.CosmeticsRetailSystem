"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { formatPrice } from "@/features/catalog/components";
import { orderSchema, paymentSchema, paymentStatusSchema } from "./contracts";
import { safeVnpayUrl } from "./payment-url";

export function OrderResult({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: ({ signal }) => readBff(`/api/checkout/order/${id}`, orderSchema, signal),
  });
  const paymentId = order.data?.payments?.find((item) => item.paymentMethod === "VNPAY")?.id;
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
  async function retry() {
    setBusy(true);
    setError("");
    try {
      const result = await requestBff("/api/checkout/payment", paymentSchema, {
        method: "POST",
        body: { orderId: id },
      });
      const url = safeVnpayUrl(result.paymentUrl);
      if (!url) {
        setError("Chưa có liên kết thanh toán. Vui lòng kiểm tra trạng thái sau.");
        return;
      }
      window.location.assign(url);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (order.isPending) return <p role="status">Đang tải đơn hàng…</p>;
  if (order.isError)
    return (
      <p role="alert">
        Không xem được đơn hàng này. <Link href="/login">Đăng nhập</Link> hoặc thử lại.
      </p>
    );
  const payment = status.data;
  return (
    <section className="checkout-panel payment-result">
      <h1>Đơn hàng {order.data.orderNumber}</h1>
      <p>
        Tổng tiền: <strong>{formatPrice(order.data.totalAmount)}</strong>
      </p>
      {paymentId ? (
        <>
          <p>
            {payment?.paymentStatus === "COMPLETED"
              ? "VNPAY đã xác nhận thanh toán."
              : payment?.paymentStatus === "FAILED" || payment?.paymentStatus === "CANCELLED"
                ? "Thanh toán VNPAY chưa thành công."
                : "Đang chờ xác nhận thanh toán VNPAY."}
          </p>
          <p>Trạng thái đơn: {payment?.orderStatus ?? order.data.status}</p>
          {(payment?.orderStatus ?? order.data.status) === "PENDING" &&
            (!payment ||
              ["PENDING", "FAILED", "PAYABLE", "INITIATING"].includes(payment.paymentStatus)) && (
              <button type="button" className="button" disabled={busy} onClick={() => void retry()}>
                Tiếp tục thanh toán
              </button>
            )}
        </>
      ) : (
        <p>Đã nhận đơn COD. Thanh toán khi nhận hàng.</p>
      )}
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}
      <p>
        <Link href="/products">Tiếp tục mua sắm</Link> ·{" "}
        <Link href="/account/orders">Đơn hàng của tôi</Link>
      </p>
    </section>
  );
}
