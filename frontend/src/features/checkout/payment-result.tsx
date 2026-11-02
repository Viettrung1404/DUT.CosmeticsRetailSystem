"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import Link from "next/link";
import { Check, Clock3, X, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { readBff } from "@/shared/api/browser";
import { paymentStatusSchema } from "./contracts";
import { paymentOutcome } from "./payment-status";
import { SepayQr } from "./sepay-qr";
import { parseSepayTransfer } from "./sepay-transfer";

export function PaymentResult() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [status, setStatus] = useState<z.infer<typeof paymentStatusSchema> | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
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
        if (paymentOutcome(value) === "pending" && count++ < 200) timer = setTimeout(poll, 5000);
      } catch {
        if (active)
          setError(
            "Chưa tra cứu được trạng thái thanh toán. Vui lòng mở lại liên kết trong trình duyệt đã đặt hàng và thử lại.",
          );
        if (active && count++ < 200) timer = setTimeout(poll, 5000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [paymentId, refresh]);
  if (!paymentId || !z.uuid().safeParse(paymentId).success)
    return <p role="alert">Liên kết thanh toán không hợp lệ.</p>;
  if (!status && !error)
    return <ContentLoading variant="detail" label="Đang tải thông tin thanh toán…" />;
  const outcome = paymentOutcome(status);
  const successful = outcome === "success";
  const failed = outcome === "failed";
  const refund = outcome === "refund";
  const review = outcome === "review";
  const awaitingTransfer =
    status?.method === "SEPAY" &&
    outcome === "pending" &&
    ["PENDING_PAYMENT", "PENDING"].includes(status.orderStatus) &&
    status.paymentStatus === "PAYABLE" &&
    !status.verificationPending;
  const sandbox = awaitingTransfer && parseSepayTransfer(status.qrCodeData)?.mode === "sandbox";
  return (
    <div className="result-page">
      <section className="result-hero">
        <span className={`result-symbol ${successful ? "" : failed ? "is-failed" : "is-pending"}`}>
          {successful ? <Check size={40} /> : failed ? <X size={40} /> : <Clock3 size={40} />}
        </span>
        <h1>
          {refund
            ? "Thanh toán cần xử lý hoàn tiền"
            : review
              ? "Giao dịch cần được kiểm tra"
              : successful
                ? "Thanh toán thành công!"
                : failed
                  ? "Thanh toán không thành công"
                  : !status
                    ? "Đang tải thông tin thanh toán"
                    : awaitingTransfer
                      ? sandbox
                        ? "Thanh toán thử nghiệm SePay"
                        : "Thanh toán đơn hàng bằng VietQR"
                      : "Giao dịch đang chờ xác nhận"}
        </h1>
        <p role="status">
          {refund
            ? "Hệ thống đã ghi nhận thanh toán nhưng đơn hàng chưa thể được thực hiện. Vui lòng xem đơn hàng và liên hệ hỗ trợ để kiểm tra hoàn tiền."
            : review
              ? "Giao dịch đang cần được bộ phận hỗ trợ kiểm tra. Vui lòng xem trạng thái đơn hàng trước khi thanh toán thêm."
              : successful
                ? status?.orderStatus === "PENDING"
                  ? "Đã nhận đủ thanh toán. Đơn hàng đang chờ cửa hàng xác nhận."
                  : "Giao dịch của bạn đã được hệ thống xác nhận. Cảm ơn bạn đã mua sắm tại GlowUp."
                : failed
                  ? status?.orderStatus === "CANCELLED"
                    ? "Đơn hàng đã hủy hoặc hết hạn. Nếu đã chuyển khoản, vui lòng liên hệ cửa hàng để tra soát."
                    : "Giao dịch chưa được hoàn tất. Vui lòng kiểm tra trạng thái đơn hàng."
                  : !status
                    ? "Vui lòng chờ trong giây lát."
                    : awaitingTransfer
                      ? sandbox
                        ? "Dùng thông tin bên dưới để mô phỏng giao dịch trong SePay Test mode."
                        : "Quét mã QR hoặc chuyển khoản theo thông tin bên dưới để hoàn tất đơn hàng."
                      : "Hệ thống đang đối soát kết quả thanh toán. Vui lòng chờ xác nhận trước khi thanh toán thêm."}
        </p>
        {status?.method === "SEPAY" &&
          outcome === "pending" &&
          ["PENDING_PAYMENT", "PENDING"].includes(status.orderStatus) &&
          !status.verificationPending &&
          status.paymentStatus === "PAYABLE" && (
            <SepayQr key={status.paymentId} raw={status.qrCodeData} expiresAt={status.expiresAt} />
          )}
        {error && (
          <p role="alert" className="cart-warning">
            {error}
          </p>
        )}
        {status && (
          <div className="result-reference">
            <div>
              <small>Phương thức thanh toán</small>
              <strong>{status.method === "SEPAY" ? "SePay" : status.method}</strong>
            </div>
            <div>
              <small>Trạng thái giao dịch</small>
              <strong>
                {refund
                  ? "Cần kiểm tra hoàn tiền"
                  : review
                    ? "Cần kiểm tra"
                    : successful
                      ? "Đã xác nhận"
                      : failed
                        ? "Chưa hoàn tất"
                        : awaitingTransfer
                          ? "Chờ chuyển khoản"
                          : "Đang xử lý"}
              </strong>
            </div>
          </div>
        )}
        <div className="result-actions">
          {outcome === "pending" && (
            <button
              className="button"
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Tra cứu lại
            </button>
          )}
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
