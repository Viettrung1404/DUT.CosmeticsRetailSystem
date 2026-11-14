"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

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
  }>;
}

export default function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderTrackResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
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
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="order-status-badge badge-success">Giao hàng thành công</span>;
      case "SHIPPING":
      case "OUT_FOR_DELIVERY":
        return <span className="order-status-badge badge-info">Đang vận chuyển</span>;
      case "CONFIRMED":
      case "PROCESSING":
        return <span className="order-status-badge badge-warning">Đang xử lý</span>;
      case "CANCELLED":
        return <span className="order-status-badge badge-danger">Đã hủy</span>;
      default:
        return <span className="order-status-badge badge-neutral">Chờ xác nhận</span>;
    }
  };

  return (
    <main id="main-content" className="site-container" style={{ padding: "40px 16px 80px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground, #1a1a1a)", marginBottom: 8 }}>
          Tra Cứu Đơn Hàng 📦
        </h1>
        <p style={{ color: "var(--muted-foreground, #666)", fontSize: 15 }}>
          Nhập mã đơn hàng và số điện thoại đặt hàng để theo dõi tiến trình giao vận chi tiết.
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
        <div
          style={{
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e5e5e5)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          }}
        >
          {/* Header kết quả */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              paddingBottom: 16,
              borderBottom: "1px solid var(--border, #f0f0f0)",
              marginBottom: 20,
            }}
          >
            <div>
              <span style={{ fontSize: 13, color: "var(--muted-foreground, #666)" }}>Mã đơn hàng:</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--primary, #be185d)" }}>
                {order.orderNumber}
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted-foreground, #999)" }}>
                Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
            <div>{getStatusBadge(order.status)}</div>
          </div>

          {/* Địa chỉ giao hàng */}
          <div style={{ marginBottom: 24, background: "#fafafa", padding: 16, borderRadius: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Truck size={16} /> Địa chỉ nhận hàng
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
              <Package size={16} /> Danh sách sản phẩm
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

          {/* VietQR SePay Panel nếu là chuyển khoản và chưa thanh toán */}
          {order.payments?.some((p) => p.paymentMethod === "SEPAY" && p.status !== "PAID") && (
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
          )}
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
