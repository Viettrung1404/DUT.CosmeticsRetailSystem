"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { readBff } from "@/shared/api/browser";
import { paymentStatusSchema } from "./contracts";

export function PaymentResult() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [status, setStatus] = useState<z.infer<typeof paymentStatusSchema> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!paymentId || !z.uuid().safeParse(paymentId).success) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    async function poll() {
      try {
        const value = await readBff(`/api/checkout/payment/${paymentId}`, paymentStatusSchema);
        if (!active) return;
        setStatus(value);
        setError("");
        if (
          !["COMPLETED", "FAILED", "CANCELLED", "NEEDS_REVIEW"].includes(value.paymentStatus) &&
          count++ < 6
        )
          timer = setTimeout(poll, Math.min(2000 * 2 ** count, 12000));
      } catch {
        if (active)
          setError("Chưa tra cứu được trạng thái thanh toán. Vui lòng đăng nhập và thử lại.");
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [paymentId]);
  if (!paymentId || !z.uuid().safeParse(paymentId).success)
    return <p role="alert">Liên kết thanh toán không hợp lệ.</p>;
  return (
    <section className="checkout-panel payment-result">
      <h1>Kết quả thanh toán</h1>
      {error && <p role="alert">{error}</p>}
      {!status && !error && <p role="status">Đang xác nhận trạng thái từ hệ thống…</p>}
      {status && (
        <>
          <p role="status">
            {status.paymentStatus === "COMPLETED"
              ? "Thanh toán đã được xác nhận."
              : status.paymentStatus === "FAILED" || status.paymentStatus === "CANCELLED"
                ? "Thanh toán chưa thành công."
                : "Đang xác nhận thanh toán. Bạn có thể kiểm tra lại trong chi tiết đơn hàng."}
          </p>
          <p>Mã trạng thái đơn: {status.orderStatus}</p>
          <Link className="button" href={`/order-success/${status.orderId}`}>
            Xem đơn hàng
          </Link>
        </>
      )}
      {error && <Link href="/account/orders">Đơn hàng của tôi</Link>}
    </section>
  );
}
