"use client";
import Link from "next/link";
import {
  Heart,
  ShoppingBag,
  Gem,
  Gift,
  Sparkles,
  Coins,
  Bell,
  Package,
  ShieldCheck,
  Ticket,
  Check,
} from "lucide-react";
import { AccountHeading } from "@/features/account/account-ui";
import { ContentEmpty } from "@/features/catalog/content-layout";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import {
  loyaltySchema,
  notificationsSchema,
  readNotificationSchema,
  redemptionSchema,
  rewardsSchema,
  wishlistResultSchema,
  wishlistSchema,
} from "./contracts";

function usePage() {
  const params = useSearchParams();
  return Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
}
function Pager({ page, total, route }: { page: number; total: number; route: string }) {
  return (
    <nav className="account-pages" aria-label="Phân trang">
      <Link
        aria-disabled={page <= 1}
        href={page > 1 ? `${route}?page=${page - 1}` : `${route}?page=1`}
      >
        Trước
      </Link>
      <span>
        {page} / {Math.max(1, Math.ceil(total / 10))}
      </span>
      <Link
        aria-disabled={page * 10 >= total}
        href={page * 10 < total ? `${route}?page=${page + 1}` : `${route}?page=${page}`}
      >
        Sau
      </Link>
    </nav>
  );
}
export function WishlistPage() {
  const page = usePage();
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["wishlist", page],
    queryFn: ({ signal }) =>
      readBff(`/api/account/commerce/wishlist?page=${page}`, wishlistSchema, signal),
  });
  async function remove(id: string) {
    setBusy(id);
    setError("");
    try {
      await requestBff(`/api/account/commerce/wishlist/${id}`, wishlistResultSchema, {
        method: "PUT",
        body: { productId: id, selected: false, idempotencyKey: crypto.randomUUID() },
      });
      await client.invalidateQueries({ queryKey: ["wishlist"] });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="account-screen">
      <AccountHeading
        title="Sản phẩm yêu thích"
        description="Lưu giữ những sản phẩm bạn yêu thích và chọn mua khi sẵn sàng."
        actions={
          query.data ? <span className="order-status">{query.data.total} sản phẩm</span> : undefined
        }
      />
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <div className="account-surface" role="alert">
          Không tải được danh sách. <button onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : query.data.items.length ? (
        <>
          <div className="wishlist-grid">
            {query.data.items.map((product) => (
              <article key={product.id} className="wishlist-card">
                <Link className="wishlist-image" href={`/products/${product.slug}`}>
                  <CatalogImage src={product.primaryImage} alt={product.name} />
                </Link>
                <button
                  className="wishlist-remove"
                  aria-label={`Bỏ yêu thích ${product.name}`}
                  disabled={!!busy}
                  onClick={() => void remove(product.id)}
                >
                  <Heart size={17} fill="currentColor" />
                </button>
                <div className="wishlist-copy">
                  <p className="catalog-brand">{product.brandName || "GLOWUP"}</p>
                  <Link href={`/products/${product.slug}`}>
                    <h2>{product.name}</h2>
                  </Link>
                  <p>
                    {formatPrice(product.effectivePrice ?? product.salePrice ?? product.basePrice)}
                  </p>
                  <Link href={`/products/${product.slug}`}>
                    <ShoppingBag size={15} />
                    Chọn phiên bản để mua
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} total={query.data.total} route="/account/wishlist" />
        </>
      ) : (
        <ContentEmpty title="Danh sách yêu thích đang trống">
          Lưu sản phẩm bạn thích để dễ dàng tìm lại trong lần mua tiếp theo.
        </ContentEmpty>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function LoyaltyPage() {
  const page = usePage();
  const query = useQuery({
    queryKey: ["loyalty", page],
    queryFn: ({ signal }) =>
      readBff(`/api/account/commerce/loyalty?page=${page}`, loyaltySchema, signal),
  });
  if (query.isPending) return <p role="status">Đang tải điểm thưởng…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Không tải được điểm thưởng. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );
  const data = query.data;
  const remaining = data.nextTier ? Math.max(0, data.nextTier.minPoints - data.balance) : 0;
  return (
    <section className="account-screen">
      <AccountHeading
        title="Điểm thưởng & Hạng thành viên"
        description="Theo dõi số dư điểm và quyền lợi thành viên GlowUp của bạn."
      />
      <div className="loyalty-hero">
        <section className="loyalty-membership">
          <Gem size={30} />
          <h2>GlowUp Rewards · {data.tier?.name ?? "Thành viên"}</h2>
          <p>ĐIỂM THƯỞNG HIỆN CÓ</p>
          <strong>{data.balance.toLocaleString("vi-VN")}</strong>
          <div>
            <span>Điểm GlowUp</span>
            <Link href="/account/loyalty/rewards">Đổi ưu đãi →</Link>
          </div>
        </section>
        <section className="loyalty-next">
          <span className="content-icon">
            <Sparkles size={24} />
          </span>
          <h2>
            {data.nextTier ? `Hướng tới hạng ${data.nextTier.name}` : "Quyền lợi dành cho bạn"}
          </h2>
          {data.nextTier ? (
            <>
              <p>Còn {remaining.toLocaleString("vi-VN")} điểm để đạt ngưỡng của hạng tiếp theo.</p>
              <progress
                value={Math.min(data.balance, data.nextTier.minPoints)}
                max={Math.max(1, data.nextTier.minPoints)}
                aria-label="Tiến độ điểm tới hạng tiếp theo"
              />
              <strong>
                {data.balance.toLocaleString("vi-VN")} /{" "}
                {data.nextTier.minPoints.toLocaleString("vi-VN")} điểm
              </strong>
            </>
          ) : (
            <p>Khám phá ưu đãi đang có trong mục đổi điểm của bạn.</p>
          )}
        </section>
      </div>
      <section className="account-surface">
        <div className="account-surface-header">
          <h2>Lịch sử tích lũy & đổi điểm thưởng</h2>
          <Coins size={22} />
        </div>
        {data.history.length ? (
          <div className="account-table-scroll">
            <table className="points-table">
              <thead>
                <tr>
                  <th>Giao dịch</th>
                  <th>Ngày</th>
                  <th>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {{
                          EARN: "Tích điểm mua hàng",
                          REDEEM: "Sử dụng điểm",
                          REFUND: "Hoàn điểm",
                          ADJUSTMENT: "Điều chỉnh điểm",
                        }[item.type] ?? item.type}
                      </strong>
                      <small>{item.description}</small>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className={item.points > 0 ? "points-positive" : "points-negative"}>
                      {item.points > 0 ? "+" : ""}
                      {item.points.toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Chưa có giao dịch điểm.</p>
        )}
        <Pager page={page} total={data.total} route="/account/loyalty" />
      </section>
    </section>
  );
}
export function RewardsPage() {
  const client = useQueryClient();
  const keys = useRef(new Map<string, string>());
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState<z.infer<typeof redemptionSchema>["coupon"] | null>(null);
  const query = useQuery({
    queryKey: ["rewards"],
    queryFn: ({ signal }) => readBff("/api/account/commerce/rewards", rewardsSchema, signal),
  });
  const loyalty = useQuery({
    queryKey: ["loyalty", 1],
    queryFn: ({ signal }) => readBff("/api/account/commerce/loyalty?page=1", loyaltySchema, signal),
  });
  async function redeem(code: string) {
    if (!window.confirm("Bạn muốn dùng điểm để đổi ưu đãi này?")) return;
    setBusy(code);
    setMessage("");
    const storageKey = `glowup-redeem:${code}`;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {
      /* storage unavailable */
    }
    const key =
      keys.current.get(code) ??
      (saved && z.uuid().safeParse(saved).success ? saved : crypto.randomUUID());
    keys.current.set(code, key);
    try {
      sessionStorage.setItem(storageKey, key);
    } catch {
      /* storage unavailable */
    }
    try {
      const result = await requestBff("/api/account/commerce/redeem", redemptionSchema, {
        method: "POST",
        body: { rewardCode: code, idempotencyKey: key },
      });
      keys.current.delete(code);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* storage unavailable */
      }
      setCoupon(result.coupon);
      setMessage("Đổi ưu đãi thành công. Mã chỉ áp dụng theo điều kiện và hạn sử dụng hiển thị.");
      void client.invalidateQueries({ queryKey: ["loyalty"] });
    } catch (e) {
      setMessage(apiErrorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="account-screen">
      <AccountHeading
        title="Đổi điểm lấy ưu đãi & Quà tặng"
        description="Chọn ưu đãi phù hợp và sử dụng điểm thưởng GlowUp của bạn."
      />
      <div className="rewards-balance">
        <div>
          <p>ĐIỂM CÓ THỂ SỬ DỤNG</p>
          <strong>{loyalty.data?.balance.toLocaleString("vi-VN") ?? "—"} điểm</strong>
        </div>
        <Link href="/account/loyalty">Xem lịch sử điểm →</Link>
      </div>
      {query.isPending ? (
        <p role="status">Đang tải ưu đãi…</p>
      ) : query.isError ? (
        <div className="account-surface" role="alert">
          Chính sách đổi ưu đãi hiện chưa khả dụng.{" "}
          <button onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : query.data.length ? (
        <div className="reward-grid">
          {query.data.map((reward) => (
            <article className="reward-card" key={`${reward.code}-${reward.version}`}>
              <div className="reward-art">
                <Ticket size={40} />
                <strong>
                  {reward.discountType === "PERCENTAGE"
                    ? `${reward.discountValue}%`
                    : formatPrice(reward.discountValue)}
                </strong>
              </div>
              <div className="reward-copy">
                <p className="account-kicker">GLOWUP REWARDS</p>
                <h2>
                  Ưu đãi giảm{" "}
                  {reward.discountType === "PERCENTAGE"
                    ? `${reward.discountValue}%`
                    : formatPrice(reward.discountValue)}
                </h2>
                <p>
                  Đơn hàng từ {formatPrice(reward.minOrderAmount)} · Hiệu lực {reward.validityDays}{" "}
                  ngày sau đổi.
                </p>
                <div>
                  <strong>{reward.pointsCost.toLocaleString("vi-VN")} điểm</strong>
                  <button
                    disabled={
                      !!busy || (loyalty.data ? loyalty.data.balance < reward.pointsCost : false)
                    }
                    onClick={() => void redeem(reward.code)}
                  >
                    {busy === reward.code ? "Đang đổi…" : "Đổi ngay"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <ContentEmpty title="Chưa có ưu đãi để đổi">
          Các quyền lợi đổi điểm mới sẽ được cập nhật tại đây.
        </ContentEmpty>
      )}
      {message && (
        <div className="account-tip" role="status">
          <Gift size={22} />
          <p>{message}</p>
        </div>
      )}
      {coupon && (
        <div className="account-surface">
          <h2>Ưu đãi đã đổi thành công</h2>
          <p>
            Mã ưu đãi: <strong>{coupon.code}</strong>
          </p>
          <p>Hạn dùng: {new Date(coupon.endDate).toLocaleDateString("vi-VN")}</p>
        </div>
      )}
      <div className="account-tip">
        <ShieldCheck size={22} />
        <p>
          Kiểm tra điều kiện và thời hạn trước khi đổi. Số điểm và quyền lợi được hệ thống xác nhận
          khi thực hiện.
        </p>
      </div>
    </section>
  );
}
export function NotificationsPage() {
  const page = usePage();
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["notifications", page],
    queryFn: ({ signal }) =>
      readBff(`/api/account/commerce/notifications?page=${page}`, notificationsSchema, signal),
  });
  async function mark(id: string) {
    setBusy(id);
    setError("");
    try {
      await requestBff(`/api/account/commerce/notifications/${id}`, readNotificationSchema, {
        method: "PUT",
        body: {},
      });
      void client.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="account-screen">
      <AccountHeading
        title="Thông báo của bạn"
        description="Cập nhật đơn hàng, quyền lợi và các thông tin quan trọng từ GlowUp."
        actions={
          query.data ? (
            <span className="order-status">{query.data.unreadCount} chưa đọc</span>
          ) : undefined
        }
      />
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <div className="account-surface" role="alert">
          Không tải được thông báo. <button onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : (
        <>
          <div className="notification-list">
            {query.data.items.map((item) => (
              <article
                className={`notification-item ${!item.isRead ? "is-unread" : ""}`}
                key={item.id}
              >
                <span className="content-icon">
                  {item.type === "ORDER" ? (
                    <Package size={23} />
                  ) : item.type === "LOYALTY" ? (
                    <Coins size={23} />
                  ) : (
                    <Bell size={23} />
                  )}
                </span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                  <time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time>
                </div>
                {!item.isRead && (
                  <button disabled={!!busy} onClick={() => void mark(item.id)}>
                    <Check size={14} style={{ display: "inline", marginRight: 4 }} />
                    Đánh dấu đã đọc
                  </button>
                )}
              </article>
            ))}
          </div>
          {!query.data.items.length && (
            <ContentEmpty title="Chưa có thông báo">
              Các cập nhật mới sẽ được hiển thị tại đây.
            </ContentEmpty>
          )}
          <Pager page={page} total={query.data.total} route="/account/notifications" />
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
