"use client";
import Link from "next/link";
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
    <section className="panel">
      <h1>Sản phẩm yêu thích</h1>
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <p role="alert">
          Không tải được danh sách. <button onClick={() => query.refetch()}>Thử lại</button>
        </p>
      ) : query.data.items.length ? (
        <>
          <div className="benefit-cards">
            {query.data.items.map((product) => (
              <article key={product.id}>
                <Link href={`/products/${product.slug}`}>
                  <CatalogImage src={product.primaryImage ?? undefined} alt={product.name} />
                  <h2>{product.name}</h2>
                </Link>
                <p>
                  {formatPrice(product.effectivePrice ?? product.salePrice ?? product.basePrice)}
                </p>
                <div className="account-links">
                  <Link href={`/products/${product.slug}`}>Chọn phiên bản để mua</Link>
                  <button disabled={!!busy} onClick={() => void remove(product.id)}>
                    Bỏ yêu thích
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} total={query.data.total} route="/account/wishlist" />
        </>
      ) : (
        <p>Chưa có sản phẩm yêu thích.</p>
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
  return (
    <section className="panel">
      <h1>Điểm thưởng</h1>
      <div className="account-stat-grid">
        <div>
          <strong>{data.balance}</strong>
          <span>Điểm hiện có</span>
        </div>
        <div>
          <strong>{data.tier?.name ?? "—"}</strong>
          <span>Hạng hiện tại</span>
        </div>
        <div>
          <strong>{data.nextTier?.name ?? "—"}</strong>
          <span>Hạng tiếp theo</span>
        </div>
      </div>
      <Link className="button" href="/account/loyalty/rewards">
        Đổi ưu đãi
      </Link>
      <h2>Lịch sử điểm</h2>
      <div className="account-list">
        {data.history.map((item) => (
          <article key={item.id}>
            <div>
              <strong>{item.type}</strong>
              <small>
                {item.description ?? new Date(item.createdAt).toLocaleDateString("vi-VN")}
              </small>
            </div>
            <strong>
              {item.points > 0 ? "+" : ""}
              {item.points}
            </strong>
          </article>
        ))}
      </div>
      {!data.history.length && <p>Chưa có giao dịch điểm.</p>}
      <Pager page={page} total={data.total} route="/account/loyalty" />
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
    <section className="panel">
      <h1>Đổi ưu đãi</h1>
      {query.isPending ? (
        <p role="status">Đang tải ưu đãi…</p>
      ) : query.isError ? (
        <p role="alert">
          Chính sách đổi ưu đãi hiện chưa khả dụng.{" "}
          <button onClick={() => query.refetch()}>Thử lại</button>
        </p>
      ) : query.data.length ? (
        <div className="benefit-cards">
          {query.data.map((reward) => (
            <article key={`${reward.code}-${reward.version}`}>
              <h2>{reward.code}</h2>
              <p>{reward.pointsCost} điểm</p>
              <p>
                Giảm{" "}
                {reward.discountType === "PERCENTAGE"
                  ? `${reward.discountValue}%`
                  : formatPrice(reward.discountValue)}
              </p>
              <p>
                Đơn tối thiểu {formatPrice(reward.minOrderAmount)} · Hiệu lực {reward.validityDays}{" "}
                ngày sau đổi
              </p>
              <button className="button" disabled={!!busy} onClick={() => void redeem(reward.code)}>
                {busy === reward.code ? "Đang đổi…" : "Đổi ưu đãi"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p>Chưa có ưu đãi để đổi.</p>
      )}
      {message && <p role="status">{message}</p>}
      {coupon && (
        <div className="notice">
          <p>
            Mã ưu đãi: <strong>{coupon.code}</strong>
          </p>
          <p>Hạn dùng: {new Date(coupon.endDate).toLocaleDateString("vi-VN")}</p>
        </div>
      )}
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
    <section className="panel">
      <h1>Thông báo</h1>
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <p role="alert">
          Không tải được thông báo. <button onClick={() => query.refetch()}>Thử lại</button>
        </p>
      ) : (
        <>
          <p>{query.data.unreadCount} chưa đọc</p>
          <div className="account-list">
            {query.data.items.map((item) => (
              <article key={item.id}>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                  <small>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</small>
                </div>
                {!item.isRead && (
                  <button disabled={!!busy} onClick={() => void mark(item.id)}>
                    Đánh dấu đã đọc
                  </button>
                )}
              </article>
            ))}
          </div>
          {!query.data.items.length && <p>Chưa có thông báo.</p>}
          <Pager page={page} total={query.data.total} route="/account/notifications" />
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
