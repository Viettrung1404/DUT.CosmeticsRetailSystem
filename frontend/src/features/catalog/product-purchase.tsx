"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Zap,
} from "lucide-react";
import { z } from "zod";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import dynamic from "next/dynamic";
import { formatPrice } from "./components";

const TryOnCamera = dynamic(
  () => import("./try-on-camera").then((mod) => mod.TryOnCamera),
  {
    ssr: false,
    loading: () => null,
  },
);
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { emptyCart, optimisticCartAdd, type Cart } from "./commerce-state";
import { cartSchema } from "./cart";
import { useHydrated } from "@/shared/lib/use-hydrated";
import { getWebBehaviorTracker } from "@/shared/recommendations/web-tracker";

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

function FlashSaleCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diffMs = Math.max(0, nextHour.getTime() - now.getTime());

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) {
    return (
      <div className="pdp-flash-banner">
        <div className="pdp-flash-left">
          <span className="pdp-flash-tag">
            <Zap size={14} className="pdp-flash-icon" fill="currentColor" />
            <span>FLASH SALE</span>
          </span>
          <span className="pdp-flash-sub">ĐANG DIỄN RA</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pdp-flash-banner">
      <div className="pdp-flash-left">
        <span className="pdp-flash-tag">
          <Zap size={14} className="pdp-flash-icon" fill="currentColor" />
          <span>FLASH SALE</span>
        </span>
        <span className="pdp-flash-sub">ĐANG DIỄN RA</span>
      </div>
      <div className="pdp-flash-right">
        <Clock size={13} className="pdp-clock-icon" />
        <span className="pdp-flash-timer-label">KẾT THÚC TRONG</span>
        <div className="pdp-timer-digits">
          <span className="pdp-timer-digit">{timeLeft.hours}</span>
          <span className="pdp-timer-sep">:</span>
          <span className="pdp-timer-digit">{timeLeft.minutes}</span>
          <span className="pdp-timer-sep">:</span>
          <span className="pdp-timer-digit">{timeLeft.seconds}</span>
        </div>
      </div>
    </div>
  );
}

export function ProductPurchase({
  productId,
  slug,
  productName,
  brandName,
  basePrice,
  salePrice,
  effectivePrice,
  variants,
  images = [],
  option1Name,
  option2Name,
  canTryOn,
}: {
  productId: string;
  slug?: string;
  productName?: string;
  brandName?: string | null;
  basePrice?: number;
  salePrice?: number | null;
  effectivePrice?: number | null;
  variants: Variant[];
  images?: Array<{ imageUrl: string; altText?: string | null; productVariantId?: string | null }>;
  option1Name?: string | null;
  option2Name?: string | null;
  canTryOn?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Separate option lists
  const option1Values = Array.from(
    new Set(variants.map((v) => v.option1Value).filter(Boolean)),
  ) as string[];
  const option2Values = Array.from(
    new Set(variants.map((v) => v.option2Value).filter(Boolean)),
  ) as string[];

  const hasTwoOptions = option1Values.length > 0 && option2Values.length > 0;
  const hasSingleOption =
    (option1Values.length > 0 && option2Values.length === 0) ||
    (option1Values.length === 0 && option2Values.length > 0);
  const hasFlatVariants = !hasTwoOptions && !hasSingleOption && variants.length > 1;
  const hasOptions = hasTwoOptions || hasSingleOption || hasFlatVariants;

  // Initial state: DO NOT pre-select options, allow deselecting
  const [selectedOpt1, setSelectedOpt1] = useState<string | null>(null);
  const [selectedOpt2, setSelectedOpt2] = useState<string | null>(null);
  const [selectedFlatIndex, setSelectedFlatIndex] = useState<number | null>(null);

  const [quantity, setQuantity] = useState(1);
  const addQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingUnits = useRef(0);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [stores, setStores] = useState<z.infer<typeof availabilitySchema>>([]);
  const [storeError, setStoreError] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const isInitialMount = useRef(true);

  // Active matched variant
  const variant: Variant | undefined = (() => {
    if (!hasOptions) {
      return variants[0];
    }
    if (hasTwoOptions) {
      if (!selectedOpt1 || !selectedOpt2) return undefined;
      return (
        variants.find(
          (v) =>
            v.option1Value === selectedOpt1 &&
            v.option2Value === selectedOpt2 &&
            v.isActive !== false,
        ) ||
        variants.find(
          (v) => v.option1Value === selectedOpt1 && v.option2Value === selectedOpt2,
        )
      );
    }
    if (hasSingleOption) {
      const activeOpt = option1Values.length > 0 ? selectedOpt1 : selectedOpt2;
      if (!activeOpt) return undefined;
      return (
        variants.find(
          (v) =>
            (v.option1Value === activeOpt || v.option2Value === activeOpt) &&
            v.isActive !== false,
        ) ||
        variants.find((v) => v.option1Value === activeOpt || v.option2Value === activeOpt)
      );
    }
    if (hasFlatVariants) {
      if (selectedFlatIndex === null) return undefined;
      return variants[selectedFlatIndex];
    }
    return variants[0];
  })();

  const maxStoreStock =
    stores.length > 0 ? Math.max(...stores.map((s) => s.available), 0) : undefined;
  const maxStock =
    maxStoreStock !== undefined
      ? (variant?.stockQuantity !== undefined
          ? Math.min(variant.stockQuantity, maxStoreStock)
          : maxStoreStock)
      : (variant?.stockQuantity ?? 99);

  const available =
    !!variant?.id && variant.isActive !== false && maxStock > 0;

  useEffect(() => {
    if (maxStock > 0 && quantity > maxStock) {
      setQuantity(maxStock);
    }
  }, [maxStock, quantity]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const tracker = getWebBehaviorTracker();
    if (typeof window !== "undefined") {
      void tracker.captureAttributionFromQuery(productId, window.location.search);
    }
    return tracker.startProductViewTimer({
      productId,
      variantId: variant?.id,
    });
  }, [productId, variant?.id]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!variant?.id || !images.length) return;
    const targetImg = images.find((img) => img.productVariantId === variant.id)?.imageUrl;
    if (targetImg && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("glowup:select-variant-image", {
          detail: { imageUrl: targetImg, variantId: variant.id },
        }),
      );
    }
  }, [variant?.id, images]);

  useEffect(() => {
    if (!variant?.id) {
      setStores([]);
      return;
    }
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
    if (hasOptions && !variant) {
      const missing: string[] = [];
      if (hasTwoOptions) {
        if (!selectedOpt1) missing.push(option1Name || "Màu Sắc");
        if (!selectedOpt2) missing.push(option2Name || "Dung Tích");
      } else if (hasSingleOption) {
        missing.push(option1Name || option2Name || "Phân loại hàng");
      } else {
        missing.push("Phân loại hàng");
      }
      setError(
        `Vui lòng chọn ${missing.join(" và ")} trước khi ${buyNow ? "tiến hành mua hàng" : "thêm vào giỏ"}!`,
      );
      const row = document.querySelector(".pdp-variants-row");
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (!variant?.id || !available) return;
    if (quantity > maxStock) {
      setError(`Số lượng yêu cầu (${quantity}) vượt quá tồn kho khả dụng (${maxStock})`);
      return;
    }
    const variantId = variant.id;
    const units = quantity;
    setError("");
    const attributionSource = await getWebBehaviorTracker()
      .getAttribution(productId)
      .catch(() => null);

    if (buyNow) {
      setBuyingNow(true);
      const buyNowData = {
        variantId,
        quantity: units,
        ...(attributionSource ? { attributionSource } : {}),
        productName: productName || "",
        variantName:
          [variant.option1Value, variant.option2Value].filter(Boolean).join(" - ") ||
          variant.sku ||
          "",
        price: currentPrice,
        originalPrice: rawOriginalPrice,
        imageUrl:
          images.find((img) => img.productVariantId === variant.id)?.imageUrl ||
          images[0]?.imageUrl ||
          "",
        slug: slug || "",
        createdAt: Date.now(),
      };
      try {
        sessionStorage.setItem("glowup-buy-now", JSON.stringify(buyNowData));
      } catch {
        /* storage fallback */
      }
      router.push(
        `/checkout?buyNow=1&variantId=${encodeURIComponent(variantId)}&quantity=${units}`,
      );
      return;
    }

    void queryClient.cancelQueries({ queryKey: ["cart"] });
    pendingUnits.current += units;
    queryClient.setQueryData<Cart>(["cart"], (current) =>
      optimisticCartAdd(current ?? emptyCart(), units),
    );
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 2200);

    addQueue.current = addQueue.current.then(async () => {
      try {
        const result = await requestBff(
          "/api/cart/items",
          z.object({ totalQuantity: z.number() }),
          {
            method: "POST",
            body: {
              productVariantId: variantId,
              quantity: units,
              ...(attributionSource ? { attributionSource } : {}),
            },
          },
        );
        pendingUnits.current -= units;
        queryClient.setQueryData<Cart>(["cart"], (current) => ({
          ...(current ?? emptyCart()),
          totalQuantity: result.totalQuantity + pendingUnits.current,
        }));
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

  // Price calculations
  const variantPrices = variants
    .map((v) => v.effectivePrice ?? v.price)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const minVarPrice = variantPrices.length
    ? Math.min(...variantPrices)
    : effectivePrice ?? basePrice ?? 0;
  const maxVarPrice = variantPrices.length
    ? Math.max(...variantPrices)
    : effectivePrice ?? basePrice ?? 0;
  const isPriceRange = !variant && minVarPrice !== maxVarPrice;

  const currentPrice = variant
    ? variant.effectivePrice ?? variant.price ?? basePrice ?? 0
    : minVarPrice;
  const rawOriginalPrice = variant
    ? variant.price && variant.effectivePrice && variant.price > variant.effectivePrice
      ? variant.price
      : basePrice && basePrice > currentPrice
        ? basePrice
        : null
    : salePrice && basePrice && basePrice > salePrice
      ? basePrice
      : null;
  const originalPrice = rawOriginalPrice;
  const discountPercent =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

  // Dynamic delivery date calculation
  const deliveryDates = (() => {
    const now = new Date();
    const d1 = new Date(now);
    d1.setDate(now.getDate() + 2);
    const d2 = new Date(now);
    d2.setDate(now.getDate() + 5);
    const m1 = d1.getMonth() + 1;
    const m2 = d2.getMonth() + 1;
    return `${d1.getDate()} Thg ${m1} - ${d2.getDate()} Thg ${m2}`;
  })();

  return (
    <div className="pdp-purchase">
      {/* Flash Sale Banner & Live Countdown Timer */}
      {discountPercent > 0 && <FlashSaleCountdown />}

      {/* 1. Price Box */}
      <div className="pdp-price-box">
        <div className="pdp-price-left">
          {originalPrice && (
            <span className="pdp-price-original">{formatPrice(originalPrice)}</span>
          )}
          <span className="pdp-price-current">
            {isPriceRange
              ? `${formatPrice(minVarPrice)} - ${formatPrice(maxVarPrice)}`
              : formatPrice(currentPrice)}
          </span>
          <span className="pdp-voucher-tag">
            <Ticket size={13} className="pdp-voucher-icon" />
            GIÁ SAU VOUCHER
          </span>
        </div>
        {discountPercent > 0 && (
          <div className="pdp-discount-badge">-{discountPercent}% GIẢM</div>
        )}
      </div>

      {/* 2. Vận Chuyển (Shipping Row) */}
      <div className="pdp-spec-row pdp-shipping-row">
        <div className="pdp-spec-label">Vận Chuyển</div>
        <div className="pdp-spec-value pdp-shipping-details">
          <div className="pdp-shipping-line1">
            <Clock size={15} className="pdp-icon-clock" />
            <span className="pdp-shipping-ready">Hàng Có Sẵn (Giao ngay)</span>
            <span className="pdp-shipping-dates">{deliveryDates}</span>
            <ChevronRight size={14} className="pdp-shipping-arrow" />
          </div>
        </div>
      </div>

      {/* 3. An Tâm Mua Sắm Row */}
      <div className="pdp-spec-row pdp-assurance-row">
        <div className="pdp-spec-label">An Tâm Mua Sắm Cùng GlowUp</div>
        <div className="pdp-spec-value pdp-assurance-content">
          <ShieldCheck size={16} className="pdp-icon-shield" />
          <span>Bảo hiểm Mỹ phẩm chính hãng 100% · Đổi trả 7 ngày</span>
          <ChevronDown size={14} className="pdp-assurance-chevron" />
        </div>
      </div>

      {/* 4. Variant Selection */}
      {hasTwoOptions ? (
        <>
          {/* Option 1: Màu Sắc */}
          <div className="pdp-spec-row pdp-variants-row">
            <div className="pdp-spec-label">{option1Name || "Màu Sắc"}</div>
            <div className="pdp-spec-value pdp-variants-list">
              {option1Values.map((val, idx) => {
                const isSelected = selectedOpt1 === val;
                const matchVar = variants.find((v) => v.option1Value === val);
                const pillImg =
                  images.find((img) => img.productVariantId === matchVar?.id)?.imageUrl ||
                  images[idx % (images.length || 1)]?.imageUrl;

                // Check availability with currently selected option2
                const isAvailable = variants.some(
                  (v) =>
                    v.option1Value === val &&
                    (!selectedOpt2 || v.option2Value === selectedOpt2) &&
                    v.isActive !== false &&
                    (v.stockQuantity === undefined || v.stockQuantity > 0),
                );
                const isOpt1Disabled = !isAvailable;

                return (
                  <button
                    type="button"
                    key={val}
                    className={`pdp-variant-pill ${isSelected ? "is-selected" : ""} ${isOpt1Disabled ? "is-disabled" : ""}`}
                    aria-pressed={isSelected}
                    title={
                      isSelected
                        ? `${val} (Nhấp lại để bỏ chọn)`
                        : isOpt1Disabled
                          ? `${val} (Hết hàng hoặc không có ở phân loại này)`
                          : val
                    }
                    onMouseEnter={() => {
                      if (pillImg && typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("glowup:select-variant-image", {
                            detail: { imageUrl: pillImg, variantId: matchVar?.id },
                          }),
                        );
                      }
                    }}
                    onClick={() => {
                      setError("");
                      if (isSelected) {
                        // Toggle off (bỏ chọn)
                        setSelectedOpt1(null);
                        setStores([]);
                        if (images[0]?.imageUrl && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: images[0].imageUrl, variantId: null },
                            }),
                          );
                        }
                      } else {
                        // Select option
                        setSelectedOpt1(val);
                        setQuantity(1);
                        setStores([]);
                        if (pillImg && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: pillImg, variantId: matchVar?.id },
                            }),
                          );
                        }
                      }
                    }}
                  >
                    {pillImg && (
                      <img src={pillImg} alt={val} className="pdp-variant-pill-thumb" />
                    )}
                    <span>{val}</span>
                    {isSelected && (
                      <span className="pdp-variant-check" aria-hidden="true">
                        <Check size={8} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 2: Dung Tích / Size / Quy cách */}
          <div className="pdp-spec-row pdp-variants-row">
            <div className="pdp-spec-label">{option2Name || "Dung Tích"}</div>
            <div className="pdp-spec-value pdp-variants-list-wrap">
              <div className="pdp-variants-list">
                {option2Values.map((val) => {
                  const isSelected = selectedOpt2 === val;

                  // Check availability with currently selected option1
                  const isAvailable = variants.some(
                    (v) =>
                      v.option2Value === val &&
                      (!selectedOpt1 || v.option1Value === selectedOpt1) &&
                      v.isActive !== false &&
                      (v.stockQuantity === undefined || v.stockQuantity > 0),
                  );
                  const isOpt2Disabled = !isAvailable;

                  return (
                    <button
                      type="button"
                      key={val}
                      className={`pdp-variant-pill pdp-variant-pill-text ${isSelected ? "is-selected" : ""} ${isOpt2Disabled ? "is-disabled" : ""}`}
                      aria-pressed={isSelected}
                      title={
                        isSelected
                          ? `${val} (Nhấp lại để bỏ chọn)`
                          : isOpt2Disabled
                            ? `${val} (Hết hàng hoặc không có ở phân loại này)`
                            : val
                      }
                      onClick={() => {
                        setError("");
                        if (isSelected) {
                          // Toggle off (bỏ chọn)
                          setSelectedOpt2(null);
                          setStores([]);
                        } else {
                          // Select option
                          setSelectedOpt2(val);
                          setQuantity(1);
                          setStores([]);
                        }
                      }}
                    >
                      <span>{val}</span>
                      {isSelected && (
                        <span className="pdp-variant-check" aria-hidden="true">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : hasSingleOption ? (
        <div className="pdp-spec-row pdp-variants-row">
          <div className="pdp-spec-label">
            {option1Values.length > 0 ? (option1Name || "Phân loại") : (option2Name || "Dung Tích")}
          </div>
          <div className="pdp-spec-value pdp-variants-list-wrap">
            <div className="pdp-variants-list">
              {(option1Values.length > 0 ? option1Values : option2Values).map((val, idx) => {
                const isSelected = (selectedOpt1 === val) || (selectedOpt2 === val);
                const matchVar = variants.find(
                  (v) => v.option1Value === val || v.option2Value === val,
                );
                const pillImg =
                  images.find((img) => img.productVariantId === matchVar?.id)?.imageUrl ||
                  images[idx % (images.length || 1)]?.imageUrl;
                const isOptDisabled =
                  matchVar?.isActive === false ||
                  (matchVar?.stockQuantity !== undefined && matchVar.stockQuantity <= 0);

                return (
                  <button
                    type="button"
                    key={val}
                    className={`pdp-variant-pill ${isSelected ? "is-selected" : ""} ${isOptDisabled ? "is-disabled" : ""}`}
                    aria-pressed={isSelected}
                    title={isSelected ? `${val} (Nhấp lại để bỏ chọn)` : val}
                    onMouseEnter={() => {
                      if (pillImg && typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("glowup:select-variant-image", {
                            detail: { imageUrl: pillImg, variantId: matchVar?.id },
                          }),
                        );
                      }
                    }}
                    onClick={() => {
                      setError("");
                      if (isSelected) {
                        setSelectedOpt1(null);
                        setSelectedOpt2(null);
                        setStores([]);
                        if (images[0]?.imageUrl && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: images[0].imageUrl, variantId: null },
                            }),
                          );
                        }
                      } else {
                        if (option1Values.length > 0) setSelectedOpt1(val);
                        else setSelectedOpt2(val);
                        setQuantity(1);
                        setStores([]);
                        if (pillImg && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: pillImg, variantId: matchVar?.id },
                            }),
                          );
                        }
                      }
                    }}
                  >
                    {pillImg && (
                      <img src={pillImg} alt={val} className="pdp-variant-pill-thumb" />
                    )}
                    <span>{val}</span>
                    {isSelected && (
                      <span className="pdp-variant-check" aria-hidden="true">
                        <Check size={8} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : hasFlatVariants ? (
        <div className="pdp-spec-row pdp-variants-row">
          <div className="pdp-spec-label">{option1Name || option2Name || "Phiên bản"}</div>
          <div className="pdp-spec-value pdp-variants-list-wrap">
            <div className="pdp-variants-list">
              {variants.map((item, index) => {
                const label =
                  [item.option1Value, item.option2Value].filter(Boolean).join(" · ") || item.sku;
                const isSelected = selectedFlatIndex === index;
                const pillImg =
                  images.find((img) => img.productVariantId === item.id)?.imageUrl ||
                  images[index % (images.length || 1)]?.imageUrl;
                const isItemDisabled = item.isActive === false || item.stockQuantity === 0;
                return (
                  <button
                    type="button"
                    key={item.id || item.sku}
                    className={`pdp-variant-pill ${isSelected ? "is-selected" : ""} ${isItemDisabled ? "is-disabled" : ""}`}
                    aria-pressed={isSelected}
                    disabled={isItemDisabled}
                    title={isSelected ? `${label} (Nhấp lại để bỏ chọn)` : label}
                    onMouseEnter={() => {
                      if (pillImg && typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("glowup:select-variant-image", {
                            detail: { imageUrl: pillImg, variantId: item.id },
                          }),
                        );
                      }
                    }}
                    onClick={() => {
                      setError("");
                      if (isSelected) {
                        setSelectedFlatIndex(null);
                        setStores([]);
                        if (images[0]?.imageUrl && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: images[0].imageUrl, variantId: null },
                            }),
                          );
                        }
                      } else {
                        setSelectedFlatIndex(index);
                        setQuantity(1);
                        setStores([]);
                        if (pillImg && typeof window !== "undefined") {
                          window.dispatchEvent(
                            new CustomEvent("glowup:select-variant-image", {
                              detail: { imageUrl: pillImg, variantId: item.id },
                            }),
                          );
                        }
                      }
                    }}
                  >
                    {pillImg && item.option1Value && (
                      <img src={pillImg} alt={label} className="pdp-variant-pill-thumb" />
                    )}
                    <span>{label}</span>
                    {isSelected && (
                      <span className="pdp-variant-check" aria-hidden="true">
                        <Check size={8} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Try-On Camera */}
      {canTryOn && <TryOnCamera key={variant?.id} productId={productId} variantId={variant?.id} />}

      {/* 6. Quantity Row */}
      <div className="pdp-spec-row pdp-quantity-row">
        <div className="pdp-spec-label">Số Lượng</div>
        <div className="pdp-spec-value pdp-quantity-group">
          <div className="pdp-quantity-stepper">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={!available || quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <output>{quantity}</output>
            <button
              type="button"
              aria-label="Tăng số lượng"
              disabled={!available || quantity >= maxStock}
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <span className="pdp-stock-text">
            {variant ? (
              available
                ? `(Chỉ còn ${maxStock} sản phẩm trong kho)`
                : "(Sản phẩm tạm hết hàng)"
            ) : (
              "(Vui lòng chọn phân loại hàng để xem tồn kho)"
            )}
          </span>
        </div>
      </div>

      {/* 7. Action Buttons */}
      <div className="pdp-actions">
        <button
          type="button"
          className="button pdp-btn-add"
          onClick={() => add()}
          disabled={buyingNow || (!!variant && !available)}
        >
          <ShoppingCart size={19} className="pdp-btn-cart-icon" />
          <span>{variant && !available ? "Tạm hết hàng" : "Thêm Vào Giỏ Hàng"}</span>
        </button>
        <button
          type="button"
          className="button pdp-btn-buy"
          onClick={() => add(true)}
          disabled={buyingNow || (!!variant && !available)}
        >
          {buyingNow ? "Đang đến trang thanh toán…" : "MUA NGAY"}
        </button>
      </div>

      {/* 8. Guarantees Row directly under buttons */}
      <div className="pdp-guarantees">
        <div className="pdp-guarantee-item">
          <ShieldCheck size={16} className="pdp-guarantee-icon" />
          <span>100% Chính Hãng</span>
        </div>
        <div className="pdp-guarantee-item">
          <RotateCcw size={16} className="pdp-guarantee-icon" />
          <span>Đổi Trả Miễn Phí 7 Ngày</span>
        </div>
        <div className="pdp-guarantee-item">
          <Zap size={16} className="pdp-guarantee-icon" />
          <span>Giao Nhanh 2H</span>
        </div>
      </div>

      {/* Error warning */}
      {error && (
        <p role="alert" className="cart-warning">
          {error}
        </p>
      )}

      {/* Store Availability details */}
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

      {/* Cart Toast Overlay */}
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

      {/* Mobile Sticky Bar */}
      <div className="pdp-sticky-bar" aria-label="Đặt hàng nhanh trên di động">
        <div className="pdp-sticky-price">
          <small>Giá sản phẩm</small>
          <strong>
            {isPriceRange
              ? `${formatPrice(minVarPrice)} - ${formatPrice(maxVarPrice)}`
              : formatPrice(currentPrice)}
          </strong>
        </div>
        <div className="pdp-sticky-buttons">
          <button
            type="button"
            className="button pdp-sticky-add"
            onClick={() => add()}
            disabled={buyingNow || (!!variant && !available)}
          >
            {variant && !available ? "Hết hàng" : "Thêm giỏ"}
          </button>
          <button
            type="button"
            className="button pdp-sticky-buy"
            onClick={() => add(true)}
            disabled={buyingNow || (!!variant && !available)}
          >
            {buyingNow ? "Đang xử lý…" : "Mua ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}
