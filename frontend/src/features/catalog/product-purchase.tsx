"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { z } from "zod";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { formatPrice } from "./components";
import { TryOnCamera } from "./try-on-camera";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { emptyCart, optimisticCartAdd, type Cart } from "./commerce-state";
import { useHydrated } from "@/shared/lib/use-hydrated";

interface Variant {
  id?: string;
  sku: string;
  price: number;
  effectivePrice?: number;
  stockQuantity?: number;
  option1Value?: string | null;
  option2Value?: string | null;
  isActive?: boolean;
}
const availabilitySchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    available: z.number(),
  }),
);
export function ProductPurchase({
  productId,
  variants,
  option1Name,
  option2Name,
  canTryOn,
}: {
  productId: string;
  variants: Variant[];
  option1Name?: string | null;
  option2Name?: string | null;
  canTryOn?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const addQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingUnits = useRef(0);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [stores, setStores] = useState<z.infer<typeof availabilitySchema>>([]);
  const [storeError, setStoreError] = useState(false);
  const variant = variants[selected];
  const available =
    !!variant?.id &&
    variant.isActive !== false &&
    (variant.stockQuantity === undefined || variant.stockQuantity > 0);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!variant?.id) return;
    const controller = new AbortController();
    readBff(
      `/api/catalog/availability?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variant.id)}`,
      availabilitySchema,
      controller.signal,
    )
      .then((result) => {
        setStores(result);
        setStoreError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStoreError(true);
      });
    return () => controller.abort();
  }, [productId, variant?.id]);
  function add(buyNow = false) {
    if (!variant?.id) return;
    const variantId = variant.id;
    const units = quantity;
    setError("");
    void queryClient.cancelQueries({ queryKey: ["cart"] });
    pendingUnits.current += units;
    queryClient.setQueryData<Cart>(["cart"], (current) =>
      optimisticCartAdd(current ?? emptyCart(), units),
    );
    if (!buyNow) {
      setShowToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setShowToast(false), 2200);
    }
    addQueue.current = addQueue.current.then(async () => {
      try {
        const result = await requestBff(
          "/api/cart/items",
          z.object({ totalQuantity: z.number() }),
          {
            method: "POST",
            body: { productVariantId: variantId, quantity: units },
          },
        );
        pendingUnits.current -= units;
        queryClient.setQueryData<Cart>(["cart"], (current) => ({
          ...(current ?? emptyCart()),
          totalQuantity: result.totalQuantity + pendingUnits.current,
        }));
        if (buyNow) router.push("/cart");
      } catch (err) {
        setShowToast(false);
        pendingUnits.current -= units;
        queryClient.setQueryData<Cart>(["cart"], (current) => ({
          ...(current ?? emptyCart()),
          totalQuantity: Math.max(0, (current?.totalQuantity ?? units) - units),
        }));
        setError(apiErrorMessage(err));
      } finally {
        if (pendingUnits.current === 0) void queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
    });
  }
  return (
    <div className="pdp-purchase">
      <p className="pdp-price">{formatPrice(variant?.effectivePrice ?? variant?.price)}</p>
      {variants.length > 1 && (
        <fieldset>
          <legend>
            {option1Name || option2Name || "Phiên bản"}:{" "}
            <strong>
              {[variant?.option1Value, variant?.option2Value].filter(Boolean).join(" · ")}
            </strong>
          </legend>
          <div className="pdp-variants">
            {variants.map((item, index) => (
              <button
                type="button"
                key={item.id || item.sku}
                aria-pressed={selected === index}
                disabled={item.isActive === false || item.stockQuantity === 0}
                onClick={() => {
                  setSelected(index);
                  setQuantity(1);
                }}
              >
                {[item.option1Value, item.option2Value].filter(Boolean).join(" · ") || item.sku}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {canTryOn && <TryOnCamera key={variant?.id} productId={productId} variantId={variant?.id} />}
      <div className="pdp-quantity">
        <span>Số lượng</span>
        <button
          type="button"
          aria-label="Giảm số lượng"
          disabled={quantity <= 1}
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
        >
          −
        </button>
        <output>{quantity}</output>
        <button
          type="button"
          aria-label="Tăng số lượng"
          disabled={variant?.stockQuantity !== undefined && quantity >= variant.stockQuantity}
          onClick={() => setQuantity(quantity + 1)}
        >
          +
        </button>
      </div>
      <div className="pdp-actions">
        <button
          type="button"
          className="button pdp-add"
          onClick={() => add()}
          disabled={!available}
        >
          {available ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
        </button>
        <button
          type="button"
          className="button pdp-buy"
          onClick={() => add(true)}
          disabled={!available}
        >
          Mua ngay
        </button>
      </div>
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}
      <details className="store-availability">
        <summary>Kiểm tra tồn kho tại cửa hàng</summary>
        {storeError ? (
          <p>Chưa tải được tồn kho cửa hàng.</p>
        ) : stores.length ? (
          <ul>
            {stores.map((store) => (
              <li key={store.id}>
                <strong>{store.name}</strong>
                <small>
                  {store.address}, {store.city}
                </small>
                <span>{store.available > 0 ? `Còn ${store.available}` : "Hết hàng"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Đang cập nhật tồn kho cửa hàng.</p>
        )}
      </details>
      {hydrated &&
        showToast &&
        createPortal(
          <div className="cart-toast-overlay" role="status" aria-live="polite">
            <div className="cart-toast">
              <div className="cart-toast-icon">
                <Check size={32} strokeWidth={3} />
              </div>
              <p className="cart-toast-text">Sản phẩm đã được thêm vào Giỏ hàng</p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
