"use client";
import Link from "next/link";
import { Check, Clock3, X, ShieldCheck } from "lucide-react";
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
          setError(
            "Chưa tra cứu được trạng thái thanh toán. Vui lòng mở lại liên kết trong trình duyệt đã đặt hàng và thử lại.",
          );
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
  const successful = status?.paymentStatus === "COMPLETED";
  const failed = status && ["FAILED", "CANCELLED"].includes(status.paymentStatus);
  return (
    <div className="result-page">
      <section className="result-hero">
        <span className={`result-symbol ${successful ? "" : failed ? "is-failed" : "is-pending"}`}>
          {successful ? <Check size={40} /> : failed ? <X size={40} /> : <Clock3 size={40} />}
        </span>
        <h1>
          {successful
            ? "Thanh toán thành công qua VNPAY!"
            : failed
              ? "Thanh toán không thành công"
              : "Giao dịch đang chờ xác nhận"}
        </h1>
        <p role="status">
          {successful
            ? "Giao dịch của bạn đã được hệ thống xác nhận. Cảm ơn bạn đã mua sắm tại GlowUp."
            : failed
              ? "Giao dịch chưa được hoàn tất. Bạn có thể kiểm tra đơn hàng và thử thanh toán lại."
              : "Hệ thống đang đối soát kết quả thanh toán. Vui lòng kiểm tra lại trạng thái đơn hàng trước khi thử giao dịch mới."}
        </p>
        {error && (
          <p role="alert" className="cart-warning">
            {error}
          </p>
        )}
        {status && (
          <div className="result-reference">
            <div>
              <small>Phương thức thanh toán</small>
              <strong>VNPAY</strong>
            </div>
            <div>
              <small>Trạng thái giao dịch</small>
              <strong>
                {successful ? "Đã xác nhận" : failed ? "Chưa hoàn tất" : "Đang xử lý"}
              </strong>
            </div>
          </div>
        )}
        <div className="result-actions">
          {status && (
            <Link className="button" href={`/order-success/${status.orderId}`}>
              Xem đơn hàng
            </Link>
          )}
          <Link href="/products">Tiếp tục mua sắm</Link>
        </div>
        <p>
          <ShieldCheck size={15} style={{ display: "inline", marginRight: 6 }} />
          Kết quả thanh toán được xác nhận từ hệ thống.
        </p>
      </section>
    </div>
  );
}
