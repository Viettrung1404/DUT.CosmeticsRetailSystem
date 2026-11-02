"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { paymentSchema } from "./contracts";

export function ContinueSepayPayment({
  orderId,
  orderStatus,
  payments,
}: {
  orderId: string;
  orderStatus: string;
  payments?: { id: string; paymentMethod: string; status: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sepay = payments?.filter((payment) => payment.paymentMethod === "SEPAY");
  if (
    !sepay?.length ||
    !["PENDING_PAYMENT", "PENDING"].includes(orderStatus) ||
    sepay.some((payment) => payment.status === "COMPLETED")
  )
    return null;
  async function resume() {
    setBusy(true);
    setError("");
    try {
      const payment = await requestBff("/api/checkout/payment", paymentSchema, {
        method: "POST",
        body: { orderId },
      });
      router.push(`/payment/return?paymentId=${payment.paymentId}`);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="continue-payment">
      <button type="button" className="button" disabled={busy} onClick={() => void resume()}>
        {busy ? "Đang mở thanh toán…" : "Tiếp tục thanh toán SePay"}
      </button>
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}
    </div>
  );
}
