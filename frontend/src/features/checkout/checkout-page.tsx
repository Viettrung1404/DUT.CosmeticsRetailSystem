"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { cartSchema } from "@/features/catalog/cart";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
import { userSchema } from "@/shared/auth/contracts";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Clock,
  CreditCard,
  Gift,
  LockKeyhole,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import { addressesSchema } from "@/features/addresses/contracts";
import { readBff, requestBff } from "@/shared/api/browser";
import { ApiError, apiErrorMessage } from "@/shared/api/errors";
import {
  createOrderInputSchema,
  orderSchema,
  paymentSchema,
  previewInputSchema,
  previewSchema,
  shippingSchema,
  checkoutBenefitsSchema,
  shippingQuoteResponseSchema,
} from "./contracts";
import { paymentMethodsSchema } from "./payment-methods";
import { CheckoutAddress } from "./checkout-address";
import { CheckoutBenefits, maximumCheckoutPoints } from "./checkout-benefits";
import { blankDeliveryAddress } from "@/features/addresses/address-fields";
import { isCurrentAddress } from "@/features/addresses/vietnam-divisions";

type Address = z.infer<typeof shippingSchema>;
const blank: Address = blankDeliveryAddress;
const commandStorage = "glowup-checkout-command";

function formatEstimatedDelivery(time: string) {
  if (!time) return "";
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `Giao dự kiến: ${hours}:${minutes} ngày ${day}/${month}`;
  } catch {
    return time;
  }
}

export function CheckoutPage() {
  const router = useRouter();
  const client = useQueryClient();
  const paymentMethods = useQuery({
    queryKey: ["payment-methods"],
    queryFn: ({ signal }) => readBff("/api/checkout/payment", paymentMethodsSchema, signal),
    staleTime: 30000,
  });
  const sepayAvailable = paymentMethods.data?.SEPAY === true;
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      try {
        return (await readBff("/api/auth/session", z.object({ user: userSchema.nullable() }), signal)).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });
  const addresses = useQuery({
    enabled: !!session.data,
    queryKey: ["addresses", session.data?.id],
    queryFn: ({ signal }) => readBff("/api/account/addresses", addressesSchema, signal),
  });
  const [addressId, setAddressId] = useState("");
  const [addressOverride, setAddress] = useState<Address | null>(null);
  const benefits = useQuery({
    enabled: !!session.data,
    queryKey: ["checkout-benefits", session.data?.id],
    queryFn: ({ signal }) => readBff("/api/checkout/benefits", checkoutBenefitsSchema, signal),
    staleTime: 30000,
  });
  const [couponCode, setCouponCode] = useState("");
  const [usePoints, setUsePoints] = useState(0);
  const [method, setMethod] = useState<"COD" | "SEPAY">("COD");
  const effectiveCoupon = session.data ? couponCode.trim() : "";
  const [previewRetry, setPreviewRetry] = useState(0);
  const [quoteState, setQuote] = useState<{
    key: string;
    selectionKey: string;
    value: z.infer<typeof previewSchema>;
  } | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [couponBusy, setCouponBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const previewSerial = useRef(0);

  // Real-time shipping quotes states
  const [shippingQuotes, setShippingQuotes] = useState<z.infer<typeof shippingQuoteResponseSchema> | null>(null);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string>("");
  const [shippingQuotesLoading, setShippingQuotesLoading] = useState(false);
  const [shippingQuotesError, setShippingQuotesError] = useState("");
  const [quoteExpired, setQuoteExpired] = useState(false);

  const items = useMemo(
    () =>
      cart.data?.items
        .filter((item) => item.isSelected && item.isAvailable && !item.isQuantityExceeded)
        .map((item) => ({ variantId: item.productVariantId, quantity: item.quantity })) ?? [],
    [cart.data],
  );
  const invalidSelection = !!cart.data?.items.some(
    (item) => item.isSelected && (!item.isAvailable || item.isQuantityExceeded),
  );
  const selectedAddress =
    addresses.data?.find((item) => item.id === addressId) ??
    addresses.data?.find((item) => item.isDefault) ??
    addresses.data?.[0];
  const address: Address = session.data
    ? selectedAddress
      ? {
          recipientName: selectedAddress.recipientName,
          phone: selectedAddress.phone,
          addressLine: selectedAddress.addressLine,
          ward: selectedAddress.ward,
          district: selectedAddress.district,
          city: selectedAddress.city,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        }
      : blank
    : (addressOverride ?? blank);

  const effectiveDistrict =
    address.district ||
    address.ward?.replace(/^(phường|xã|thị trấn|đặc khu)\s+/i, "") ||
    address.ward ||
    address.city;
  const hasShippingAddress = !!(address.city && (address.district || address.ward));
  const shippingAddressKey = `${address.city}|${effectiveDistrict}|${address.ward ?? ""}|${address.addressLine ?? ""}|${address.latitude ?? ""}|${address.longitude ?? ""}`;

  const fetchShippingQuotes = useCallback(async () => {
    if (!hasShippingAddress || !items.length) {
      setShippingQuotes(null);
      setSelectedShippingOptionId("");
      return;
    }
    setShippingQuotesLoading(true);
    setShippingQuotesError("");
    setQuoteExpired(false);
    try {
      const quotes = await requestBff("/api/checkout/shipping-quotes", shippingQuoteResponseSchema, {
        method: "POST",
        body: {
          items,
          shippingAddress: {
            provinceCity: address.city,
            district: effectiveDistrict,
            ward: address.ward || undefined,
            addressLine: address.addressLine || undefined,
            latitude: address.latitude ?? undefined,
            longitude: address.longitude ?? undefined,
          },
        },
      });
      setShippingQuotes(quotes);
      const available = quotes.options.filter((o) => o.isAvailable);
      setSelectedShippingOptionId((prev) => {
        if (prev && available.some((o) => (o.id || o.serviceCode) === prev)) {
          return prev;
        }
        return available[0] ? (available[0].id || available[0].serviceCode) : "";
      });
    } catch (err) {
      setShippingQuotesError(apiErrorMessage(err));
    } finally {
      setShippingQuotesLoading(false);
    }
  }, [hasShippingAddress, items, address.city, effectiveDistrict, address.ward, address.addressLine, address.latitude, address.longitude]);

  useEffect(() => {
    void fetchShippingQuotes();
  }, [items, shippingAddressKey, fetchShippingQuotes]);

  const selectedShippingOption = useMemo(() => {
    if (!shippingQuotes) return null;
    return (
      shippingQuotes.options.find(
        (o) => (o.id || o.serviceCode) === selectedShippingOptionId,
      ) ?? null
    );
  }, [shippingQuotes, selectedShippingOptionId]);

  const effectiveShippingFee = selectedShippingOption
    ? selectedShippingOption.estimatedFee
    : (quoteState?.value?.shippingFee ?? 0);

  const selectionKey = JSON.stringify({ items, couponCode: effectiveCoupon });
  const matchingQuote = quoteState?.selectionKey === selectionKey ? quoteState.value : null;
  const maximumPoints = maximumCheckoutPoints(benefits.data?.points, matchingQuote);
  const effectivePoints = session.data ? Math.min(usePoints, maximumPoints) : 0;
  const previewKey = JSON.stringify({
    items,
    invalidSelection,
    couponCode: effectiveCoupon,
    usePoints: effectivePoints,
    previewRetry,
  });
  const quote = quoteState?.key === previewKey ? quoteState.value : null;

  const effectiveTotalAmount = quote
    ? Math.max(0, quote.totalAmount - (quote.shippingFee ?? 0) + effectiveShippingFee)
    : 0;
  useEffect(() => {
    const serial = ++previewSerial.current;
    if (!items.length || invalidSelection) return;
    const input = previewInputSchema.safeParse({
      items,
      couponCode: effectiveCoupon || undefined,
      usePoints: effectivePoints,
    });
    if (!input.success) return;
    const timer = window.setTimeout(async () => {
      setQuoteBusy(true);
      setError("");
      try {
        const result = await requestBff("/api/checkout/preview", previewSchema, {
          method: "POST",
          body: input.data,
        });
        if (serial === previewSerial.current)
          setQuote({ key: previewKey, selectionKey, value: result });
      } catch (e) {
        if (serial === previewSerial.current) setError(apiErrorMessage(e));
      } finally {
        if (serial === previewSerial.current) setQuoteBusy(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, invalidSelection, effectiveCoupon, effectivePoints, previewKey, selectionKey]);
  async function applyCoupon(code: string) {
    setCouponBusy(true);
    try {
      await requestBff("/api/checkout/preview", previewSchema, {
        method: "POST",
        body: { items, couponCode: code || undefined, usePoints: 0 },
      });
      setUsePoints(0);
      setCouponCode(code);
    } finally {
      setCouponBusy(false);
    }
  }
  async function submit() {
    if (!quote || quoteBusy || busy || couponBusy) return;
    if (method === "SEPAY" && !sepayAvailable) {
      setError("SePay hiện chưa khả dụng. Vui lòng chọn thanh toán khi nhận hàng.");
      return;
    }
    const shipping = shippingSchema.safeParse(address);
    const isAddressCurrent = isCurrentAddress(address) || isCurrentAddress({ ...address, district: "" });
    if (!shipping.success || !isAddressCurrent || (session.data && !selectedAddress)) {
      setError(
        "Vui lòng kiểm tra tên, số điện thoại và chọn địa chỉ với tỉnh/thành, phường/xã hiện tại.",
      );
      return;
    }
    const payload = createOrderInputSchema.safeParse({
      items,
      couponCode: effectiveCoupon || undefined,
      usePoints: effectivePoints,
      quoteVersion: quote.quoteVersion,
      shippingAddress: {
        ...shipping.data,
        district: shipping.data.district || effectiveDistrict,
      },
      paymentMethod: method,
      idempotencyKey: crypto.randomUUID(),
      quoteGroupId: shippingQuotes?.quoteGroupId,
      shippingOptionId: selectedShippingOption
        ? (selectedShippingOption.id || selectedShippingOption.serviceCode)
        : undefined,
    });
    if (!payload.success) {
      setError("Thông tin đơn hàng chưa hợp lệ.");
      return;
    }
    setBusy(true);
    setError("");
    let createdOrderId = "";
    try {
      const currentCart = await readBff("/api/cart/items", cartSchema);
      const currentItems = currentCart.items
        .filter((item) => item.isSelected && item.isAvailable && !item.isQuantityExceeded)
        .map((item) => ({ variantId: item.productVariantId, quantity: item.quantity }));
      if (
        JSON.stringify(currentItems) !== JSON.stringify(items) ||
        currentCart.items.some(
          (item) => item.isSelected && (!item.isAvailable || item.isQuantityExceeded),
        )
      ) {
        client.setQueryData(["cart"], currentCart);
        setQuote(null);
        setPreviewRetry((value) => value + 1);
        setError("Giỏ hàng đã thay đổi. Vui lòng kiểm tra báo giá mới trước khi đặt hàng.");
        return;
      }
      const fingerprintBytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify({ ...payload.data, idempotencyKey: undefined })),
      );
      const fingerprint = Array.from(new Uint8Array(fingerprintBytes), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      let stored: { fingerprint: string; key: string } | null = null;
      try {
        stored = JSON.parse(sessionStorage.getItem(commandStorage) || "null");
      } catch {
        /* expired state */
      }
      const key = stored?.fingerprint === fingerprint ? stored.key : payload.data.idempotencyKey;
      sessionStorage.setItem(commandStorage, JSON.stringify({ fingerprint, key }));
      const order = await requestBff("/api/checkout/order", orderSchema, {
        method: "POST",
        body: { ...payload.data, idempotencyKey: key },
      });
      createdOrderId = order.id;
      setOrderId(order.id);
      client.invalidateQueries({ queryKey: ["cart"] });
      if (method === "COD") {
        sessionStorage.removeItem(commandStorage);
        router.push(`/order-success/${order.id}`);
        return;
      }
      const payment = await requestBff("/api/checkout/payment", paymentSchema, {
        method: "POST",
        body: { orderId: order.id },
      });
      sessionStorage.removeItem(commandStorage);
      router.push(`/payment/return?paymentId=${payment.paymentId}`);
    } catch (e) {
      if (
        e instanceof ApiError &&
        (e.status === 422 ||
          e.code === "SHIPPING_QUOTE_EXPIRED" ||
          e.message?.includes("báo giá") ||
          e.message?.includes("hết hạn"))
      ) {
        setQuoteExpired(true);
        setError("Báo giá vận chuyển đã hết hạn. Vui lòng bấm 'Làm mới báo giá' để cập nhật cước phí mới nhất.");
      } else if (e instanceof ApiError && e.status === 409) {
        setQuote(null);
        cart.refetch();
        setPreviewRetry((value) => value + 1);
        setError("Giá hoặc tồn kho đã thay đổi. Vui lòng xem lại báo giá trước khi đặt hàng.");
      } else if (e instanceof ApiError && e.status >= 500 && !createdOrderId) {
        setError(
          "Chưa rõ đơn hàng đã được tạo hay chưa. Bạn có thể thử lại với cùng mã thao tác hoặc kiểm tra đơn hàng của tôi.",
        );
      } else if (createdOrderId) {
        setError(
          "Đơn đã được tạo nhưng chưa mở được SePay. Hãy xem trạng thái đơn để tiếp tục thanh toán.",
        );
      } else setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (cart.isPending || session.isPending || (!!session.data && addresses.isPending))
    return <ContentLoading variant="checkout" label="Đang tải thông tin thanh toán…" />;
  if (cart.isError || session.isError)
    return (
      <p role="alert">
        Chưa tải được thông tin thanh toán.{" "}
        <button
          type="button"
          onClick={() => {
            void cart.refetch();
            void session.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  if (!items.length || invalidSelection)
    return (
      <div className="checkout-empty-state site-container">
        <div className="checkout-empty-card">
          <div className="checkout-empty-icon" aria-hidden="true">
            <ShoppingBag size={44} strokeWidth={1.5} />
          </div>
          <h1>Chưa có sản phẩm nào được chọn để thanh toán</h1>
          <p>
            Giỏ hàng của bạn đang trống hoặc các sản phẩm chưa được chọn mua.
            Vui lòng kiểm tra lại giỏ hàng hoặc tiếp tục khám phá các bộ sưu tập mỹ phẩm chính hãng tại GlowUp.
          </p>
          <div className="checkout-empty-actions">
            <Link href="/cart" className="button checkout-empty-cart-btn">
              <ArrowLeft size={16} /> Quay lại giỏ hàng
            </Link>
            <Link href="/products" className="button checkout-empty-shop-btn">
              Khám phá sản phẩm <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  return (
    <div className="checkout-page">
      <div className="checkout-page-top">
        <Link href="/cart">
          <ArrowLeft size={16} /> Quay lại giỏ hàng
        </Link>
        <span>
          <ShieldCheck size={16} /> Mua sắm an tâm cùng GlowUp
        </span>
      </div>
      <div className="checkout-page-heading">
        <div>
          <span>HOÀN TẤT ĐƠN HÀNG</span>
          <h1>Thanh toán</h1>
          <p>Chỉ còn một bước để những điều xinh đẹp đến với bạn.</p>
        </div>
        <span className="checkout-safe-badge">
          <LockKeyhole size={19} /> Thông tin được bảo vệ
        </span>
      </div>
      <ol className="checkout-stepper" aria-label="Tiến trình đặt hàng">
        <li className="is-complete">
          <span>
            <Check size={17} />
          </span>
          <div>
            Giỏ hàng<small>Đã chọn sản phẩm</small>
          </div>
        </li>
        <li aria-current="step" className="is-current">
          <span>2</span>
          <div>
            Thanh toán & ưu đãi<small>Đang thực hiện</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            Xác nhận đơn hàng<small>Bước tiếp theo</small>
          </div>
        </li>
      </ol>
      <div className="checkout-grid">
        <div className="checkout-form">
          <CheckoutAddress
            signedIn={!!session.data}
            addresses={addresses.data ?? []}
            selectedId={selectedAddress?.id}
            onSelect={(saved) => {
              setAddressId(saved.id);
              setError("");
            }}
            guestAddress={addressOverride ?? blank}
            onGuestChange={setAddress}
            loadError={addresses.isError}
            retry={() => void addresses.refetch()}
          />
          <section className="checkout-panel">
            <div className="checkout-section-title">
              <span className="checkout-section-icon">
                <Truck size={20} />
              </span>
              <div>
                <h2>Phương thức vận chuyển</h2>
                <p>Tính phí theo khoảng cách và thời gian giao hàng thực tế</p>
              </div>
            </div>

            {shippingQuotesLoading && (
              <p role="status" className="checkout-quote-updating">
                <Clock size={16} style={{ display: "inline", marginRight: 6 }} /> Đang tính toán phí vận chuyển thực tế…
              </p>
            )}

            {shippingQuotesError && (
              <p role="alert" className="cart-warning">
                {shippingQuotesError}{" "}
                <button
                  type="button"
                  onClick={() => void fetchShippingQuotes()}
                  className="checkout-shipping-refresh-btn"
                >
                  Thử lại
                </button>
              </p>
            )}

            {!hasShippingAddress && (
              <p className="checkout-shipping-note">
                Vui lòng chọn hoặc nhập đầy đủ địa chỉ giao hàng (Tỉnh/Thành, Quận/Huyện) để kiểm tra các phương thức vận chuyển khả dụng.
              </p>
            )}

            {quoteExpired && (
              <div className="checkout-shipping-expired-alert" role="alert">
                <p>Báo giá vận chuyển đã hết hạn (sau 15 phút). Vui lòng cập nhật lại báo giá để tiếp tục đặt hàng.</p>
                <button
                  type="button"
                  className="button secondary checkout-shipping-refresh-btn"
                  onClick={() => void fetchShippingQuotes()}
                >
                  <RefreshCw size={14} style={{ display: "inline", marginRight: 6 }} /> Làm mới báo giá
                </button>
              </div>
            )}

            {shippingQuotes && shippingQuotes.options.length > 0 && (
              <div className="checkout-shipping-options" role="radiogroup" aria-label="Phương thức vận chuyển">
                {shippingQuotes.options.map((option) => {
                  const optionKey = option.id || option.serviceCode;
                  const isSelected = selectedShippingOptionId === optionKey;
                  const isExpress = option.serviceCode === "EXPRESS_2H" || option.carrierCode === "AHAMOVE";
                  return (
                    <label
                      key={optionKey}
                      className={`checkout-shipping-option ${isSelected ? "is-selected" : ""} ${!option.isAvailable ? "is-disabled" : ""}`}
                    >
                      <input
                        type="radio"
                        name="shippingOption"
                        value={optionKey}
                        checked={isSelected}
                        disabled={!option.isAvailable}
                        onChange={() => {
                          if (option.isAvailable) {
                            setSelectedShippingOptionId(optionKey);
                            setError("");
                          }
                        }}
                      />
                      <span className="checkout-shipping-icon">
                        {isExpress ? <Zap size={22} /> : <Truck size={22} />}
                      </span>
                      <div className="checkout-shipping-info">
                        <div className="checkout-shipping-heading">
                          <strong>{option.serviceName || (isExpress ? "Giao hỏa tốc 2H" : "Giao hàng tiêu chuẩn")}</strong>
                          <span className={`checkout-shipping-badge ${isExpress ? "is-express" : "is-standard"}`}>
                            {option.carrierCode === "AHAMOVE" ? "Ahamove 2H" : "GHN Standard"}
                          </span>
                          {!option.isAvailable && (
                            <span className="checkout-shipping-badge is-unavailable">Không khả dụng</span>
                          )}
                        </div>
                        <p className="checkout-shipping-sub">
                          {formatEstimatedDelivery(option.estimatedDeliveryTime)}
                          {option.distanceKm != null && ` · Khoảng cách ~${option.distanceKm} km`}
                          {option.sourceLocationName && ` · Từ ${option.sourceLocationName}`}
                        </p>
                        {!option.isAvailable && option.unavailableReason && (
                          <p className="checkout-shipping-unavailable-desc">
                            {option.unavailableReason}
                          </p>
                        )}
                      </div>
                      <strong className={`checkout-shipping-fee ${option.estimatedFee === 0 ? "is-free" : ""}`}>
                        {option.estimatedFee === 0 ? "Miễn phí" : formatPrice(option.estimatedFee)}
                      </strong>
                    </label>
                  );
                })}
              </div>
            )}

            <p className="checkout-shipping-note">
              Đơn hàng được chuẩn bị kỹ lưỡng và bàn giao cho đơn vị vận chuyển chuyên nghiệp.
            </p>
          </section>
          <section className="checkout-panel">
            <div className="checkout-section-title">
              <span className="checkout-section-icon">
                <CreditCard size={20} />
              </span>
              <div>
                <h2>Phương thức thanh toán</h2>
                <p>Chọn phương thức thanh toán phù hợp với bạn</p>
              </div>
            </div>
            <label className="checkout-payment-option">
              <input
                type="radio"
                name="payment"
                checked={method === "COD"}
                onChange={() => setMethod("COD")}
              />
              <span>
                <Banknote size={24} />
              </span>
              <div>
                <strong>Thanh toán khi nhận hàng (COD)</strong>
                <small>Thanh toán cho nhân viên giao hàng khi nhận đơn.</small>
              </div>
              <em>Phổ biến</em>
            </label>
            <label className="checkout-payment-option">
              <input
                type="radio"
                name="payment"
                checked={method === "SEPAY"}
                disabled={!sepayAvailable}
                onChange={() => setMethod("SEPAY")}
              />
              <span>
                <QrCode size={24} />
              </span>
              <div>
                <strong>Chuyển khoản VietQR qua SePay</strong>
                <small>
                  {paymentMethods.isPending
                    ? "Đang kiểm tra phương thức thanh toán…"
                    : sepayAvailable
                      ? "Quét QR bằng ứng dụng ngân hàng. Đơn tự cập nhật khi tiền về."
                      : "Hiện chưa khả dụng. Vui lòng chọn thanh toán khi nhận hàng."}
                </small>
              </div>
            </label>
          </section>
          <section className="checkout-panel">
            <div className="checkout-section-title">
              <span className="checkout-section-icon">
                <Gift size={20} />
              </span>
              <div>
                <h2>Mã ưu đãi & Xu GlowUp</h2>
                <p>Chọn voucher, kết hợp xu để tiết kiệm hơn cho đơn hàng</p>
              </div>
            </div>
            {session.data ? (
              <CheckoutBenefits
                data={benefits.data}
                pending={benefits.isPending}
                loadError={benefits.isError}
                retry={() => void benefits.refetch()}
                appliedCode={effectiveCoupon}
                quote={quote}
                pointsUsed={effectivePoints}
                maximumPoints={maximumPoints}
                onPointsChange={setUsePoints}
                onApply={applyCoupon}
                disabled={busy || couponBusy || quoteBusy || !quote}
              />
            ) : (
              <div className="checkout-benefits-guest">
                <span>
                  <Gift size={25} />
                </span>
                <div>
                  <strong>Thêm ưu đãi cho đơn hàng của bạn</strong>
                  <p>
                    Đăng nhập để chọn voucher và sử dụng xu tích lũy. Ưu đãi trực tiếp trên sản phẩm
                    vẫn được tính tự động.
                  </p>
                  <Link className="button secondary" href="/login?returnTo=%2Fcheckout">
                    Đăng nhập để dùng ưu đãi <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}
          </section>
          <div className="checkout-quote-note">
            <ShieldCheck size={22} />
            <p>
              <strong>Giá trị đơn hàng được tính lại trước khi đặt hàng</strong>
              <span>Ưu đãi và tồn kho được xác nhận khi bạn đặt đơn thành công.</span>
            </p>
          </div>
        </div>
        <aside className="checkout-panel checkout-total">
          <div className="checkout-summary-heading">
            <h2>
              Đơn hàng của bạn <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </h2>
            <Link href="/cart">Sửa</Link>
          </div>
          <div className="checkout-product-list">
            {cart.data.items
              .filter((item) => item.isSelected)
              .map((item) => (
                <article className="checkout-product" key={item.id}>
                  <CatalogImage src={item.thumbnailUrl} alt={item.productName || "Sản phẩm"} />
                  <div>
                    <strong>{item.productName}</strong>
                    <small>
                      {item.variantName} · SL: {item.quantity}
                    </small>
                    <span>{formatPrice(item.totalPrice)}</span>
                  </div>
                </article>
              ))}
          </div>
          {quoteBusy && (
            <p role="status" className="checkout-quote-updating">
              Đang cập nhật báo giá…
            </p>
          )}
          {!quote && !quoteBusy && (
            <button
              type="button"
              className="cart-remove"
              onClick={() => setPreviewRetry((value) => value + 1)}
            >
              Tính lại báo giá
            </button>
          )}
          {quote && (
            <dl className="checkout-price-breakdown">
              <div>
                <dt>Tạm tính</dt>
                <dd>{formatPrice(quote.subtotal)}</dd>
              </div>
              <div>
                <dt>Ưu đãi sản phẩm & thành viên</dt>
                <dd className="is-saving">
                  −
                  {formatPrice(
                    quote.lineDiscount ?? quote.discountAmount - (quote.couponDiscount ?? 0),
                  )}
                </dd>
              </div>
              {effectiveCoupon && (
                <div>
                  <dt>Voucher {effectiveCoupon}</dt>
                  <dd className="is-saving">−{formatPrice(quote.couponDiscount ?? 0)}</dd>
                </div>
              )}
              {quote.pointsDiscount > 0 && (
                <div>
                  <dt>Xu GlowUp ({effectivePoints.toLocaleString("vi-VN")} xu)</dt>
                  <dd className="is-saving">−{formatPrice(quote.pointsDiscount)}</dd>
                </div>
              )}
              <div>
                <dt>
                  Phí giao hàng{" "}
                  <small>
                    {selectedShippingOption
                      ? selectedShippingOption.serviceName
                      : "Theo chính sách cửa hàng"}
                  </small>
                </dt>
                <dd className={effectiveShippingFee === 0 ? "is-saving" : ""}>
                  {effectiveShippingFee === 0 ? "Miễn phí" : formatPrice(effectiveShippingFee)}
                </dd>
              </div>
              <div className="checkout-grand-total">
                <dt>Tổng thanh toán</dt>
                <dd>{formatPrice(effectiveTotalAmount)}</dd>
              </div>
            </dl>
          )}
          <button
            className="button checkout-place-order"
            type="button"
            disabled={
              !quote ||
              quoteBusy ||
              couponBusy ||
              busy ||
              shippingQuotesLoading ||
              quoteExpired ||
              (!!shippingQuotes && shippingQuotes.options.length > 0 && !selectedShippingOption) ||
              !!orderId ||
              (!!session.data &&
                (!selectedAddress || addresses.isError || (!isCurrentAddress(address) && !isCurrentAddress({ ...address, district: "" }))))
            }
            onClick={() => void submit()}
          >
            {busy ? "Đang xử lý…" : method === "COD" ? "Đặt hàng COD" : "Thanh toán bằng QR SePay"}
            <ArrowRight size={18} />
          </button>
          <small>
            <LockKeyhole size={13} style={{ display: "inline", marginRight: 4 }} />
            Thông tin thanh toán được bảo vệ.
            <br />
            Kiểm tra thông tin nhận hàng trước khi đặt đơn.
          </small>
          {error && (
            <p role="alert" className="cart-warning">
              {error}
            </p>
          )}
          <div className="checkout-summary-assurance">
            <ShieldCheck size={19} />
            <span>
              Đóng gói cẩn thận
              <br />
              <strong>An tâm khi nhận hàng</strong>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
