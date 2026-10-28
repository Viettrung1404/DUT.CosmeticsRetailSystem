"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import { formatPrice } from "./components";
import { TryOnCamera } from "./try-on-camera";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [wishlisted, setWishlisted] = useState(false);
  const [stores, setStores] = useState<z.infer<typeof availabilitySchema>>([]);
  const [storeError, setStoreError] = useState(false);
  const variant = variants[selected];
  const available =
    !!variant?.id &&
    variant.isActive !== false &&
    (variant.stockQuantity === undefined || variant.stockQuantity > 0);
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
  async function add(buyNow = false) {
    if (!variant?.id) return;
    setPending(true);
    setMessage("");
    try {
      await requestBff("/api/cart/items", z.object({ totalQuantity: z.number() }), {
        method: "POST",
        body: { productVariantId: variant.id, quantity },
      });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (buyNow) router.push("/cart");
      else setMessage("Đã thêm vào giỏ hàng.");
    } catch (error) {
      setMessage(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }
  async function saveWishlist() {
    setPending(true);
    setMessage("");
    try {
      await requestBff(
        `/api/account/commerce/wishlist/${productId}`,
        z.object({ productId: z.string(), isWishlisted: z.literal(true) }),
        {
          method: "PUT",
          body: { productId, selected: true, idempotencyKey: crypto.randomUUID() },
        },
      );
      setWishlisted(true);
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      setMessage("Đã lưu vào sản phẩm yêu thích.");
    } catch (error) {
      setMessage(apiErrorMessage(error));
    } finally {
      setPending(false);
    }
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
          disabled={!available || pending}
        >
          {pending ? "Đang thêm..." : available ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
        </button>
        <button
          type="button"
          className="button pdp-buy"
          onClick={() => add(true)}
          disabled={!available || pending}
        >
          Mua ngay
        </button>
      </div>
      <button
        type="button"
        className="cart-remove"
        disabled={pending || wishlisted}
        onClick={() => void saveWishlist()}
      >
        {wishlisted ? "Đã yêu thích" : "Lưu vào yêu thích"}
      </button>
      {message && (
        <p role="status" className="pdp-message">
          {message}
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
    </div>
  );
}
