"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { cartSchema } from "@/features/catalog/cart";
import { formatPrice } from "@/features/catalog/components";
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
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: ({ signal }) => readBff("/api/cart/items", cartSchema, signal),
  });
  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: ({ signal }) => readBff("/api/account/addresses", addressesSchema, signal),
  });
  const [addressId, setAddressId] = useState("");
  const [addressOverride, setAddress] = useState<Address | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [usePoints, setUsePoints] = useState(0);
  const [method, setMethod] = useState<"COD" | "VNPAY">("COD");
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
    couponCode: couponCode.trim(),
    usePoints,
    previewRetry,
  });
  const quote = quoteState?.key === previewKey ? quoteState.value : null;
  useEffect(() => {
    const serial = ++previewSerial.current;
    if (!items.length || invalidSelection) return;
    const input = previewInputSchema.safeParse({
      items,
      couponCode: couponCode.trim() || undefined,
      usePoints,
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
  }, [items, invalidSelection, couponCode, usePoints, previewKey]);
  async function submit() {
    if (!quote || quoteBusy || busy) return;
    const shipping = shippingSchema.safeParse(address);
    if (!shipping.success) {
      setError("Vui lòng kiểm tra tên, số điện thoại và địa chỉ nhận hàng.");
      return;
    }
    const payload = createOrderInputSchema.safeParse({
      items,
      couponCode: couponCode.trim() || undefined,
      usePoints,
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
  if (cart.isPending || addresses.isPending)
    return <p role="status">Đang tải thông tin thanh toán…</p>;
  if (cart.isError || addresses.isError)
    return (
      <p role="alert">
        Vui lòng <Link href="/login?returnTo=%2Fcheckout">đăng nhập</Link> và tải lại thông tin
        thanh toán.
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
          <h2>Địa chỉ nhận hàng</h2>
          {!!addresses.data?.length && (
            <label>
              Địa chỉ đã lưu
              <select
                value={addressOverride ? "" : (selectedAddress?.id ?? "")}
                onChange={(event) => {
                  const id = event.target.value;
                  setAddressId(id);
                  setAddress(id ? null : blank);
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
          {(["recipientName", "phone", "addressLine", "ward", "district", "city"] as const).map(
            (field) => (
              <label key={field}>
                {
                  {
                    recipientName: "Người nhận",
                    phone: "Số điện thoại",
                    addressLine: "Số nhà, đường",
                    ward: "Phường / xã",
                    district: "Quận / huyện",
                    city: "Tỉnh / thành phố",
                  }[field]
                }
                <input
                  value={address[field] ?? ""}
                  required={
                    field === "recipientName" ||
                    field === "phone" ||
                    field === "addressLine" ||
                    field === "city"
                  }
                  onChange={(event) => {
                    setAddressId("");
                    setAddress({ ...address, [field]: event.target.value });
                  }}
                />
              </label>
            ),
          )}
        </section>
        <section className="checkout-panel">
          <h2>Ưu đãi</h2>
          <label>
            Mã giảm giá
            <input
              value={couponCode}
              maxLength={50}
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
        </section>
        <section className="checkout-panel">
          <h2>Phương thức thanh toán</h2>
          <label>
            <input
              type="radio"
              name="payment"
              checked={method === "COD"}
              onChange={() => setMethod("COD")}
            />{" "}
            Thanh toán khi nhận hàng (COD)
          </label>
          <label>
            <input
              type="radio"
              name="payment"
              checked={method === "VNPAY"}
              onChange={() => setMethod("VNPAY")}
            />{" "}
            VNPAY
          </label>
        </section>
      </div>
      <aside className="checkout-panel checkout-total">
        <h2>Đơn hàng của bạn</h2>
        <p>{items.length} sản phẩm đã chọn</p>
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
          <>
            <p>
              Tạm tính <strong>{formatPrice(quote.subtotal)}</strong>
            </p>
            <p>
              Giảm giá <strong>−{formatPrice(quote.discountAmount + quote.pointsDiscount)}</strong>
            </p>
            <p>
              Giao hàng <strong>{formatPrice(quote.shippingFee)}</strong>
            </p>
            <p className="checkout-grand">
              Tổng cộng <strong>{formatPrice(quote.totalAmount)}</strong>
            </p>
            <small>Giá và tồn kho được xác nhận lại khi đặt hàng.</small>
          </>
        )}
        <button
          className="button"
          type="button"
          disabled={!quote || quoteBusy || busy || !!orderId}
          onClick={() => void submit()}
        >
          {busy ? "Đang xử lý…" : method === "COD" ? "Đặt hàng COD" : "Tiếp tục đến VNPAY"}
        </button>
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
