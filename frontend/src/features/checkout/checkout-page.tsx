"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { cartSchema } from "@/features/catalog/cart";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
import { OrderTotals } from "@/features/account/account-ui";
import { userSchema } from "@/shared/auth/contracts";
import { UserRound, LockKeyhole, ShieldCheck } from "lucide-react";
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
} from "./contracts";
import { safeVnpayUrl } from "./payment-url";

type Address = z.infer<typeof shippingSchema>;
const blank: Address = {
  recipientName: "",
  phone: "",
  addressLine: "",
  ward: "",
  district: "",
  city: "",
};
const commandStorage = "glowup-checkout-command";

export function CheckoutPage() {
  const router = useRouter();
  const client = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async ({ signal }) => {
      try {
        return (await readBff("/api/auth/session", z.object({ user: userSchema }), signal)).user;
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
    queryKey: ["addresses"],
    queryFn: ({ signal }) => readBff("/api/account/addresses", addressesSchema, signal),
  });
  const [addressId, setAddressId] = useState("");
  const [addressOverride, setAddress] = useState<Address | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [usePoints, setUsePoints] = useState(0);
  const [method, setMethod] = useState<"COD" | "VNPAY">("COD");
  const effectiveCoupon = session.data ? couponCode.trim() : "";
  const effectivePoints = session.data ? usePoints : 0;
  const [previewRetry, setPreviewRetry] = useState(0);
  const [quoteState, setQuote] = useState<{
    key: string;
    value: z.infer<typeof previewSchema>;
  } | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const previewSerial = useRef(0);
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
  const address: Address =
    addressOverride ??
    (selectedAddress
      ? {
          recipientName: selectedAddress.recipientName,
          phone: selectedAddress.phone,
          addressLine: selectedAddress.addressLine,
          ward: selectedAddress.ward,
          district: selectedAddress.district,
          city: selectedAddress.city,
        }
      : blank);
  const previewKey = JSON.stringify({
    items,
    invalidSelection,
    couponCode: effectiveCoupon,
    usePoints: effectivePoints,
    previewRetry,
  });
  const quote = quoteState?.key === previewKey ? quoteState.value : null;
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
        if (serial === previewSerial.current) setQuote({ key: previewKey, value: result });
      } catch (e) {
        if (serial === previewSerial.current) setError(apiErrorMessage(e));
      } finally {
        if (serial === previewSerial.current) setQuoteBusy(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [items, invalidSelection, effectiveCoupon, effectivePoints, previewKey]);
  async function submit() {
    if (!quote || quoteBusy || busy) return;
    const shipping = shippingSchema.safeParse(address);
    if (!shipping.success) {
      setError("Vui lòng kiểm tra tên, số điện thoại và địa chỉ nhận hàng.");
      return;
    }
    const payload = createOrderInputSchema.safeParse({
      items,
      couponCode: effectiveCoupon || undefined,
      usePoints: effectivePoints,
      quoteVersion: quote.quoteVersion,
      shippingAddress: shipping.data,
      paymentMethod: method,
      idempotencyKey: crypto.randomUUID(),
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
      const redirect = safeVnpayUrl(payment.paymentUrl);
      if (!redirect) {
        setError(
          "Đơn đã được tạo. Chưa có liên kết VNPAY hợp lệ; hãy kiểm tra trạng thái đơn trước khi thử tiếp.",
        );
        return;
      }
      sessionStorage.removeItem(commandStorage);
      window.location.assign(redirect);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
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
          "Đơn đã được tạo nhưng chưa mở được VNPAY. Hãy xem trạng thái đơn để tiếp tục thanh toán.",
        );
      } else setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (cart.isPending || session.isPending || (!!session.data && addresses.isPending))
    return <p role="status">Đang tải thông tin thanh toán…</p>;
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
      <p>
        Giỏ hàng chưa có sản phẩm hợp lệ được chọn. <Link href="/cart">Quay lại giỏ hàng</Link>
      </p>
    );
  return (
    <div className="checkout-grid">
      <div className="checkout-form">
        <section className="checkout-panel">
          <h2>
            <span>1</span>Địa chỉ nhận hàng
          </h2>
          {!session.data && (
            <div className="checkout-guest-note">
              <UserRound size={22} />
              <p>
                Bạn đang mua hàng không cần tài khoản.{" "}
                <Link href="/login?returnTo=%2Fcheckout">Đăng nhập</Link> để dùng địa chỉ đã lưu và
                quyền lợi thành viên.
              </p>
            </div>
          )}
          {addresses.isError && (
            <p role="alert">
              Chưa tải được sổ địa chỉ. Bạn có thể nhập địa chỉ nhận hàng bên dưới.
            </p>
          )}
          {!!addresses.data?.length && (
            <label className="checkout-saved-address">
              Địa chỉ đã lưu
              <select
                value={addressOverride ? "" : (selectedAddress?.id ?? "")}
                onChange={(event) => {
                  setAddressId(event.target.value);
                  setAddress(event.target.value ? null : blank);
                }}
              >
                <option value="">Nhập địa chỉ khác</option>
                {addresses.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.recipientName} · {item.addressLine}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="checkout-address-grid">
            {(["recipientName", "phone", "city", "district", "ward", "addressLine"] as const).map(
              (field) => (
                <label className={field === "addressLine" ? "address-wide" : ""} key={field}>
                  {
                    {
                      recipientName: "Họ và tên người nhận",
                      phone: "Số điện thoại",
                      addressLine: "Số nhà, tên đường",
                      ward: "Phường / xã",
                      district: "Quận / huyện",
                      city: "Tỉnh / thành phố",
                    }[field]
                  }
                  <input
                    type={field === "phone" ? "tel" : "text"}
                    autoComplete={
                      field === "recipientName"
                        ? "shipping name"
                        : field === "phone"
                          ? "shipping tel"
                          : field === "addressLine"
                            ? "shipping street-address"
                            : undefined
                    }
                    value={address[field] ?? ""}
                    required={["recipientName", "phone", "addressLine", "city"].includes(field)}
                    onChange={(event) => {
                      setAddressId("");
                      setAddress({ ...address, [field]: event.target.value });
                    }}
                  />
                </label>
              ),
            )}
          </div>
        </section>
        <section className="checkout-panel">
          <h2>
            <span>2</span>Phương thức thanh toán
          </h2>
          <label className="checkout-payment-option">
            <input
              type="radio"
              name="payment"
              checked={method === "COD"}
              onChange={() => setMethod("COD")}
            />
            <span>COD</span>
            <div>
              <strong>Thanh toán khi nhận hàng</strong>
              <small>Thanh toán cho nhân viên giao hàng khi nhận đơn.</small>
            </div>
          </label>
          <label className="checkout-payment-option">
            <input
              type="radio"
              name="payment"
              checked={method === "VNPAY"}
              onChange={() => setMethod("VNPAY")}
            />
            <span>VNPAY</span>
            <div>
              <strong>Thanh toán trực tuyến qua VNPAY</strong>
              <small>Chuyển đến cổng thanh toán để hoàn tất giao dịch.</small>
            </div>
          </label>
        </section>
        <section className="checkout-panel">
          <h2>
            <span>3</span>Mã ưu đãi & Điểm GlowUp Rewards
          </h2>
          {session.data ? (
            <div className="checkout-address-grid">
              <label>
                Mã giảm giá
                <input
                  value={couponCode}
                  maxLength={50}
                  placeholder="Nhập mã ưu đãi"
                  onChange={(event) => setCouponCode(event.target.value)}
                />
              </label>
              <label>
                Điểm muốn dùng
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={usePoints}
                  onChange={(event) => setUsePoints(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
            </div>
          ) : (
            <div className="account-tip">
              <ShieldCheck size={22} />
              <p>
                <Link href="/login?returnTo=%2Fcheckout">Đăng nhập</Link> để sử dụng mã ưu đãi và
                điểm thành viên. Các khuyến mãi áp dụng trực tiếp trên sản phẩm vẫn được tính vào
                báo giá.
              </p>
            </div>
          )}
        </section>
      </div>
      <aside className="checkout-panel checkout-total">
        <h2>Đơn hàng của bạn</h2>
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
              </div>
              <span>{formatPrice(item.totalPrice)}</span>
            </article>
          ))}
        {quoteBusy && <p role="status">Đang cập nhật báo giá…</p>}
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
          <OrderTotals
            order={{ ...quote, discountAmount: quote.discountAmount + quote.pointsDiscount }}
          />
        )}
        <button
          className="button"
          type="button"
          disabled={!quote || quoteBusy || busy || !!orderId}
          onClick={() => void submit()}
        >
          {busy ? "Đang xử lý…" : method === "COD" ? "Đặt hàng COD" : "Tiếp tục đến VNPAY"}
        </button>
        <small>
          <LockKeyhole size={13} style={{ display: "inline", marginRight: 4 }} />
          Thông tin thanh toán được bảo vệ.
          <br />
          Giá và tồn kho được xác nhận lại khi đặt hàng.
        </small>
        {orderId && (
          <p>
            Đơn đã tạo. <Link href={`/order-success/${orderId}`}>Xem đơn hàng</Link>
          </p>
        )}
        {error && (
          <p role="alert" className="cart-warning">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
