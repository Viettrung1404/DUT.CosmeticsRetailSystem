"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/features/catalog/components";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  History,
  Box,
  ChevronRight,
  RotateCcw,
  Calendar,
} from "lucide-react";

interface ShipmentPackageItem {
  quantity: number;
  productName: string;
  variantName?: string;
}

interface ShipmentPackage {
  id: string;
  packageCode: string;
  actualWeightGrams: number;
  items: ShipmentPackageItem[];
}

interface ShipmentAttempt {
  id?: string;
  attemptNumber: number;
  attemptedAt: string;
  failureReasonCode?: string | null;
  failureReasonDetail?: string | null;
}

interface ShipmentEvent {
  id: string;
  status: string;
  occurredAt: string;
  receivedAt?: string;
}

interface ShipmentTrack {
  id: string;
  shipmentCode?: string;
  carrierCode: string;
  carrierServiceCode?: string | null;
  trackingCode?: string | null;
  status: string;
  trackingUrl?: string | null;
  failedAttempts?: number;
  handedOverAt?: string | null;
  deliveredAt?: string | null;
  updatedAt?: string;
  packages?: ShipmentPackage[];
  attempts?: ShipmentAttempt[];
  events?: ShipmentEvent[];
}

interface StatusHistoryTrack {
  id?: string;
  status: string;
  note?: string | null;
  createdAt: string;
}

interface OrderTrackResult {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress: {
    recipientName?: string;
    phone?: string;
    addressLine?: string;
    ward?: string;
    district?: string;
    city?: string;
  };
  items: Array<{
    id: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  payments?: Array<{
    id: string;
    paymentMethod: string;
    status: string;
    paidAt?: string | null;
    transactionId?: string | null;
  }>;
  statusHistories?: StatusHistoryTrack[];
  shipments?: ShipmentTrack[];
}

const statusText: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao hàng",
  OUT_FOR_DELIVERY: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  COMPLETED: "Giao thành công",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã trả hàng",
};

const shipmentStatusText: Record<string, string> = {
  CREATED: "Đã tạo vận đơn",
  CREATION_UNKNOWN: "Đang đối soát vận đơn",
  READY_FOR_DISPATCH: "Sẵn sàng bàn giao",
  DISPATCHED: "Đã bàn giao đơn vị vận chuyển",
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang trung chuyển",
  DELIVERING: "Đang giao hàng",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Giao thành công",
  DELIVERY_FAILED: "Giao thất bại",
  FAILED: "Giao thất bại",
  RETURNING: "Đang chuyển hoàn",
};

const formatDateTime = (value: string | undefined | null) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderTrackResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchOrder = async (ordNum: string, phNum: string) => {
    if (!ordNum.trim() || !phNum.trim()) {
      setError("Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setOrder(null);

      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: ordNum.trim(),
          phone: phNum.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không tìm thấy đơn hàng phù hợp");
      }

      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi tra cứu. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qOrder = searchParams.get("orderNumber");
    const qPhone = searchParams.get("phone");
    if (qOrder && qPhone) {
      setOrderNumber(qOrder);
      setPhone(qPhone);
      fetchOrder(qOrder, qPhone);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderNumber, phone);
  };

  const handleCopy = (code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
        return <span className="order-status-badge badge-success">Giao hàng thành công</span>;
      case "SHIPPING":
      case "OUT_FOR_DELIVERY":
        return <span className="order-status-badge badge-info">Đang vận chuyển</span>;
      case "CONFIRMED":
      case "PROCESSING":
        return <span className="order-status-badge badge-warning">Đang xử lý</span>;
      case "CANCELLED":
        return <span className="order-status-badge badge-danger">Đã hủy</span>;
      case "PENDING_PAYMENT":
        return <span className="order-status-badge badge-danger">Chờ thanh toán</span>;
      default:
        return <span className="order-status-badge badge-neutral">Chờ xác nhận</span>;
    }
  };

  // Tính toán các mốc tiến trình đơn hàng
  const getMilestones = () => {
    if (!order) return [];

    const isCancelled = order.status === "CANCELLED";
    const isReturned = order.status === "RETURNED";

    // Tìm các mốc thời gian từ statusHistories
    const placedTime =
      order.statusHistories?.find((h) => h.status === "PENDING" || h.status === "PENDING_PAYMENT")?.createdAt ||
      order.createdAt;

    const confirmedTime = order.statusHistories?.find(
      (h) => h.status === "CONFIRMED" || h.status === "PROCESSING"
    )?.createdAt;

    const shippingTime =
      order.statusHistories?.find((h) => h.status === "SHIPPING" || h.status === "OUT_FOR_DELIVERY")?.createdAt ||
      order.shipments?.[0]?.handedOverAt ||
      order.shipments?.[0]?.events?.[0]?.occurredAt;

    const deliveredTime =
      order.statusHistories?.find((h) => h.status === "DELIVERED" || h.status === "COMPLETED")?.createdAt ||
      order.shipments?.[0]?.deliveredAt;

    let activeIndex = 0;
    if (order.status === "COMPLETED" || order.status === "DELIVERED") {
      activeIndex = 3;
    } else if (
      order.status === "SHIPPING" ||
      order.status === "OUT_FOR_DELIVERY" ||
      order.shipments?.some((s) => ["IN_TRANSIT", "DELIVERING", "SHIPPING", "PICKED_UP"].includes(s.status))
    ) {
      activeIndex = 2;
    } else if (order.status === "CONFIRMED" || order.status === "PROCESSING") {
      activeIndex = 1;
    }

    return [
      {
        step: 1,
        title: "Đặt hàng",
        desc: "Đơn hàng khởi tạo",
        time: placedTime,
        isCompleted: true,
        isCurrent: activeIndex === 0 && !isCancelled && !isReturned,
      },
      {
        step: 2,
        title: "Chuẩn bị hàng",
        desc: "Xác nhận & đóng gói",
        time: confirmedTime,
        isCompleted: activeIndex >= 1 && !isCancelled && !isReturned,
        isCurrent: activeIndex === 1 && !isCancelled && !isReturned,
      },
      {
        step: 3,
        title: "Đang vận chuyển",
        desc: "Bàn giao bưu tá",
        time: shippingTime,
        isCompleted: activeIndex >= 2 && !isCancelled && !isReturned,
        isCurrent: activeIndex === 2 && !isCancelled && !isReturned,
      },
      {
        step: 4,
        title: "Giao thành công",
        desc: "Nhận hàng hoàn tất",
        time: deliveredTime,
        isCompleted: activeIndex === 3 && !isCancelled && !isReturned,
        isCurrent: activeIndex === 3 && !isCancelled && !isReturned,
      },
    ];
  };

  const milestones = getMilestones();

  return (
    <main id="main-content" className="site-container" style={{ padding: "40px 16px 80px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground, #1a1a1a)", marginBottom: 8 }}>
          Tra Cứu & Theo Dõi Đơn Hàng 📦
        </h1>
        <p style={{ color: "var(--muted-foreground, #666)", fontSize: 15 }}>
          Theo dõi tiến trình xử lý, thời gian chuyển trạng thái và hành trình giao vận chi tiết theo thời gian thực.
        </p>
      </div>

      {/* Form tra cứu */}
      <div
        style={{
          background: "var(--surface, #fff)",
          border: "1px solid var(--border, #e5e5e5)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          marginBottom: 32,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Mã đơn hàng <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="VD: ORD202610270010"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border, #d1d5db)",
                  fontSize: 14,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Số điện thoại đặt hàng <span style={{ color: "#e11d48" }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0900000108"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border, #d1d5db)",
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fff1f2",
                color: "#be123c",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "var(--primary, #be185d)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Search size={18} />
            {loading ? "Đang tra cứu..." : "Tra cứu đơn hàng"}
          </button>
        </form>
      </div>

      {/* Kết quả tra cứu */}
      {order && (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Card 1: Tổng quan đơn hàng + Tiến trình trực quan */}
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e5e5e5)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header đơn hàng */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                paddingBottom: 20,
                borderBottom: "1px solid var(--border, #f0f0f0)",
                marginBottom: 24,
              }}
            >
              <div>
                <span style={{ fontSize: 13, color: "var(--muted-foreground, #666)" }}>Mã đơn hàng:</span>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--primary, #be185d)", margin: "2px 0 4px" }}>
                  {order.orderNumber}
                </h2>
                <span style={{ fontSize: 13, color: "var(--muted-foreground, #888)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={14} /> Thời gian đặt: {formatDateTime(order.createdAt)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {getStatusBadge(order.status)}
              </div>
            </div>

            {/* Trạng thái đặc biệt nếu Đã Hủy hoặc Trả Hàng */}
            {order.status === "CANCELLED" && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: "14px 18px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#991b1b",
                }}
              >
                <AlertCircle size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 14 }}>Đơn hàng đã được hủy</strong>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#b91c1c" }}>
                    Nếu có thắc mắc hoặc cần hỗ trợ về khoản tiền thanh toán, vui lòng liên hệ bộ phận CSKH của GlowUp.
                  </p>
                </div>
              </div>
            )}

            {order.status === "RETURNED" && (
              <div
                style={{
                  backgroundColor: "#fff7ed",
                  border: "1px solid #ffedd5",
                  borderRadius: 12,
                  padding: "14px 18px",
                  marginBottom: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#9a3412",
                }}
              >
                <RotateCcw size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: 14 }}>Đơn hàng đã được hoàn trả</strong>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#c2410c" }}>
                    Kiện hàng đã được tiếp nhận và xử lý theo chính sách đổi trả của cửa hàng.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper tiến trình đơn hàng */}
            {order.status !== "CANCELLED" && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={18} style={{ color: "var(--primary, #be185d)" }} />
                  Tiến trình đơn hàng
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    position: "relative",
                  }}
                >
                  {milestones.map((m, idx) => {
                    const isDone = m.isCompleted && !m.isCurrent;
                    const isCur = m.isCurrent;
                    return (
                      <div
                        key={m.step}
                        style={{
                          backgroundColor: isCur ? "#fdf2f8" : isDone ? "#f8fafc" : "#fafafa",
                          border: isCur
                            ? "1.5px solid var(--primary, #be185d)"
                            : isDone
                            ? "1px solid #cbd5e1"
                            : "1px dashed #e2e8f0",
                          borderRadius: 12,
                          padding: "14px 14px",
                          position: "relative",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 700,
                              backgroundColor: isCur
                                ? "var(--primary, #be185d)"
                                : isDone
                                ? "#16a34a"
                                : "#e2e8f0",
                              color: isCur || isDone ? "#fff" : "#64748b",
                              flexShrink: 0,
                            }}
                          >
                            {isDone ? <Check size={16} /> : m.step}
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: isCur ? 700 : 600,
                                color: isCur ? "var(--primary, #be185d)" : isDone ? "#0f172a" : "#64748b",
                                display: "block",
                              }}
                            >
                              {m.title}
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 6px 38px" }}>
                          {m.desc}
                        </p>

                        {m.time ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: isCur ? "var(--primary, #be185d)" : "#475569",
                              fontWeight: 600,
                              marginLeft: 38,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Clock size={11} /> {formatDateTime(m.time)}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 38 }}>
                            Chưa diễn ra
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Hành trình vận chuyển (Kiện hàng & Carrier Timeline) */}
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e5e5e5)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Truck size={20} style={{ color: "var(--primary, #be185d)" }} />
                Thông tin vận chuyển & Hành trình bưu tá
              </h3>
              {order.shipments && order.shipments.length > 0 && (
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  Tổng cộng: <strong>{order.shipments.length}</strong> kiện hàng
                </span>
              )}
            </div>

            {order.shipments && order.shipments.length > 0 ? (
              <div style={{ display: "grid", gap: 20 }}>
                {order.shipments.map((shipment, index) => {
                  const isAhamove = shipment.carrierCode === "AHAMOVE";
                  const carrierDisplayName = isAhamove
                    ? "Ahamove Express"
                    : shipment.carrierCode === "GHN"
                    ? "Giao Hàng Nhanh (GHN)"
                    : shipment.carrierCode;

                  return (
                    <div
                      key={shipment.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 20,
                        backgroundColor: "#fff",
                      }}
                    >
                      {/* Tiêu đề kiện hàng & Mã vận đơn */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: 12,
                          paddingBottom: 14,
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                              Kiện {order.shipments && order.shipments.length > 1 ? `#${index + 1}` : "hàng"} · {carrierDisplayName}
                            </h4>
                            <span
                              className={`tracking-carrier-badge ${isAhamove ? "is-ahamove" : "is-ghn"}`}
                              style={{ margin: 0 }}
                            >
                              {shipment.carrierServiceCode || (isAhamove ? "HỎA TỐC 2H" : "TIÊU CHUẨN")}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: "#64748b" }}>
                              Mã vận đơn:
                            </span>
                            {shipment.trackingCode ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <strong style={{ fontSize: 14, color: "#0f172a", fontFamily: "monospace" }}>
                                  {shipment.trackingCode}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(shipment.trackingCode!)}
                                  title="Sao chép mã vận đơn"
                                  style={{
                                    border: "none",
                                    background: "#f1f5f9",
                                    color: copiedCode === shipment.trackingCode ? "#16a34a" : "#64748b",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                    padding: "3px 6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 12,
                                  }}
                                >
                                  {copiedCode === shipment.trackingCode ? (
                                    <>
                                      <Check size={12} /> Đã chép
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} /> Sao chép
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                                Đang cập nhật mã vận đơn...
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: shipment.status === "DELIVERED" ? "#dcfce7" : "#e0f2fe",
                              color: shipment.status === "DELIVERED" ? "#166534" : "#0369a1",
                            }}
                          >
                            {shipmentStatusText[shipment.status] ?? shipment.status}
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động bản đồ trực tiếp / tra cứu trực tiếp */}
                      {shipment.trackingUrl && (
                        <div style={{ marginTop: 12 }}>
                          {isAhamove ? (
                            <a
                              className="tracking-live-map-btn"
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin size={16} /> Theo dõi tài xế trên bản đồ trực tiếp (Live Map)
                            </a>
                          ) : (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 14px",
                                borderRadius: 8,
                                border: "1px solid #cbd5e1",
                                fontSize: 13,
                                color: "#0f172a",
                                textDecoration: "none",
                                fontWeight: 500,
                                backgroundColor: "#f8fafc",
                              }}
                            >
                              Tra cứu tại {carrierDisplayName} <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Thông báo sự cố giao hàng nếu có */}
                      {(shipment.failedAttempts && shipment.failedAttempts > 0) ||
                      (shipment.attempts && shipment.attempts.length > 0) ? (
                        <div className="tracking-failure-alert" role="alert" style={{ marginTop: 14 }}>
                          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <strong>
                              Ghi nhận giao chưa thành công ({shipment.failedAttempts || shipment.attempts?.length} lần)
                            </strong>
                            <p style={{ margin: "2px 0 0" }}>
                              Đơn vị vận chuyển sẽ sắp xếp giao lại theo quy định. Bạn có thể liên hệ tổng đài hoặc theo dõi cập nhật mới nhất.
                            </p>
                            {shipment.attempts && shipment.attempts.length > 0 && (
                              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                                {shipment.attempts.map((att) => (
                                  <li key={att.id || att.attemptNumber}>
                                    Lần {att.attemptNumber} ({formatDateTime(att.attemptedAt)}):{" "}
                                    {att.failureReasonDetail || att.failureReasonCode || "Không liên lạc được hoặc người nhận hẹn lại"}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Chi tiết sản phẩm trong kiện này */}
                      {shipment.packages && shipment.packages.length > 0 && (
                        <div className="tracking-package-box" style={{ marginTop: 14 }}>
                          <div className="tracking-package-header">
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Package size={15} />
                              Sản phẩm đóng gói trong kiện
                            </span>
                            {(shipment.packages[0]?.actualWeightGrams ?? 0) > 0 && (
                              <span style={{ fontSize: 12, color: "#64748b" }}>
                                Trọng lượng:{" "}
                                {(shipment.packages[0]?.actualWeightGrams ?? 0) >= 1000
                                  ? `${((shipment.packages[0]?.actualWeightGrams ?? 0) / 1000).toFixed(2)} kg`
                                  : `${shipment.packages[0]?.actualWeightGrams} g`}
                              </span>
                            )}
                          </div>
                          <ul className="tracking-package-items-list">
                            {shipment.packages.flatMap((pkg) =>
                              pkg.items.map((item, itemIdx) => (
                                <li key={`${pkg.id}-${itemIdx}`}>
                                  <span>
                                    {item.productName}
                                    {item.variantName ? ` (${item.variantName})` : ""}
                                  </span>
                                  <strong>x{item.quantity}</strong>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Timeline các mốc sự kiện vận đơn */}
                      <div style={{ marginTop: 18 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", color: "#334155" }}>
                          Lộ trình di chuyển bưu tá & trạng thái vận đơn
                        </h5>

                        {shipment.events && shipment.events.length > 0 ? (
                          <div style={{ position: "relative", paddingLeft: 22 }}>
                            {/* Đường kẻ dọc */}
                            <div
                              style={{
                                position: "absolute",
                                left: 6,
                                top: 6,
                                bottom: 6,
                                width: 2,
                                backgroundColor: "#e2e8f0",
                              }}
                            />

                            <div style={{ display: "grid", gap: 14 }}>
                              {shipment.events.map((event, evIdx) => {
                                const isLatest = evIdx === shipment.events!.length - 1;
                                return (
                                  <div
                                    key={event.id || evIdx}
                                    style={{
                                      position: "relative",
                                    }}
                                  >
                                    {/* Điểm nút tròn */}
                                    <div
                                      style={{
                                        position: "absolute",
                                        left: -22 + 2,
                                        top: 3,
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        backgroundColor: isLatest ? "var(--primary, #be185d)" : "#94a3b8",
                                        boxShadow: isLatest ? "0 0 0 4px #fce7f3" : "none",
                                      }}
                                    />
                                    <div>
                                      <span
                                        style={{
                                          fontSize: 13,
                                          fontWeight: isLatest ? 700 : 600,
                                          color: isLatest ? "var(--primary, #be185d)" : "#1e293b",
                                          display: "block",
                                        }}
                                      >
                                        {shipmentStatusText[event.status] ?? event.status}
                                      </span>
                                      <time
                                        style={{
                                          fontSize: 12,
                                          color: "#64748b",
                                          display: "block",
                                          marginTop: 2,
                                        }}
                                      >
                                        {formatDateTime(event.occurredAt)}
                                      </time>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", margin: 0 }}>
                            Đang xử lý đóng gói kiện hàng và cập nhật lộ trình di chuyển.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    backgroundColor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary, #be185d)",
                    flexShrink: 0,
                  }}
                >
                  <Package size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: "#1e293b" }}>
                    Chưa phát sinh kiện hàng vận chuyển
                  </h4>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    Đơn hàng đang trong quá trình chuẩn bị hàng tại kho. Mã vận đơn và tiến trình di chuyển của bưu tá sẽ hiển thị ngay khi nhân viên bàn giao kiện hàng cho đối tác vận chuyển.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Nhật ký chuyển trạng thái đơn hàng (Order Status Timeline) */}
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e5e5e5)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <History size={18} style={{ color: "var(--primary, #be185d)" }} />
              Nhật ký chuyển trạng thái đơn hàng
            </h3>

            {order.statusHistories && order.statusHistories.length > 0 ? (
              <div style={{ position: "relative", paddingLeft: 22, marginTop: 12 }}>
                {/* Đường kẻ dọc */}
                <div
                  style={{
                    position: "absolute",
                    left: 6,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    backgroundColor: "#e2e8f0",
                  }}
                />

                <div style={{ display: "grid", gap: 18 }}>
                  {order.statusHistories.map((history, idx) => {
                    const isLatest = idx === order.statusHistories!.length - 1;
                    return (
                      <div key={history.id || `${history.status}-${idx}`} style={{ position: "relative" }}>
                        {/* Nút tròn */}
                        <div
                          style={{
                            position: "absolute",
                            left: -22 + 2,
                            top: 4,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: isLatest ? "var(--primary, #be185d)" : "#94a3b8",
                            boxShadow: isLatest ? "0 0 0 4px #fce7f3" : "none",
                          }}
                        />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                          <div>
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: isLatest ? "var(--primary, #be185d)" : "#0f172a",
                              }}
                            >
                              {statusText[history.status] ?? history.status}
                            </span>
                            {history.note && (
                              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                                {history.note}
                              </p>
                            )}
                          </div>
                          <time style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                            {formatDateTime(history.createdAt)}
                          </time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 22, marginTop: 12 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 6,
                    top: 6,
                    bottom: 6,
                    width: 2,
                    backgroundColor: "#e2e8f0",
                  }}
                />
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: -22 + 2,
                      top: 4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "var(--primary, #be185d)",
                      boxShadow: "0 0 0 4px #fce7f3",
                    }}
                  />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary, #be185d)" }}>
                      {statusText[order.status] ?? order.status}
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                      Đơn hàng được khởi tạo thành công trên hệ thống.
                    </p>
                    <time style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 4 }}>
                      {formatDateTime(order.createdAt)}
                    </time>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Địa chỉ nhận hàng & Sản phẩm & Thanh toán */}
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1px solid var(--border, #e5e5e5)",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            }}
          >
            {/* Địa chỉ giao hàng */}
            <div style={{ marginBottom: 24, background: "#fafafa", padding: 16, borderRadius: 12, border: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={16} /> Địa chỉ nhận hàng
              </h3>
              <p style={{ margin: "2px 0", fontSize: 14, fontWeight: 600 }}>
                {order.shippingAddress?.recipientName} • {order.shippingAddress?.phone}
              </p>
              <p style={{ margin: "2px 0", fontSize: 13, color: "#555" }}>
                {[
                  order.shippingAddress?.addressLine,
                  order.shippingAddress?.ward,
                  order.shippingAddress?.district,
                  order.shippingAddress?.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            {/* Danh sách sản phẩm */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Package size={16} /> Danh sách sản phẩm ({order.items.length})
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px dashed var(--border, #eee)",
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: "0 0 2px" }}>{item.productName}</p>
                      {item.variantName && (
                        <p style={{ fontSize: 12, color: "#777", margin: 0 }}>Phân loại: {item.variantName}</p>
                      )}
                      <span style={{ fontSize: 12, color: "#999" }}>Số lượng: x{item.quantity}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: 14, color: "var(--primary, #be185d)" }}>
                        {formatPrice(item.totalPrice)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tổng tiền và thanh toán */}
            <div style={{ borderTop: "1px solid var(--border, #f0f0f0)", paddingTop: 16 }}>
              <div style={{ display: "grid", gap: 6, maxWidth: 320, marginLeft: "auto", fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Tạm tính:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                    <span>Giảm giá:</span>
                    <span>-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Phí vận chuyển:</span>
                  <span>{order.shippingFee === 0 ? "Miễn phí" : formatPrice(order.shippingFee)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 6,
                    paddingTop: 8,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: "var(--primary, #be185d)" }}>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Thông tin phương thức & trạng thái thanh toán */}
            {(() => {
              const sepayPayment = order.payments?.find((p) => p.paymentMethod === "SEPAY");
              const isSepayPaid = Boolean(
                sepayPayment && (sepayPayment.status === "COMPLETED" || order.status !== "PENDING_PAYMENT")
              );
              const isSepayUnpaid = Boolean(
                sepayPayment &&
                order.status === "PENDING_PAYMENT" &&
                sepayPayment.status !== "COMPLETED"
              );
              const isCod = Boolean(order.payments?.some((p) => p.paymentMethod === "COD"));

              if (isSepayPaid) {
                return (
                  <div
                    style={{
                      marginTop: 24,
                      padding: "16px 20px",
                      borderRadius: 12,
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#16a34a",
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>
                        Đã thanh toán VietQR SePay thành công
                      </h4>
                      <p style={{ fontSize: 13, color: "#15803d", margin: 0 }}>
                        Giao dịch chuyển khoản đã được hệ thống ghi nhận thành công
                        {sepayPayment?.transactionId ? ` (Mã GD: ${sepayPayment.transactionId})` : ""}.
                        Đơn hàng đang được chuẩn bị để giao tới bạn.
                      </p>
                    </div>
                  </div>
                );
              }

              if (isSepayUnpaid) {
                return (
                  <div
                    style={{
                      marginTop: 24,
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      textAlign: "center",
                    }}
                  >
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                      ⚡ Thanh toán VietQR SePay
                    </h4>
                    <p style={{ fontSize: 13, color: "#78350f", marginBottom: 12 }}>
                      Đơn hàng đang chờ thanh toán. Quét mã QR dưới đây bằng ứng dụng ngân hàng để hoàn tất:
                    </p>
                    <img
                      src={`https://vietqr.app/img/ACB-0000000001-compact.png?amount=${order.totalAmount}&addInfo=${order.orderNumber}&accountName=CONG%20TY%20CO%20PHAN%20GLOWUP`}
                      alt="VietQR Chuyển khoản"
                      style={{ width: 180, height: 180, margin: "0 auto", display: "block", borderRadius: 8 }}
                    />
                  </div>
                );
              }

              if (isCod) {
                return (
                  <div
                    style={{
                      marginTop: 24,
                      padding: "16px 20px",
                      borderRadius: 12,
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        flexShrink: 0,
                      }}
                    >
                      <Truck size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#334155", margin: "0 0 4px" }}>
                        Phương thức thanh toán: Khi nhận hàng (COD)
                      </h4>
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                        Vui lòng thanh toán số tiền {formatPrice(order.totalAmount)} cho nhân viên giao hàng khi nhận kiện hàng.
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </div>
      )}

      {/* Chân trang điều hướng */}
      <div style={{ textAlign: "center", marginTop: 40, fontSize: 14 }}>
        <span style={{ color: "#777" }}>Bạn đã có tài khoản GlowUp? </span>
        <Link
          href="/account/orders"
          style={{ color: "var(--primary, #be185d)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          Xem lịch sử đơn trong tài khoản <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="site-container" style={{ padding: "40px 16px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <p>Đang tải trang tra cứu...</p>
        </main>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}
