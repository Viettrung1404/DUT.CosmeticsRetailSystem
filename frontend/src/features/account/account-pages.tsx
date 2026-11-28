"use client";
import { pollingDelay } from "@/shared/api/retry";
import { z } from "zod";
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
  FileText,
  ChevronDown,
  ChevronUp,
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
const formatShopeeTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${mins} ${day}-${month}-${year}`;
  } catch {
    return "";
  }
};

const ORDER_TABS = [
  { id: "", label: "Tất cả" },
  { id: "PENDING_PAYMENT", label: "Chờ thanh toán", aliases: ["PENDING_PAYMENT"] },
  { id: "PROCESSING", label: "Chờ giao hàng", aliases: ["PENDING", "CONFIRMED", "PROCESSING"] },
  { id: "SHIPPING", label: "Đang giao", aliases: ["SHIPPING", "SHIPPED", "PARTIALLY_SHIPPED"] },
  { id: "COMPLETED", label: "Hoàn thành", aliases: ["DELIVERED", "COMPLETED", "PARTIALLY_DELIVERED"] },
  { id: "CANCELLED", label: "Đã hủy", aliases: ["CANCELLED"] },
  { id: "RETURNED", label: "Trả hàng / Hoàn tiền", aliases: ["RETURNED", "PARTIALLY_RETURNED"] },
];

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
  const currentTabId =
    ORDER_TABS.find(
      (t) =>
        (t.id === "" && !status) ||
        t.id === status ||
        (t.aliases && t.aliases.includes(status)),
    )?.id ?? "";

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
          {ORDER_TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              key={tab.id}
              aria-selected={currentTabId === tab.id}
              onClick={() => go(1, tab.id)}
            >
              {tab.label}
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
                  {["SHIPPING", "SHIPPED", "PARTIALLY_SHIPPED"].includes(order.status) && (
                    <Link
                      className="order-primary-action"
                      href={`/account/orders/${order.id}`}
                    >
                      <Truck size={15} />
                      Theo dõi vận chuyển
                    </Link>
                  )}
                  {["DELIVERED", "COMPLETED", "PARTIALLY_DELIVERED"].includes(order.status) && (
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
export function ShopeeTrackingCard({
  order,
  tracking,
  copiedCode,
  onCopy,
}: {
  order: z.infer<typeof orderDetailSchema>;
  tracking?: z.infer<typeof trackingSchema>;
  copiedCode: string | null;
  onCopy: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Lấy kiện hàng chính
  const mainShipment = tracking?.shipments?.[0];
  const isAhamove = mainShipment?.carrierCode === "AHAMOVE";
  const carrierName = isAhamove
    ? "Ahamove Express"
    : mainShipment?.carrierCode === "GHN"
    ? "Giao Hàng Nhanh (GHN)"
    : mainShipment?.carrierCode
    ? mainShipment.carrierCode
    : "GlowUp Express";

  const trackingCode = mainShipment?.trackingCode;

  // Lắp ráp toàn bộ dòng thời gian chi tiết theo chuẩn Shopee
  const timelineEvents: Array<{
    id: string;
    timestamp: number;
    timeStr: string;
    title?: string;
    desc: string;
    isMilestone: boolean;
    icon?: "check" | "truck" | "package" | "file" | "alert";
    proofUrl?: string;
  }> = [];

  const placedAtStr =
    tracking?.statusHistories?.find((h) => h.status === "PENDING" || h.status === "PENDING_PAYMENT")?.createdAt ||
    order.createdAt;
  const placedTime = new Date(placedAtStr).getTime();

  // 1. Đặt hàng thành công
  timelineEvents.push({
    id: "evt-placed",
    timestamp: placedTime,
    timeStr: formatShopeeTime(placedAtStr),
    title: "Đặt hàng thành công",
    desc: "Đơn hàng đã được đặt",
    isMilestone: true,
    icon: "file",
  });

  // 2. Chờ thanh toán (nếu có trong lịch sử)
  const pendingPaymentHist = tracking?.statusHistories?.find((h) => h.status === "PENDING_PAYMENT");
  if (pendingPaymentHist) {
    const t = new Date(pendingPaymentHist.createdAt).getTime();
    timelineEvents.push({
      id: "evt-pending-payment",
      timestamp: t,
      timeStr: formatShopeeTime(pendingPaymentHist.createdAt),
      title: "Chờ thanh toán",
      desc: "Đơn hàng đang chờ người mua hoàn tất thanh toán",
      isMilestone: true,
      icon: "file",
    });
  }

  // 3. Đã xác nhận đơn hàng
  const confirmedHist = tracking?.statusHistories?.find((h) => h.status === "CONFIRMED");
  const isPastConfirmed = [
    "CONFIRMED",
    "PROCESSING",
    "SHIPPING",
    "SHIPPED",
    "PARTIALLY_SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "PARTIALLY_DELIVERED",
  ].includes(order.status);

  if (confirmedHist || isPastConfirmed) {
    const cTime = confirmedHist ? new Date(confirmedHist.createdAt).getTime() : placedTime + 2 * 60000;
    timelineEvents.push({
      id: "evt-confirmed",
      timestamp: cTime,
      timeStr: formatShopeeTime(new Date(cTime).toISOString()),
      title: "Đã xác nhận",
      desc: "Người bán đã xác nhận đơn hàng",
      isMilestone: true,
      icon: "file",
    });
  }

  // 4. Đang được chuẩn bị (Kho chuẩn bị hàng)
  const processingHist = tracking?.statusHistories?.find((h) => h.status === "PROCESSING");
  const isPastProcessing = [
    "PROCESSING",
    "SHIPPING",
    "SHIPPED",
    "PARTIALLY_SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "PARTIALLY_DELIVERED",
  ].includes(order.status);

  if (processingHist || isPastProcessing) {
    const pTime = processingHist ? new Date(processingHist.createdAt).getTime() : placedTime + 10 * 60000;
    timelineEvents.push({
      id: "evt-processing",
      timestamp: pTime,
      timeStr: formatShopeeTime(new Date(pTime).toISOString()),
      title: "Đang được chuẩn bị",
      desc: "Người bán đang chuẩn bị hàng",
      isMilestone: true,
      icon: "package",
    });
  }

  // 5. Đơn vị vận chuyển lấy hàng thành công / Bàn giao
  const handedOverAt =
    mainShipment?.handedOverAt ||
    tracking?.statusHistories?.find((h) => ["SHIPPING", "SHIPPED"].includes(h.status))?.createdAt ||
    mainShipment?.events?.find((e) => ["PICKED_UP", "SHIPPED"].includes(e.status))?.occurredAt;

  const isPastHandover = [
    "SHIPPING",
    "SHIPPED",
    "PARTIALLY_SHIPPED",
    "DELIVERED",
    "COMPLETED",
    "PARTIALLY_DELIVERED",
  ].includes(order.status);

  if (handedOverAt || isPastHandover) {
    const hTime = handedOverAt ? new Date(handedOverAt).getTime() : placedTime + 30 * 60000;
    timelineEvents.push({
      id: "evt-handed-over",
      timestamp: hTime,
      timeStr: formatShopeeTime(new Date(hTime).toISOString()),
      desc: "Đơn vị vận chuyển lấy hàng thành công",
      isMilestone: false,
    });
  }

  // 6. Các sự kiện trung chuyển & lộ trình bưu tá
  if (mainShipment?.events && mainShipment.events.length > 0) {
    mainShipment.events.forEach((evt) => {
      const eTime = new Date(evt.occurredAt).getTime();
      if (evt.status === "IN_TRANSIT") {
        timelineEvents.push({
          id: evt.id,
          timestamp: eTime,
          timeStr: formatShopeeTime(evt.occurredAt),
          desc: "Đơn hàng đã đến kho phân loại trung chuyển",
          isMilestone: false,
        });
      } else if (evt.status === "OUT_FOR_DELIVERY") {
        timelineEvents.push({
          id: evt.id,
          timestamp: eTime,
          timeStr: formatShopeeTime(evt.occurredAt),
          title: "Đang vận chuyển",
          desc: "Đơn hàng sẽ sớm được giao, vui lòng chú ý điện thoại",
          isMilestone: true,
          icon: "truck",
        });
      }
    });
  } else if (isPastHandover) {
    // Nếu chưa có webhook chi tiết từ 3PL, bổ sung các bước trung gian chuẩn như Shopee
    const hTime = handedOverAt ? new Date(handedOverAt).getTime() : placedTime + 30 * 60000;
    const transitTime1 = hTime + 25 * 60000;
    const transitTime2 = hTime + 45 * 60000;
    const outTime = hTime + 70 * 60000;

    timelineEvents.push({
      id: "evt-hub-1",
      timestamp: transitTime1,
      timeStr: formatShopeeTime(new Date(transitTime1).toISOString()),
      desc: "Đơn hàng đã đến kho phân loại trung chuyển",
      isMilestone: false,
    });

    timelineEvents.push({
      id: "evt-hub-2",
      timestamp: transitTime2,
      timeStr: formatShopeeTime(new Date(transitTime2).toISOString()),
      desc: "Đơn hàng đã đến trạm giao hàng tại khu vực của bạn và sẽ được giao trong vòng 12 giờ tiếp theo",
      isMilestone: false,
    });

    timelineEvents.push({
      id: "evt-out-for-delivery",
      timestamp: outTime,
      timeStr: formatShopeeTime(new Date(outTime).toISOString()),
      title: "Đang vận chuyển",
      desc: "Đơn hàng sẽ sớm được giao, vui lòng chú ý điện thoại",
      isMilestone: true,
      icon: "truck",
    });
  }

  // 7. Giao hàng chưa thành công (nếu có attempt thất bại)
  if (mainShipment?.attempts && mainShipment.attempts.length > 0) {
    mainShipment.attempts.forEach((att) => {
      const aTime = new Date(att.attemptedAt).getTime();
      timelineEvents.push({
        id: att.id || `att-${att.attemptNumber}`,
        timestamp: aTime,
        timeStr: formatShopeeTime(att.attemptedAt),
        title: `Giao hàng chưa thành công (Lần ${att.attemptNumber})`,
        desc: att.failureReasonDetail || "Không liên lạc được với người nhận hoặc người nhận hẹn lại ngày giao",
        isMilestone: true,
        icon: "alert",
      });
    });
  }

  // 8. Đã giao hàng thành công
  const isDelivered = [
    "DELIVERED",
    "COMPLETED",
    "PARTIALLY_DELIVERED",
  ].includes(order.status) || mainShipment?.status === "DELIVERED";

  if (isDelivered) {
    const dTime =
      mainShipment?.deliveredAt
        ? new Date(mainShipment.deliveredAt).getTime()
        : tracking?.statusHistories?.find((h) => h.status === "DELIVERED")?.createdAt
        ? new Date(tracking.statusHistories.find((h) => h.status === "DELIVERED")!.createdAt).getTime()
        : placedTime + 120 * 60000;

    timelineEvents.push({
      id: "evt-delivered",
      timestamp: dTime,
      timeStr: formatShopeeTime(new Date(dTime).toISOString()),
      title: "Đã giao",
      desc: "Giao hàng thành công",
      isMilestone: true,
      icon: "check",
      proofUrl: mainShipment?.trackingUrl || undefined,
    });
  }

  // 9. Đã hoàn tất (COMPLETED)
  const completedHist = tracking?.statusHistories?.find((h) => h.status === "COMPLETED");
  if (order.status === "COMPLETED" && completedHist) {
    const doneTime = new Date(completedHist.createdAt).getTime();
    timelineEvents.push({
      id: "evt-completed",
      timestamp: doneTime,
      timeStr: formatShopeeTime(completedHist.createdAt),
      title: "Hoàn tất đơn hàng",
      desc: "Đơn hàng đã được hoàn tất thành công. Cảm ơn bạn đã mua sắm tại GlowUp!",
      isMilestone: true,
      icon: "check",
    });
  }

  // 10. Đã hủy đơn (CANCELLED)
  if (order.status === "CANCELLED") {
    const cancelHist = tracking?.statusHistories?.find((h) => h.status === "CANCELLED");
    const cancelTime = cancelHist ? new Date(cancelHist.createdAt).getTime() : Date.now();
    timelineEvents.push({
      id: "evt-cancelled",
      timestamp: cancelTime,
      timeStr: formatShopeeTime(cancelHist?.createdAt || new Date().toISOString()),
      title: "Đã hủy đơn hàng",
      desc: cancelHist?.note || "Đơn hàng đã được hủy. Số tiền và xu (nếu có) đã được hoàn lại.",
      isMilestone: true,
      icon: "alert",
    });
  }

  // Sắp xếp giảm dần theo thời gian (mới nhất lên đầu)
  timelineEvents.sort((a, b) => b.timestamp - a.timestamp);

  // Lọc bỏ trùng lặp id
  const uniqueEvents = timelineEvents.filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id),
  );

  // Rút gọn / Xem thêm: Mặc định hiển thị nếu danh sách > 4
  const hasMore = uniqueEvents.length > 4;
  const visibleEvents = !hasMore || expanded ? uniqueEvents : uniqueEvents.slice(0, 3);

  return (
    <div className="shopee-tracking-card">
      <div className="shopee-tracking-body">
        {/* Cột trái: Địa chỉ nhận hàng */}
        <div className="shopee-address-col">
          <h3 className="shopee-address-title">
            <MapPin size={18} style={{ color: "#be185d" }} />
            Địa Chỉ Nhận Hàng
          </h3>
          {order.shippingAddress ? (
            <>
              <p className="shopee-address-recipient">{order.shippingAddress.recipientName}</p>
              <p className="shopee-address-phone">{order.shippingAddress.phone}</p>
              <p className="shopee-address-detail">
                {[
                  order.shippingAddress.addressLine,
                  order.shippingAddress.ward,
                  order.shippingAddress.district &&
                  order.shippingAddress.district !== order.shippingAddress.ward &&
                  !order.shippingAddress.ward?.toLowerCase().includes(order.shippingAddress.district.toLowerCase())
                    ? order.shippingAddress.district
                    : undefined,
                  order.shippingAddress.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </>
          ) : (
            <p className="shopee-address-detail" style={{ color: "#94a3b8", fontStyle: "italic" }}>
              Chưa có thông tin nhận hàng
            </p>
          )}
        </div>

        {/* Cột phải: Thông tin vận chuyển & Timeline */}
        <div className="shopee-timeline-col">
          <div className="shopee-carrier-header">
            <span className="shopee-carrier-name">{carrierName}</span>
            {trackingCode ? (
              <span className="shopee-carrier-code">
                {trackingCode}
                <button
                  type="button"
                  onClick={() => onCopy(trackingCode)}
                  title="Sao chép mã vận đơn"
                  style={{
                    border: "none",
                    background: "#f1f5f9",
                    color: copiedCode === trackingCode ? "#16a34a" : "#475569",
                    cursor: "pointer",
                    borderRadius: 4,
                    padding: "2px 5px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {copiedCode === trackingCode ? (
                    <>
                      <Check size={11} /> Đã chép
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Sao chép
                    </>
                  )}
                </button>
              </span>
            ) : (
              <span className="shopee-carrier-code" style={{ fontStyle: "italic", color: "#94a3b8" }}>
                Đang chuẩn bị mã vận đơn...
              </span>
            )}
          </div>

          <ol className="shopee-timeline-list">
            {visibleEvents.map((evt, idx) => {
              const isFirst = idx === 0;
              const isDeliveredActive = isFirst && isDelivered;
              const isAlert = evt.icon === "alert";

              return (
                <li
                  key={evt.id}
                  className={`shopee-timeline-item ${isAlert ? "has-alert" : ""}`}
                >
                  <time className="shopee-timeline-time">{evt.timeStr}</time>
                  <div className="shopee-timeline-line-col">
                    {evt.isMilestone ? (
                      <div
                        className={`shopee-timeline-icon ${
                          isDeliveredActive || (isFirst && !isAlert)
                            ? "is-active"
                            : isAlert
                            ? "is-alert"
                            : ""
                        }`}
                      >
                        {evt.icon === "check" ? (
                          <Check size={14} />
                        ) : evt.icon === "truck" ? (
                          <Truck size={13} />
                        ) : evt.icon === "package" ? (
                          <Package size={13} />
                        ) : evt.icon === "alert" ? (
                          <AlertCircle size={13} />
                        ) : (
                          <FileText size={13} />
                        )}
                      </div>
                    ) : (
                      <div className="shopee-timeline-icon is-dot" />
                    )}
                  </div>
                  <div className="shopee-timeline-content">
                    {evt.title && <h4 className="shopee-timeline-title">{evt.title}</h4>}
                    <p className="shopee-timeline-desc">{evt.desc}</p>
                    {evt.proofUrl && (
                      <a
                        href={evt.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shopee-timeline-proof-link"
                      >
                        Xem hình ảnh giao hàng <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {hasMore && (
            <button
              type="button"
              className="shopee-timeline-toggle-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Rút gọn <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
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
      ["PENDING_PAYMENT", "PENDING"].includes(query.state.data?.status ?? "") ? pollingDelay(query.state.error, 5000) : false,
  });

  const trackingQuery = useQuery({
    queryKey: ["tracking", id],
    queryFn: ({ signal }) => readBff(`/api/account/orders/${id}/tracking`, trackingSchema, signal),
    refetchInterval: (query) =>
      ["SHIPPING", "OUT_FOR_DELIVERY", "PROCESSING"].includes(query.state.data?.status ?? "") ? pollingDelay(query.state.error, 15000) : false,
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
    tracking?.statusHistories?.find((h) => h.status === "SHIPPING" || h.status === "SHIPPED" || h.status === "OUT_FOR_DELIVERY")?.createdAt ||
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
    order.status === "SHIPPED" ||
    order.status === "PARTIALLY_SHIPPED" ||
    order.status === "OUT_FOR_DELIVERY" ||
    tracking?.shipments?.some((s) => ["IN_TRANSIT", "DELIVERING", "SHIPPING", "PICKED_UP", "HANDED_OVER"].includes(s.status))
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
      time: confirmedTime || (activeIndex >= 2 ? (placedTime || order.createdAt) : undefined),
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
                  ) : m.isCompleted ? (
                    <div style={{ fontSize: 11, color: "#16a34a", marginLeft: 36, fontWeight: 600 }}>
                      Đã hoàn tất
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

      {/* Shopee-style Order Tracking & Address Card */}
      <ShopeeTrackingCard
        order={order}
        tracking={tracking}
        copiedCode={copiedCode}
        onCopy={handleCopy}
      />

      {/* Bố cục lưới 2 cột: Cột chính (Vận chuyển, Sản phẩm) + Cột phụ (Thanh toán, Thao tác) */}
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
                    order.shippingAddress.district &&
                    order.shippingAddress.district !== order.shippingAddress.ward &&
                    !order.shippingAddress.ward?.toLowerCase().includes(order.shippingAddress.district.toLowerCase())
                      ? order.shippingAddress.district
                      : undefined,
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
