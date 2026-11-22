"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
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
  AlertCircle,
  ExternalLink,
  Clock,
  Check,
  Copy,
  RotateCcw,
} from "lucide-react";
import { AccountHeading, StatusBadge, OrderProgress, OrderLines, OrderTotals } from "./account-ui";
import { ContentEmpty } from "@/features/catalog/content-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/features/catalog/components";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { ContinueSepayPayment } from "@/features/checkout/continue-sepay-payment";
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
const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};
const statusText: Record<string, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
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
  RETURNED: "Đã chuyển hoàn",
  CANCELLED: "Đã hủy vận đơn",
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
      <section className="account-loyalty-widget">
        <div className="account-loyalty-widget-header">
          <div className="account-loyalty-tier-badge">
            <Gem size={18} />
            <span>Hạng {profile.data?.loyaltyTier?.name ?? "Thành viên GlowUp"}</span>
          </div>
          <Link href="/account/loyalty" className="account-loyalty-details-link">
            Chi tiết quyền lợi →
          </Link>
        </div>
        <div className="account-loyalty-widget-body">
          <div className="account-loyalty-widget-balance">
            <div className="account-loyalty-icon-box">
              <Coins size={28} />
            </div>
            <div>
              <small>Số dư điểm GlowUp Rewards</small>
              <strong>
                {(profile.data?.totalPoints ?? 0).toLocaleString("vi-VN")}{" "}
                <span>xu</span>
              </strong>
              <p className="account-loyalty-cash-rate">
                Tương đương{" "}
                <strong>{formatPrice((profile.data?.totalPoints ?? 0) * 1000)}</strong> dùng giảm
                trừ trực tiếp khi thanh toán đơn hàng.
              </p>
            </div>
          </div>
          <div className="account-loyalty-widget-actions">
            <Link href="/account/loyalty/rewards" className="button account-loyalty-redeem-btn">
              <Sparkles size={16} /> Đổi voucher ưu đãi
            </Link>
          </div>
        </div>
      </section>
      <section className="account-surface">
        <div className="account-surface-header">
          <h2>Đơn hàng gần đây</h2>
          <Link href="/account/orders">Xem tất cả →</Link>
        </div>
        {orders.isPending ? (
          <ContentLoading variant="list" label="Đang tải đơn hàng…" heading={false} />
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
  const [error, setError] = useState("");
  if (query.isPending) return <ContentLoading variant="profile" label="Đang tải hồ sơ…" />;
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
    setError("");
    const input = profileInputSchema.safeParse({
      fullName: (draft.fullName ?? profile.fullName ?? "").trim(),
      phone: draft.phone || profile.phone || undefined,
      gender: draft.gender || profile.gender || undefined,
      dateOfBirth: draft.dateOfBirth || profile.dateOfBirth?.slice(0, 10) || undefined,
    });
    if (!input.success) {
      setError("Vui lòng kiểm tra thông tin đã nhập.");
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
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err));
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
          {error && (
            <p className="full-width field-error" role="alert">
              {error}
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
        <ContentLoading variant="list" label="Đang tải đơn hàng…" heading={false} />
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
                      href={`/account/orders/${order.id}`}
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["order-detail", id],
    queryFn: ({ signal }) => readBff(`/api/account/orders/${id}`, orderDetailSchema, signal),
    refetchInterval: (query) =>
      ["PENDING_PAYMENT", "PENDING"].includes(query.state.data?.status ?? "") ? 5000 : false,
  });

  const trackingQuery = useQuery({
    queryKey: ["tracking", id],
    queryFn: ({ signal }) => readBff(`/api/account/orders/${id}/tracking`, trackingSchema, signal),
    refetchInterval: (query) =>
      ["SHIPPING", "OUT_FOR_DELIVERY", "PROCESSING"].includes(query.state.data?.status ?? "") ? 15000 : false,
  });

  const handleCopy = (code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  async function cancel() {
    if (
      !window.confirm(
        "Bạn muốn hủy đơn hàng này? Toàn bộ số tiền đã thanh toán và xu đã sử dụng sẽ được hoàn lại ngay vào ví xu GlowUp của bạn.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await requestBff(`/api/account/orders/${id}`, orderDetailSchema, {
        method: "PUT",
        body: {},
      });
      client.setQueryData(["order-detail", id], result);
      client.invalidateQueries({ queryKey: ["orders"] });
      client.invalidateQueries({ queryKey: ["loyalty"] });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (query.isPending) return <ContentLoading variant="detail" label="Đang tải đơn hàng…" />;
  if (query.isError)
    return (
      <p role="alert">
        Không xem được đơn hàng này. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );

  const order = query.data;
  const tracking = trackingQuery.data;

  const isCancelled = order.status === "CANCELLED";
  const isReturned = order.status === "RETURNED";

  const placedTime =
    tracking?.statusHistories?.find((h) => h.status === "PENDING" || h.status === "PENDING_PAYMENT")?.createdAt ||
    order.createdAt;

  const confirmedTime = tracking?.statusHistories?.find(
    (h) => h.status === "CONFIRMED" || h.status === "PROCESSING",
  )?.createdAt;

  const shippingTime =
    tracking?.statusHistories?.find((h) => h.status === "SHIPPING" || h.status === "OUT_FOR_DELIVERY")?.createdAt ||
    tracking?.shipments?.[0]?.handedOverAt ||
    tracking?.shipments?.[0]?.events?.[0]?.occurredAt;

  const deliveredTime =
    tracking?.statusHistories?.find((h) => h.status === "DELIVERED" || h.status === "COMPLETED")?.createdAt ||
    tracking?.shipments?.[0]?.deliveredAt;

  let activeIndex = 0;
  if (order.status === "COMPLETED" || order.status === "DELIVERED") {
    activeIndex = 3;
  } else if (
    order.status === "SHIPPING" ||
    order.status === "OUT_FOR_DELIVERY" ||
    tracking?.shipments?.some((s) => ["IN_TRANSIT", "DELIVERING", "SHIPPING", "PICKED_UP"].includes(s.status))
  ) {
    activeIndex = 2;
  } else if (order.status === "CONFIRMED" || order.status === "PROCESSING") {
    activeIndex = 1;
  }

  const milestones = [
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

  return (
    <section className="account-screen">
      <AccountHeading
        title={`Đơn hàng #${order.orderNumber}`}
        description={`Đặt ngày ${date(order.createdAt)}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link className="button button-outline" href="/account/orders" style={{ fontSize: 13 }}>
              Danh sách đơn
            </Link>
            <StatusBadge value={order.status} />
          </div>
        }
      />

      {/* Thông báo nếu đã hủy hoặc hoàn trả */}
      {isCancelled && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
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
              Nếu bạn đã thanh toán trực tuyến, hệ thống sẽ tiến hành kiểm tra và hoàn trả theo quy định.
            </p>
          </div>
        </div>
      )}

      {isReturned && (
        <div
          style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #ffedd5",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
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
      {!isCancelled && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #efe5e7",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {milestones.map((m) => {
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
                    padding: "12px 14px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
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
                      {isDone ? <Check size={15} /> : m.step}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isCur ? 700 : 600,
                        color: isCur ? "var(--primary, #be185d)" : isDone ? "#0f172a" : "#64748b",
                      }}
                    >
                      {m.title}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 4px 36px" }}>{m.desc}</p>
                  {m.time ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: isCur ? "var(--primary, #be185d)" : "#475569",
                        fontWeight: 600,
                        marginLeft: 36,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={11} /> {formatDateTime(m.time)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 36 }}>Chưa diễn ra</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bố cục lưới 2 cột: Cột chính (Vận chuyển, Sản phẩm, Nhật ký) + Cột phụ (Người nhận, Thanh toán, Thao tác) */}
      <div className="order-detail-grid">
        <div style={{ display: "grid", gap: 24 }}>
          {/* Khối 1: Hành trình vận chuyển & Kiện hàng bưu tá */}
          <section className="account-surface">
            <div className="account-surface-header" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Truck size={20} style={{ color: "var(--primary, #be185d)" }} />
                <h2 style={{ margin: 0, fontSize: 16 }}>Hành trình vận chuyển & Kiện hàng</h2>
              </div>
              {tracking?.shipments && tracking.shipments.length > 0 && (
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {tracking.shipments.length} kiện hàng
                </span>
              )}
            </div>

            {tracking?.shipments && tracking.shipments.length > 0 ? (
              <div style={{ display: "grid", gap: 18 }}>
                {tracking.shipments.map((shipment, index) => {
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
                        borderRadius: 12,
                        padding: 18,
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {/* Header kiện hàng */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          flexWrap: "wrap",
                          gap: 10,
                          paddingBottom: 12,
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                              Kiện {tracking.shipments.length > 1 ? `#${index + 1}` : "hàng"} · {carrierDisplayName}
                            </h3>
                            <span
                              className={`tracking-carrier-badge ${isAhamove ? "is-ahamove" : "is-ghn"}`}
                              style={{ margin: 0 }}
                            >
                              {shipment.carrierServiceCode || (isAhamove ? "HỎA TỐC 2H" : "TIÊU CHUẨN")}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#64748b" }}>Mã vận đơn:</span>
                            {shipment.trackingCode ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <strong style={{ fontSize: 13, color: "#0f172a", fontFamily: "monospace" }}>
                                  {shipment.trackingCode}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(shipment.trackingCode!)}
                                  title="Sao chép mã vận đơn"
                                  style={{
                                    border: "none",
                                    background: "#e2e8f0",
                                    color: copiedCode === shipment.trackingCode ? "#16a34a" : "#475569",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                  }}
                                >
                                  {copiedCode === shipment.trackingCode ? (
                                    <>
                                      <Check size={11} /> Đã chép
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} /> Sao chép
                                    </>
                                  )}
                                </button>
                                {shipment.shipmentCode && (
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                    (Mã nội bộ: {shipment.shipmentCode})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                                Đang cấp mã vận đơn...
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 6,
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

                      {/* Nút hành động bản đồ trực tiếp / link tra cứu */}
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
                              className="button button-outline"
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
                            >
                              Tra cứu tại {carrierDisplayName} <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Cảnh báo giao không thành công */}
                      {(shipment.failedAttempts > 0 || (shipment.attempts && shipment.attempts.length > 0)) && (
                        <div className="tracking-failure-alert" role="alert" style={{ marginTop: 12 }}>
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
                      )}

                      {/* Chi tiết sản phẩm trong kiện */}
                      {shipment.packages && shipment.packages.length > 0 && (
                        <div className="tracking-package-box" style={{ marginTop: 12 }}>
                          <div className="tracking-package-header">
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Package size={15} />
                              Sản phẩm trong kiện này
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
                              )),
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Lộ trình bưu tá */}
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "#334155" }}>
                          Lộ trình di chuyển bưu tá & trạng thái vận đơn
                        </h4>
                        {shipment.events && shipment.events.length > 0 ? (
                          <ol className="tracking-timeline" style={{ margin: "10px 0 0" }}>
                            {shipment.events.map((event) => (
                              <li key={event.id}>
                                <time>{formatDateTime(event.occurredAt)}</time>
                                <strong>{shipmentStatusText[event.status] ?? event.status}</strong>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="muted" style={{ fontSize: 12, fontStyle: "italic", margin: 0 }}>
                            Đang xử lý đóng gói và cập nhật lộ trình giao nhận từ bưu tá.
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
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <Package size={22} style={{ color: "var(--primary, #be185d)", flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Đơn hàng đang trong quá trình chuẩn bị và đóng gói tại kho. Thông tin mã vận đơn và lộ trình tài xế sẽ hiển thị ngay khi bưu tá tiếp nhận kiện hàng.
                </p>
              </div>
            )}
          </section>

          {/* Khối 2: Sản phẩm trong đơn */}
          <section className="account-surface">
            <div className="account-surface-header">
              <h2>Sản phẩm trong đơn</h2>
              <span>{order.items.length} sản phẩm</span>
            </div>
            <OrderLines items={order.items} />
          </section>

          {/* Khối 3: Nhật ký xử lý & chuyển trạng thái đơn hàng */}
          <section className="account-surface">
            <div className="account-surface-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} style={{ color: "var(--primary, #be185d)" }} />
                <h2 style={{ margin: 0, fontSize: 16 }}>Nhật ký chuyển trạng thái đơn hàng</h2>
              </div>
            </div>
            {tracking?.statusHistories && tracking.statusHistories.length > 0 ? (
              <ol className="tracking-timeline" style={{ margin: "12px 0 0" }}>
                {tracking.statusHistories.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`}>
                    <time>{formatDateTime(item.createdAt)}</time>
                    <strong>{statusText[item.status] ?? item.status}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="tracking-timeline" style={{ margin: "12px 0 0" }}>
                <li>
                  <time>{formatDateTime(order.createdAt)}</time>
                  <strong>{statusText[order.status] ?? order.status}</strong>
                </li>
              </ol>
            )}
          </section>
        </div>

        {/* Cột phụ bên phải: Thông tin nhận hàng, Thanh toán, Thao tác */}
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

          <section className="account-surface">
            <h2>Thao tác đơn hàng</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <ContinueSepayPayment orderId={id} orderStatus={order.status} payments={order.payments} />
              {order.status === "COMPLETED" && (
                <Link className="button button-outline" href={`/account/returns/new?orderId=${id}`}>
                  Yêu cầu đổi trả
                </Link>
              )}
              {["PENDING_PAYMENT", "PENDING"].includes(order.status) && (
                <button
                  className="button button-outline"
                  type="button"
                  disabled={busy}
                  onClick={() => void cancel()}
                  style={{ color: "#dc2626", borderColor: "#fecaca" }}
                >
                  {busy ? "Đang hủy…" : "Hủy đơn hàng"}
                </button>
              )}
              <Link className="button button-outline" href="/account/orders">
                Quay lại danh sách đơn
              </Link>
            </div>
            {error && (
              <p role="alert" style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
                {error}
              </p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

export function TrackingPage({ id }: { id: string }) {
  return <OrderDetail id={id} />;
}
