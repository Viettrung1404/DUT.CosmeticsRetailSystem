"use client";
import Link from "next/link";
import {
  Sparkles,
  ShoppingBag,
  Gem,
  Coins,
  CreditCard,
  UserRound,
  MapPin,
  ShieldCheck,
  Truck,
  Package,
  ArrowRight,
  LockKeyhole,
  Search,
} from "lucide-react";
import { AccountHeading, StatusBadge, OrderProgress, OrderLines, OrderTotals } from "./account-ui";
import { ContentEmpty } from "@/features/catalog/content-layout";
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
    <div className="account-screen">
      <header className="account-welcome">
        <div>
          <p className="account-kicker">GLOWUP BEAUTY & CARE</p>
          <h1>Rất vui được gặp lại bạn, {name}!</h1>
          <p>{email}</p>
        </div>
        <Sparkles size={70} />
      </header>
      <div className="account-overview-stats">
        {[
          {
            icon: ShoppingBag,
            value: profile.data?.totalOrders,
            label: "Đơn hàng",
            href: "/account/orders",
          },
          {
            icon: Coins,
            value: profile.data?.totalPoints,
            label: "Điểm thưởng",
            href: "/account/loyalty",
          },
          {
            icon: Gem,
            value: profile.data?.loyaltyTier?.name,
            label: "Hạng thành viên",
            href: "/account/loyalty",
          },
          {
            icon: CreditCard,
            value: profile.data ? formatPrice(profile.data.totalSpent) : undefined,
            label: "Tổng chi tiêu",
            href: "/account/orders",
          },
        ].map((item) => (
          <Link href={item.href} key={item.label}>
            <item.icon size={22} />
            <strong>{item.value ?? "—"}</strong>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      {profile.isError && <p role="alert">Chưa tải được tổng quan tài khoản.</p>}
      <section className="account-surface">
        <div className="account-surface-header">
          <h2>Đơn hàng gần đây</h2>
          <Link href="/account/orders">Xem tất cả →</Link>
        </div>
        {orders.isPending ? (
          <p role="status">Đang tải đơn hàng…</p>
        ) : orders.isError ? (
          <p role="alert">Chưa tải được đơn hàng.</p>
        ) : orders.data.orders.length ? (
          <div className="order-cards">
            {orders.data.orders.slice(0, 3).map((order) => (
              <article key={order.id} className="order-card">
                <header className="order-card-header">
                  <strong>{order.orderNumber}</strong>
                  <StatusBadge value={order.status} />
                </header>
                <OrderLines items={order.items.slice(0, 1)} />
                <footer className="order-card-footer">
                  <p>
                    Thành tiền <strong>{formatPrice(order.totalAmount)}</strong>
                  </p>
                  <Link href={`/account/orders/${order.id}`}>
                    Xem chi tiết <ArrowRight size={14} />
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <ContentEmpty title="Bạn chưa có đơn hàng">
            Khám phá sản phẩm và bắt đầu hành trình làm đẹp cùng GlowUp.
          </ContentEmpty>
        )}
      </section>
      <nav className="account-shortcuts" aria-label="Truy cập nhanh">
        <Link href="/account/profile">
          <UserRound size={18} />
          Hồ sơ cá nhân
        </Link>
        <Link href="/account/addresses">
          <MapPin size={18} />
          Sổ địa chỉ
        </Link>
        <Link href="/account/security">
          <ShieldCheck size={18} />
          Bảo mật tài khoản
        </Link>
      </nav>
    </div>
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
    <section className="account-screen">
      <AccountHeading
        title="Thông tin cá nhân"
        description="Quản lý thông tin hồ sơ để có trải nghiệm mua sắm thuận tiện hơn."
      />
      <div className="account-surface">
        <div className="profile-identity">
          <span className="profile-initial">
            {(profile.fullName || profile.email || "G").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2>{profile.fullName || "Tài khoản GlowUp"}</h2>
            <p>{profile.email}</p>
          </div>
        </div>
        <form className="account-form-grid" onSubmit={(event) => void save(event)}>
          <label className="full-width">
            Họ và tên
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={draft.fullName ?? profile.fullName ?? ""}
              onChange={(event) =>
                setDraft((value) => ({ ...value, fullName: event.target.value }))
              }
            />
          </label>
          <label>
            Email đăng nhập
            <input value={profile.email ?? ""} readOnly />
            <small className="muted">Email được dùng để xác thực tài khoản.</small>
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              autoComplete="tel"
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
          <div className="profile-actions">
            <button
              type="button"
              className="button button-outline"
              disabled={busy}
              onClick={() => setDraft({})}
            >
              Hủy thay đổi
            </button>
            <button className="button" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
          {message && (
            <p className="full-width" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
      <div className="account-tip">
        <LockKeyhole size={20} />
        <p>
          Để đặt lại mật khẩu, sử dụng email đăng ký tại{" "}
          <Link href="/forgot-password">trang khôi phục mật khẩu</Link>.
        </p>
      </div>
    </section>
  );
}
export function OrdersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = (params.get("search") ?? "").slice(0, 100);
  const year = /^20\d{2}$/.test(params.get("year") ?? "") ? params.get("year")! : "";
  const status = orderStatusSchema.safeParse(params.get("status")).success
    ? params.get("status")!
    : "";
  const query = useQuery({
    queryKey: ["orders", page, status, search, year],
    queryFn: ({ signal }) =>
      readBff(
        `/api/account/orders?page=${page}${status ? `&status=${status}` : ""}&search=${encodeURIComponent(search)}&year=${year}`,
        ordersSchema,
        signal,
      ),
  });
  const go = (nextPage: number, nextStatus = status, nextSearch = search, nextYear = year) => {
    const query = new URLSearchParams({ page: String(nextPage) });
    if (nextStatus) query.set("status", nextStatus);
    if (nextSearch) query.set("search", nextSearch);
    if (nextYear) query.set("year", nextYear);
    router.push(`/account/orders?${query}`);
  };
  return (
    <section className="account-screen orders-screen">
      <div className="orders-screen-header">
        <AccountHeading
          title="Đơn hàng của tôi"
          description="Theo dõi, quản lý đơn hàng và xem lại các sản phẩm đã mua."
        />
        <div role="tablist" className="account-tabs" aria-label="Trạng thái đơn hàng">
          {["", ...orderStatusSchema.options].map((value) => (
            <button
              type="button"
              role="tab"
              key={value}
              aria-selected={status === value}
              onClick={() => go(1, value)}
            >
              {value ? statusText[value] : "Tất cả"}
            </button>
          ))}
        </div>
        <form
          className="orders-search"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            go(
              1,
              status,
              String(fields.get("search") ?? "").trim(),
              String(fields.get("year") ?? ""),
            );
          }}
        >
          <label>
            <Search size={17} />
            <input
              name="search"
              key={search}
              defaultValue={search}
              maxLength={100}
              aria-label="Tìm đơn hàng"
              placeholder="Tìm kiếm theo mã đơn hàng hoặc tên sản phẩm…"
            />
          </label>
          <select name="year" aria-label="Năm đặt hàng" defaultValue={year} key={year}>
            <option value="">Tất cả các năm</option>
            {Array.from(
              { length: new Date().getUTCFullYear() - 1999 },
              (_, index) => new Date().getUTCFullYear() - index,
            ).map((value) => (
              <option key={value} value={value}>
                Năm {value}
              </option>
            ))}
          </select>
          <button type="submit">Tìm kiếm</button>
        </form>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải đơn hàng…</p>
      ) : query.isError ? (
        <div className="account-surface" role="alert">
          Không tải được đơn hàng. <button onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : query.data.orders.length ? (
        <>
          <div className="order-cards">
            {query.data.orders.map((order) => (
              <article className="order-card" key={order.id}>
                <header className="order-card-header">
                  <div>
                    <strong>Mã đơn hàng: #{order.orderNumber}</strong>
                    <small>{date(order.createdAt)}</small>
                  </div>
                  <StatusBadge value={order.status} />
                </header>
                <OrderLines items={order.items} />
                <footer className="order-card-footer">
                  <p>
                    Thành tiền <strong>{formatPrice(order.totalAmount)}</strong>
                  </p>
                  <Link href={`/account/orders/${order.id}`}>
                    Xem chi tiết <ArrowRight size={14} />
                  </Link>
                  {order.status === "SHIPPING" && (
                    <Link
                      className="order-primary-action"
                      href={`/account/orders/${order.id}/tracking`}
                    >
                      <Truck size={15} />
                      Theo dõi vận chuyển
                    </Link>
                  )}
                  {order.status === "COMPLETED" && (
                    <Link href={`/account/returns/new?orderId=${order.id}`}>Yêu cầu đổi trả</Link>
                  )}
                </footer>
              </article>
            ))}
          </div>
          <nav className="account-pages" aria-label="Phân trang đơn hàng">
            <button disabled={page <= 1} onClick={() => go(page - 1)}>
              Trước
            </button>
            <span>
              {page} / {query.data.totalPages}
            </span>
            <button disabled={page >= query.data.totalPages} onClick={() => go(page + 1)}>
              Sau
            </button>
          </nav>
        </>
      ) : (
        <ContentEmpty title="Chưa có đơn hàng trong trạng thái này">
          Các đơn hàng của bạn sẽ được hiển thị tại đây.
        </ContentEmpty>
      )}
      <div className="account-tip">
        <ShieldCheck size={22} />
        <p>
          <strong>Cần trợ giúp với đơn hàng của bạn?</strong>
          <br />
          <Link href="/help">Trung tâm trợ giúp</Link> ·{" "}
          <Link href="/chinh-sach-doi-tra">Chính sách đổi trả 7 ngày</Link>
        </p>
      </div>
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
    <section className="account-screen">
      <AccountHeading
        title={`Đơn hàng #${order.orderNumber}`}
        description={`Đặt ngày ${date(order.createdAt)}`}
        actions={<StatusBadge value={order.status} />}
      />
      <OrderProgress status={order.status} />
      <div className="order-detail-grid">
        <div className="account-surface">
          <div className="account-surface-header">
            <h2>Sản phẩm trong đơn</h2>
            <span>{order.items.length} sản phẩm</span>
          </div>
          <OrderLines items={order.items} />
        </div>
        <aside className="order-detail-aside">
          <section className="account-surface order-recipient">
            <h2>
              <MapPin size={19} style={{ display: "inline", marginRight: 8 }} />
              Thông tin người nhận
            </h2>
            {order.shippingAddress ? (
              <>
                <p>
                  <strong>{order.shippingAddress.recipientName}</strong>
                </p>
                <p>{order.shippingAddress.phone}</p>
                <p>
                  {[
                    order.shippingAddress.addressLine,
                    order.shippingAddress.ward,
                    order.shippingAddress.district,
                    order.shippingAddress.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </>
            ) : (
              <p>Chưa có thông tin nhận hàng.</p>
            )}
          </section>
          <section className="account-surface">
            <h2>Thanh toán & Chi phí</h2>
            <OrderTotals order={order} />
            {order.payments?.map((payment) => (
              <p key={payment.id} className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                {payment.paymentMethod} ·{" "}
                {payment.status === "COMPLETED" ? "Đã thanh toán" : "Chưa xác nhận thanh toán"}
              </p>
            ))}
          </section>
        </aside>
      </div>
      <nav className="account-shortcuts">
        <Link href={`/account/orders/${id}/tracking`}>
          <Truck size={18} />
          Theo dõi vận chuyển
        </Link>
        {order.status === "COMPLETED" && (
          <Link href={`/account/returns/new?orderId=${id}`}>Yêu cầu đổi trả</Link>
        )}
        {order.status === "PENDING" && (
          <button
            className="button button-outline"
            type="button"
            disabled={busy}
            onClick={() => void cancel()}
          >
            {busy ? "Đang hủy…" : "Hủy đơn hàng"}
          </button>
        )}
      </nav>
      {error && <p role="alert">{error}</p>}
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
    <section className="account-screen">
      <AccountHeading
        title="Hành trình vận chuyển"
        description="Cập nhật các mốc giao nhận và trạng thái kiện hàng."
        actions={
          <Link className="button button-outline" href={`/account/orders/${id}`}>
            Chi tiết đơn hàng
          </Link>
        }
      />
      <section className="tracking-hero">
        <div>
          <p className="account-kicker">CẬP NHẬT ĐƠN HÀNG</p>
          <h2>{statusText[data.status] ?? data.status}</h2>
          <p>Thông tin được cập nhật theo quá trình xử lý và bàn giao thực tế.</p>
        </div>
        <Truck size={64} />
      </section>
      {data.shipments.length ? (
        data.shipments.map((shipment) => (
          <section className="account-surface" key={shipment.id}>
            <div className="account-surface-header">
              <h2>Kiện hàng · {shipment.carrierCode}</h2>
              <span className="order-status">{shipment.status}</span>
            </div>
            <p className="muted">Mã vận đơn: {shipment.trackingCode ?? "Đang cập nhật"}</p>
            {shipment.trackingUrl && (
              <a
                className="content-product-link"
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Theo dõi tại đơn vị vận chuyển <ArrowRight size={14} />
              </a>
            )}
            <ol className="tracking-timeline">
              {shipment.events.map((event) => (
                <li key={event.id}>
                  <time>{date(event.occurredAt)}</time>
                  <strong>{event.status}</strong>
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : (
        <div className="account-tip">
          <Package size={22} />
          <p>
            Đơn hàng chưa được bàn giao cho đơn vị vận chuyển. Thông tin kiện hàng sẽ được cập nhật
            tại đây.
          </p>
        </div>
      )}
      <section className="account-surface">
        <h2>Nhật ký xử lý đơn hàng</h2>
        <ol className="tracking-timeline">
          {data.statusHistories.map((item, index) => (
            <li key={`${item.createdAt}-${index}`}>
              <time>{date(item.createdAt)}</time>
              <strong>{statusText[item.status] ?? item.status}</strong>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
