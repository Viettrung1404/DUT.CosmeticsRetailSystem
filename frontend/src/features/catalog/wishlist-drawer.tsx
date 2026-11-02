"use client";
import { ContentLoading } from "@/shared/ui/content-loading";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { wishlistResultSchema, wishlistSchema } from "@/features/post-purchase/contracts";
import { CatalogImage, formatPrice } from "./components";
import { beginWishlistRemoval, wishlistIdsQuery, type WishlistIds } from "./commerce-state";

export function WishlistDrawer({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const client = useQueryClient();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["wishlist", "drawer"],
    queryFn: ({ signal }) => readBff("/api/wishlist?page=1&limit=100", wishlistSchema, signal),
    enabled: open,
  });
  const idsQuery = useQuery(wishlistIdsQuery());
  const total = hydrated ? (idsQuery.data?.ids.length ?? query.data?.total ?? 0) : 0;
  const visibleItems = query.data?.items.filter(
    (item) => !idsQuery.data || idsQuery.data.ids.includes(item.id),
  );

  async function remove(id: string) {
    const rollback = await beginWishlistRemoval(client, [id]);
    try {
      await requestBff(`/api/wishlist/${id}`, wishlistResultSchema, {
        method: "PUT",
        body: { productId: id, selected: false, idempotencyKey: crypto.randomUUID() },
      });
    } catch (cause) {
      rollback();
      throw cause;
    } finally {
      void client.invalidateQueries({ queryKey: ["wishlist"] });
      void client.invalidateQueries({ queryKey: ["wishlist-ids"] });
    }
  }

  async function removeOne(id: string) {
    setBusy(true);
    setError("");
    try {
      await remove(id);
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    if (!window.confirm("Xóa tất cả sản phẩm yêu thích?")) return;
    setBusy(true);
    setError("");
    const ids =
      client.getQueryData<WishlistIds>(["wishlist-ids"])?.ids ??
      query.data?.items.map((item) => item.id) ??
      [];
    const rollback = await beginWishlistRemoval(client, ids);
    try {
      for (;;) {
        const page = await readBff("/api/wishlist?page=1&limit=100", wishlistSchema);
        if (!page.items.length) break;
        for (const product of page.items) {
          await requestBff(`/api/wishlist/${product.id}`, wishlistResultSchema, {
            method: "PUT",
            body: { productId: product.id, selected: false, idempotencyKey: crypto.randomUUID() },
          });
        }
      }
    } catch (cause) {
      rollback();
      setError(apiErrorMessage(cause));
    } finally {
      setBusy(false);
      void client.invalidateQueries({ queryKey: ["wishlist"] });
      void client.invalidateQueries({ queryKey: ["wishlist-ids"] });
    }
  }

  return (
    <div className="wishlist-drawer-content">
      <div className="wishlist-drawer-heading">
        <h2>
          Ưa thích <small>({total})</small>
        </h2>
        <button type="button" disabled={busy || !total} onClick={() => void removeAll()}>
          Xóa tất cả
        </button>
      </div>
      <div className="wishlist-drawer-list">
        {hydrated &&
          idsQuery.data &&
          query.data &&
          (query.data.total !== total ||
            (query.data.total <= query.data.limit && visibleItems?.length !== total)) && (
            <p role="status">Đang đồng bộ danh sách yêu thích…</p>
          )}
        {query.isPending ? (
          <ContentLoading
            variant="list"
            label="Đang tải sản phẩm yêu thích…"
            heading={false}
            compact
          />
        ) : query.isError ? (
          <p role="alert">
            Không tải được danh sách. <button onClick={() => void query.refetch()}>Thử lại</button>
          </p>
        ) : visibleItems?.length ? (
          visibleItems.map((product) => (
            <article className="wishlist-drawer-item" key={product.id}>
              <Link
                href={`/products/${product.slug}`}
                onClick={onNavigate}
                className="wishlist-drawer-image"
              >
                <CatalogImage src={product.primaryImage} alt={product.name} />
              </Link>
              <div>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onNavigate}
                  className="wishlist-drawer-name"
                >
                  {product.name}
                </Link>
                <div className="wishlist-drawer-bottom">
                  <strong>
                    {formatPrice(product.effectivePrice ?? product.salePrice ?? product.basePrice)}
                  </strong>
                  <button type="button" disabled={busy} onClick={() => void removeOne(product.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="wishlist-drawer-empty">
            Chưa có sản phẩm yêu thích. Nhấn trái tim trên sản phẩm để lưu lại.
          </div>
        )}
        {query.data && query.data.total > query.data.items.length && (
          <Link href="/wishlist" onClick={onNavigate}>
            Xem toàn bộ danh sách
          </Link>
        )}
      </div>
      {error && (
        <p className="wishlist-drawer-error" role="alert">
          {error}
        </p>
      )}
      <Link href="/wishlist" className="wishlist-drawer-footer" onClick={onNavigate}>
        Xem trang yêu thích
      </Link>
    </div>
  );
}
