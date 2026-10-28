"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/features/catalog/components";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import {
  orderDetailSchema,
  ordersSchema,
  orderStatusSchema,
  profileInputSchema,
  profileSchema,
  trackingSchema,
} from "./contracts";

const date = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
const statusText: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã trả hàng",
};
export function AccountOverview({ name, email }: { name: string; email: string }) {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => readBff("/api/account/profile", profileSchema, signal),
  });
  const orders = useQuery({
    queryKey: ["orders", 1, ""],
    queryFn: ({ signal }) => readBff("/api/account/orders?page=1", ordersSchema, signal),
  });
  return (
    <>
      <section className="panel">
        <p className="eyebrow">TÀI KHOẢN CỦA BẠN</p>
        <h1>Xin chào, {name}</h1>
        <p className="muted">{email}</p>
        <div className="account-stat-grid">
          <div>
            <strong>{profile.data?.totalOrders ?? "—"}</strong>
            <span>Đơn hàng</span>
          </div>
          <div>
            <strong>{profile.data?.totalPoints ?? "—"}</strong>
            <span>Điểm thưởng</span>
          </div>
          <div>
            <strong>{profile.data?.loyaltyTier?.name ?? "—"}</strong>
            <span>Hạng thành viên</span>
          </div>
        </div>
        {profile.isError && <p role="alert">Chưa tải được tổng quan tài khoản.</p>}
        <div className="account-links">
          <Link href="/account/profile">Hồ sơ cá nhân</Link>
          <Link href="/account/addresses">Sổ địa chỉ</Link>
          <Link href="/account/orders">Xem tất cả đơn hàng</Link>
        </div>
      </section>
      <section className="panel">
        <h2>Đơn hàng gần đây</h2>
        {orders.isPending ? (
          <p role="status">Đang tải đơn hàng…</p>
        ) : orders.isError ? (
          <p role="alert">Chưa tải được đơn hàng.</p>
        ) : orders.data.orders.length ? (
          orders.data.orders.slice(0, 3).map((order) => (
            <p key={order.id}>
              <Link href={`/account/orders/${order.id}`}>{order.orderNumber}</Link> ·{" "}
              {statusText[order.status] ?? order.status} · {formatPrice(order.totalAmount)}
            </p>
          ))
        ) : (
          <p>Bạn chưa có đơn hàng.</p>
        )}
      </section>
    </>
  );
}
export function ProfilePage() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => readBff("/api/account/profile", profileSchema, signal),
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (query.isPending) return <p role="status">Đang tải hồ sơ…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Không tải được hồ sơ. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );
  const profile = query.data;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const input = profileInputSchema.safeParse({
      fullName: (draft.fullName ?? profile.fullName ?? "").trim(),
      phone: draft.phone || profile.phone || undefined,
      gender: draft.gender || profile.gender || undefined,
      dateOfBirth: draft.dateOfBirth || profile.dateOfBirth?.slice(0, 10) || undefined,
    });
    if (!input.success) {
      setMessage("Vui lòng kiểm tra thông tin đã nhập.");
      setBusy(false);
      return;
    }
    try {
      const result = await requestBff("/api/account/profile", profileSchema, {
        method: "PUT",
        body: input.data,
      });
      client.setQueryData(["profile"], result);
      void client.invalidateQueries({ queryKey: ["session"] });
      setDraft({});
      setMessage("Đã lưu hồ sơ.");
    } catch (error) {
      setMessage(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1>Thông tin cá nhân</h1>
      <form className="account-form" onSubmit={(event) => void save(event)}>
        <label>
          Email
          <input value={profile.email ?? ""} readOnly />
        </label>
        <label>
          Họ tên
          <input
            required
            maxLength={100}
            value={draft.fullName ?? profile.fullName ?? ""}
            onChange={(event) => setDraft((value) => ({ ...value, fullName: event.target.value }))}
          />
        </label>
        <label>
          Số điện thoại
          <input
            type="tel"
            value={draft.phone ?? profile.phone ?? ""}
            onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))}
          />
        </label>
        <label>
          Ngày sinh
          <input
            type="date"
            value={draft.dateOfBirth ?? profile.dateOfBirth?.slice(0, 10) ?? ""}
            onChange={(event) =>
              setDraft((value) => ({ ...value, dateOfBirth: event.target.value }))
            }
          />
        </label>
        <label>
          Giới tính
          <select
            value={draft.gender ?? profile.gender ?? ""}
            onChange={(event) => setDraft((value) => ({ ...value, gender: event.target.value }))}
          >
            <option value="">Chưa chọn</option>
            <option value="FEMALE">Nữ</option>
            <option value="MALE">Nam</option>
            <option value="OTHER">Khác</option>
          </select>
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}
export function OrdersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = orderStatusSchema.safeParse(params.get("status")).success
    ? params.get("status")!
    : "";
  const query = useQuery({
    queryKey: ["orders", page, status],
    queryFn: ({ signal }) =>
      readBff(
        `/api/account/orders?page=${page}${status ? `&status=${status}` : ""}`,
        ordersSchema,
        signal,
      ),
  });
  const go = (nextPage: number, nextStatus = status) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (nextStatus) query.set("status", nextStatus);
    router.push(`/account/orders?${query}`);
  };
  return (
    <section className="panel">
      <h1>Đơn hàng của tôi</h1>
      <label>
        Trạng thái{" "}
        <select value={status} onChange={(event) => go(1, event.target.value)}>
          <option value="">Tất cả</option>
          {orderStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {statusText[value]}
            </option>
          ))}
        </select>
      </label>
      {query.isPending ? (
        <p role="status">Đang tải đơn hàng…</p>
      ) : query.isError ? (
        <p role="alert">
          Không tải được đơn hàng. <button onClick={() => query.refetch()}>Thử lại</button>
        </p>
      ) : query.data.orders.length ? (
        <>
          <div className="account-list">
            {query.data.orders.map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <small>{date(order.createdAt)}</small>
                  <p>{statusText[order.status] ?? order.status}</p>
                </div>
                <strong>{formatPrice(order.totalAmount)}</strong>
                <Link href={`/account/orders/${order.id}`}>Xem chi tiết</Link>
              </article>
            ))}
          </div>
          <div className="account-pages">
            <button disabled={page <= 1} onClick={() => go(page - 1)}>
              Trước
            </button>
            <span>
              {page} / {query.data.totalPages}
            </span>
            <button disabled={page >= query.data.totalPages} onClick={() => go(page + 1)}>
              Sau
            </button>
          </div>
        </>
      ) : (
        <p>Chưa có đơn hàng trong trạng thái này.</p>
      )}
    </section>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["order-detail", id],
    queryFn: ({ signal }) => readBff(`/api/account/orders/${id}`, orderDetailSchema, signal),
  });
  async function cancel() {
    if (!window.confirm("Bạn muốn hủy đơn hàng đang chờ xác nhận?")) return;
    setBusy(true);
    setError("");
    try {
      const result = await requestBff(`/api/account/orders/${id}`, orderDetailSchema, {
        method: "PUT",
        body: {},
      });
      client.setQueryData(["order-detail", id], result);
      client.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending) return <p role="status">Đang tải đơn hàng…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Không xem được đơn hàng này. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );
  const order = query.data;
  return (
    <section className="panel">
      <h1>Đơn hàng {order.orderNumber}</h1>
      <p>
        {statusText[order.status] ?? order.status} · {date(order.createdAt)}
      </p>
      <div className="account-list">
        {order.items.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.productName}</strong>
              <small>
                {item.variantName} · Số lượng {item.quantity}
              </small>
            </div>
            <strong>{formatPrice(item.totalPrice)}</strong>
          </article>
        ))}
      </div>
      <p>Tạm tính: {formatPrice(order.subtotal)}</p>
      <p>Giảm giá: {formatPrice(order.discountAmount)}</p>
      <p>Giao hàng: {formatPrice(order.shippingFee)}</p>
      <p>
        <strong>Tổng cộng: {formatPrice(order.totalAmount)}</strong>
      </p>
      {order.shippingAddress && (
        <p>
          Giao đến: {order.shippingAddress.recipientName}, {order.shippingAddress.addressLine},{" "}
          {order.shippingAddress.ward}, {order.shippingAddress.district},{" "}
          {order.shippingAddress.city}
        </p>
      )}
      <div className="account-links">
        <Link href={`/account/orders/${id}/tracking`}>Theo dõi vận chuyển</Link>
        {order.status === "COMPLETED" && (
          <Link href={`/account/returns/new?orderId=${id}`}>Yêu cầu đổi trả</Link>
        )}
        {order.status === "PENDING" && (
          <button type="button" disabled={busy} onClick={() => void cancel()}>
            {busy ? "Đang hủy…" : "Hủy đơn hàng"}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="muted">Đây là thông tin đơn hàng, không phải hóa đơn VAT.</p>
    </section>
  );
}
export function TrackingPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["tracking", id],
    queryFn: ({ signal }) => readBff(`/api/account/orders/${id}/tracking`, trackingSchema, signal),
  });
  if (query.isPending) return <p role="status">Đang tải vận chuyển…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Không tải được vận chuyển. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );
  const data = query.data;
  return (
    <section className="panel">
      <h1>Theo dõi vận chuyển</h1>
      <p>Trạng thái đơn: {statusText[data.status] ?? data.status}</p>
      {data.shipments.length ? (
        data.shipments.map((shipment) => (
          <article key={shipment.id} className="tracking-shipment">
            <h2>Kiện hàng {shipment.carrierCode}</h2>
            <p>Mã vận đơn: {shipment.trackingCode ?? "Chưa có"}</p>
            <p>Trạng thái: {shipment.status}</p>
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                Theo dõi tại đơn vị vận chuyển
              </a>
            )}
            <ol>
              {shipment.events.map((event) => (
                <li key={event.id}>
                  {date(event.occurredAt)} · {event.status}
                </li>
              ))}
            </ol>
          </article>
        ))
      ) : (
        <p>Chưa có kiện hàng.</p>
      )}
      <h2>Lịch sử đơn hàng</h2>
      <ol>
        {data.statusHistories.map((item, index) => (
          <li key={`${item.createdAt}-${index}`}>
            {date(item.createdAt)} · {statusText[item.status] ?? item.status}
          </li>
        ))}
      </ol>
    </section>
  );
}
