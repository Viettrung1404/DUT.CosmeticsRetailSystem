export function paymentOutcome(
  status: {
    paymentStatus: string;
    orderStatus: string;
    verificationPending: boolean;
    refundPending: boolean;
  } | null,
): "success" | "failed" | "pending" | "refund" | "review" {
  if (!status) return "pending";
  if (
    status.refundPending ||
    (status.paymentStatus === "COMPLETED" && status.orderStatus === "CANCELLED")
  )
    return "refund";
  if (status.paymentStatus === "NEEDS_REVIEW") return "review";
  if (status.orderStatus === "CANCELLED") return "failed";
  if (status.verificationPending) return "pending";
  if (
    status.paymentStatus === "COMPLETED" &&
    [
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPING",
      "DELIVERED",
      "COMPLETED",
      "RETURNED",
    ].includes(status.orderStatus)
  )
    return "success";
  if (["FAILED", "CANCELLED"].includes(status.paymentStatus) || status.orderStatus === "CANCELLED")
    return "failed";
  return "pending";
}
