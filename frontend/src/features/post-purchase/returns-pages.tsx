"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { productPageSchema } from "@/features/catalog/contracts";
import { formatPrice } from "@/features/catalog/components";
import { orderDetailSchema, ordersSchema } from "@/features/account/contracts";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import {
  createReturnInputSchema,
  imageUploadSchema,
  returnCreatedSchema,
  returnDetailSchema,
  returnsSchema,
  returnStatusSchema,
  exchangeSchema,
  imageUrlSchema,
} from "./contracts";
import { canAcceptQuote } from "./return-quote";

function EvidenceLink({ id }: { id: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    setUrl("");
    try {
      const result = await readBff(`/api/account/commerce/image/${id}`, imageUrlSchema);
      const target = new URL(result.url);
      if (target.protocol !== "https:" || target.username || target.password)
        throw new Error("INVALID_IMAGE_URL");
      setUrl(target.href);
    } catch {
      setError("Chưa mở được ảnh. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span>
      <button type="button" disabled={busy} onClick={() => void load()}>
        {busy ? "Đang lấy ảnh…" : "Lấy liên kết ảnh"}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Mở ảnh (5 phút)
        </a>
      )}
      {error && <span role="alert">{error}</span>}
    </span>
  );
}

const reasonLabels: Record<string, string> = {
  WRONG_ITEM: "Giao sai sản phẩm",
  DEFECTIVE: "Sản phẩm lỗi",
  EXPIRED: "Hết hạn sử dụng",
  ALLERGIC: "Kích ứng",
  CUSTOMER_CHANGE_MIND: "Đổi ý",
};
function Pager({ page, total, status }: { page: number; total: number; status: string }) {
  const href = (next: number) =>
    `/account/returns?page=${next}${status ? `&status=${status}` : ""}`;
  return (
    <nav className="account-pages" aria-label="Phân trang">
      <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}>
        Trước
      </Link>
      <span>
        {page} / {Math.max(1, Math.ceil(total / 10))}
      </span>
      <Link aria-disabled={page * 10 >= total} href={href(page * 10 >= total ? page : page + 1)}>
        Sau
      </Link>
    </nav>
  );
}
export function ReturnsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = returnStatusSchema.safeParse(params.get("status")).success
    ? params.get("status")!
    : "";
  const query = useQuery({
    queryKey: ["returns", page, status],
    queryFn: ({ signal }) =>
      readBff(
        `/api/account/commerce/returns?page=${page}${status ? `&status=${status}` : ""}`,
        returnsSchema,
        signal,
      ),
  });
  return (
    <section className="panel">
      <h1>Yêu cầu đổi trả</h1>
      <div className="account-links">
        <Link className="button" href="/account/returns/new">
          Tạo yêu cầu
        </Link>
      </div>
      <label>
        Trạng thái{" "}
        <select
          value={status}
          onChange={(event) => router.push(`/account/returns?status=${event.target.value}`)}
        >
          <option value="">Tất cả</option>
          {returnStatusSchema.options.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <p role="alert">
          Không tải được yêu cầu. <button onClick={() => query.refetch()}>Thử lại</button>
        </p>
      ) : (
        <>
          <div className="account-list">
            {query.data.items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.returnCode}</strong>
                  <small>
                    {item.returnType} · {item.status}
                  </small>
                  <p>{reasonLabels[item.reason] ?? item.reason}</p>
                </div>
                <Link href={`/account/returns/${item.id}`}>Xem chi tiết</Link>
              </article>
            ))}
          </div>
          {!query.data.items.length && <p>Chưa có yêu cầu trong trạng thái này.</p>}
          <Pager page={page} total={query.data.total} status={status} />
        </>
      )}
    </section>
  );
}
export function NewReturnPage() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const orderId = params.get("orderId");
  const ordersPage = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const validOrder = !!orderId && z.uuid().safeParse(orderId).success;
  const orders = useQuery({
    queryKey: ["completed-orders", ordersPage],
    enabled: !validOrder,
    queryFn: ({ signal }) =>
      readBff(`/api/account/orders?status=COMPLETED&page=${ordersPage}`, ordersSchema, signal),
  });
  const order = useQuery({
    queryKey: ["order-detail", orderId],
    enabled: validOrder,
    queryFn: ({ signal }) => readBff(`/api/account/orders/${orderId}`, orderDetailSchema, signal),
  });
  const [type, setType] = useState<"REFUND" | "EXCHANGE">("REFUND");
  const [reason, setReason] =
    useState<z.infer<typeof createReturnInputSchema>["reason"]>("DEFECTIVE");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [replacementId, setReplacementId] = useState("");
  const [replacementQuantity, setReplacementQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const command = useRef<{ fingerprint: string; key: string } | null>(null);
  const products = useQuery({
    queryKey: ["replacement-search", search],
    enabled: type === "EXCHANGE" && search.trim().length >= 2,
    queryFn: ({ signal }) =>
      readBff(
        `/api/catalog/products?q=${encodeURIComponent(search.trim())}`,
        productPageSchema,
        signal,
      ),
  });
  async function upload(file: File) {
    if (
      attachmentIds.length >= 5 ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Chọn tối đa 5 ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/account/return-image", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error("UPLOAD_FAILED");
      const result = imageUploadSchema.parse(body);
      setAttachmentIds((value) => [...value, result.attachmentId]);
    } catch {
      setError("Không tải được ảnh bằng chứng. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }
  async function submit() {
    if (!validOrder || !order.data || busy || uploading) return;
    const items = order.data.items
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({ orderItemId: item.id, quantity: quantities[item.id] }));
    const input = createReturnInputSchema.safeParse({
      orderId,
      type,
      reason,
      items,
      attachmentIds,
      replacements:
        type === "EXCHANGE"
          ? replacementId
            ? [{ productVariantId: replacementId, quantity: replacementQuantity }]
            : []
          : undefined,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!input.success) {
      setError("Chọn sản phẩm, số lượng và sản phẩm thay thế nếu yêu cầu đổi hàng.");
      return;
    }
    const { idempotencyKey, ...payload } = input.data;
    const fingerprint = JSON.stringify(payload);
    const key = command.current?.fingerprint === fingerprint ? command.current.key : idempotencyKey;
    command.current = { fingerprint, key };
    setBusy(true);
    setError("");
    try {
      const created = await requestBff("/api/account/commerce/returns", returnCreatedSchema, {
        method: "POST",
        body: { ...payload, idempotencyKey: key },
      });
      command.current = null;
      void client.invalidateQueries({ queryKey: ["returns"] });
      router.push(`/account/returns/${created.id}`);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (!validOrder)
    return (
      <section className="panel">
        <h1>Chọn đơn hàng cần đổi trả</h1>
        <p>Backend quyết định thời hạn 7 ngày tính từ khi đơn hoàn thành.</p>
        {orders.isPending ? (
          <p>Đang tải…</p>
        ) : orders.isError ? (
          <p role="alert">Không tải được đơn hàng.</p>
        ) : orders.data.orders.length ? (
          <>
            {orders.data.orders.map((item) => (
              <p key={item.id}>
                <Link href={`/account/returns/new?orderId=${item.id}`}>{item.orderNumber}</Link>
              </p>
            ))}
            <nav className="account-pages" aria-label="Phân trang đơn hoàn thành">
              <Link
                aria-disabled={ordersPage <= 1}
                href={`/account/returns/new?page=${Math.max(1, ordersPage - 1)}`}
              >
                Trước
              </Link>
              <span>
                {ordersPage} / {orders.data.totalPages}
              </span>
              <Link
                aria-disabled={ordersPage >= orders.data.totalPages}
                href={`/account/returns/new?page=${Math.min(orders.data.totalPages, ordersPage + 1)}`}
              >
                Sau
              </Link>
            </nav>
          </>
        ) : (
          <p>Chưa có đơn hoàn thành trong trang này.</p>
        )}
      </section>
    );
  if (order.isPending) return <p role="status">Đang tải đơn hàng…</p>;
  if (order.isError) return <p role="alert">Không xem được đơn hàng.</p>;
  if (order.data.status !== "COMPLETED") return <p>Đơn hàng chưa đủ điều kiện đổi trả.</p>;
  return (
    <section className="panel">
      <h1>Tạo yêu cầu đổi trả</h1>
      <p>
        Đơn {order.data.orderNumber}. Yêu cầu chỉ được nhận trong 7 ngày từ khi đơn hoàn thành; hệ
        thống kiểm tra lại khi gửi.
      </p>
      <div className="account-form">
        <label>
          Loại yêu cầu
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "REFUND" | "EXCHANGE")}
          >
            <option value="REFUND">Hoàn trả</option>
            <option value="EXCHANGE">Đổi hàng</option>
          </select>
        </label>
        <label>
          Lý do
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as typeof reason)}
          >
            {Object.entries(reasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Sản phẩm và số lượng</legend>
          {order.data.items.map((item) => (
            <label key={item.id}>
              {item.productName} · {item.variantName} (đã mua {item.quantity})
              <input
                type="number"
                min="0"
                max={item.quantity}
                step="1"
                value={quantities[item.id] ?? 0}
                onChange={(event) =>
                  setQuantities((value) => ({
                    ...value,
                    [item.id]: Math.max(
                      0,
                      Math.min(item.quantity, Number(event.target.value) || 0),
                    ),
                  }))
                }
              />
            </label>
          ))}
        </fieldset>
        {type === "EXCHANGE" && (
          <fieldset>
            <legend>Sản phẩm thay thế</legend>
            <label>
              Tìm sản phẩm
              <input value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {products.isPending && search.length >= 2 && <p>Đang tìm…</p>}
            <label>
              Phiên bản
              <select
                value={replacementId}
                onChange={(event) => setReplacementId(event.target.value)}
              >
                <option value="">Chọn phiên bản</option>
                {products.data?.data.flatMap((product) =>
                  product.variants
                    .filter((variant) => variant.id && variant.isActive !== false)
                    .map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {product.name} · {variant.option1Value || variant.sku}
                      </option>
                    )),
                )}
              </select>
            </label>
            <label>
              Số lượng thay thế
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={replacementQuantity}
                onChange={(event) =>
                  setReplacementQuantity(Math.max(1, Number(event.target.value) || 1))
                }
              />
            </label>
          </fieldset>
        )}
        <label>
          Ảnh bằng chứng (tối đa 5 ảnh, mỗi ảnh 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || attachmentIds.length >= 5}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        <p>{attachmentIds.length} ảnh đã tải lên</p>
        <button
          className="button"
          type="button"
          disabled={busy || uploading}
          onClick={() => void submit()}
        >
          {busy ? "Đang gửi…" : "Gửi yêu cầu"}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
export function ReturnDetailPage({ id }: { id: string }) {
  const [now, setNow] = useState(() => Date.now());
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState<z.infer<typeof exchangeSchema> | null>(null);
  const key = useRef<{ version: number; value: string } | null>(null);
  const query = useQuery({
    queryKey: ["return", id],
    queryFn: ({ signal }) =>
      readBff(`/api/account/commerce/returns/${id}`, returnDetailSchema, signal),
  });
  const originalOrder = useQuery({
    queryKey: ["order-detail", query.data?.orderId],
    enabled: !!query.data?.orderId,
    queryFn: ({ signal }) =>
      readBff(`/api/account/orders/${query.data?.orderId}`, orderDetailSchema, signal),
  });
  useEffect(() => {
    const expiresAt = query.data?.quoteExpiresAt;
    if (!expiresAt) return;
    const delay = new Date(expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(delay + 100, 2147483647)),
    );
    return () => window.clearTimeout(timer);
  }, [query.data?.quoteExpiresAt]);
  async function accept() {
    const data = query.data;
    if (
      !data?.quoteSnapshot ||
      !data.quoteExpiresAt ||
      new Date(data.quoteExpiresAt).getTime() <= Date.now()
    )
      return;
    if (!window.confirm("Xác nhận báo giá đổi hàng hiện tại?")) return;
    const value =
      key.current?.version === data.quoteVersion ? key.current.value : crypto.randomUUID();
    key.current = { version: data.quoteVersion, value };
    setBusy(true);
    setError("");
    try {
      const result = await requestBff(
        `/api/account/commerce/returns/${id}/accept`,
        exchangeSchema,
        {
          method: "POST",
          body: { quoteVersion: data.quoteVersion, paymentMethod: "COD", idempotencyKey: value },
        },
      );
      key.current = null;
      setAccepted(result);
      void client.invalidateQueries({ queryKey: ["return", id] });
    } catch (e) {
      setError(apiErrorMessage(e));
      void query.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (query.isPending) return <p role="status">Đang tải yêu cầu…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Không xem được yêu cầu. <button onClick={() => query.refetch()}>Thử lại</button>
      </p>
    );
  const data = query.data;
  const quoteValid = canAcceptQuote(data, now);
  return (
    <section className="panel">
      <h1>Yêu cầu {data.returnCode}</h1>
      <p>
        Trạng thái: <strong>{data.status}</strong> · {data.returnType}
      </p>
      <p>Lý do: {reasonLabels[data.reason] ?? data.reason}</p>
      <p>
        <Link href={`/account/orders/${data.orderId}`}>Xem đơn hàng gốc</Link>
      </p>
      <h2>Sản phẩm</h2>
      <div className="account-list">
        {data.items.map((item) => (
          <article key={item.id}>
            <span>
              {originalOrder.data?.items.find((line) => line.id === item.orderItemId)
                ?.productName ?? "Sản phẩm"}{" "}
              · Số lượng {item.quantity}
            </span>
            <strong>{formatPrice(item.refundAmount)}</strong>
          </article>
        ))}
      </div>
      {data.quoteSnapshot && (
        <div className="notice">
          <h2>Báo giá đổi hàng</h2>
          <p>
            Giá trị hàng đổi: {formatPrice(data.quoteSnapshot.payable)} · Giá trị được bù:{" "}
            {formatPrice(data.quoteSnapshot.credit)}
          </p>
          <p>Phí xử lý/giao hàng trong báo giá: {formatPrice(data.quoteSnapshot.fee)}</p>
          <p>
            Hết hạn:{" "}
            {data.quoteExpiresAt ? new Date(data.quoteExpiresAt).toLocaleString("vi-VN") : "—"}
          </p>
          {data.quoteSnapshot.lines.map((line) => (
            <p key={line.variantId}>
              {line.name} · {line.quantity} × {formatPrice(line.price)}
            </p>
          ))}
          {quoteValid ? (
            <button className="button" disabled={busy} onClick={() => void accept()}>
              {busy ? "Đang xác nhận…" : "Chấp nhận báo giá"}
            </button>
          ) : (
            <p>
              Báo giá chưa thể chấp nhận hoặc đã hết hạn. Vui lòng kiểm tra trạng thái mới nhất.
            </p>
          )}
        </div>
      )}
      {data.settlement && (
        <p>
          Đơn thay thế:{" "}
          <Link href={`/account/orders/${data.settlement.replacementOrderId}`}>Xem đơn</Link> · Cần
          thanh toán thêm {formatPrice(data.settlement.additionalDue)} · Hoàn lại{" "}
          {formatPrice(data.settlement.refundDue)} · {data.settlement.status}
        </p>
      )}
      {accepted && (
        <p role="status">
          Đã ghi nhận chấp nhận báo giá.{" "}
          <Link href={`/account/orders/${accepted.replacementOrderId}`}>Xem đơn thay thế</Link>
        </p>
      )}
      {data.refunds.length > 0 && (
        <>
          <h2>Hoàn tiền</h2>
          {data.refunds.map((refund) => (
            <p key={refund.id}>
              {formatPrice(refund.amount)} · {refund.status}
            </p>
          ))}
        </>
      )}
      <h2>Lịch sử</h2>
      {!!data.attachments.length && (
        <>
          <h2>Ảnh bằng chứng</h2>
          {data.attachments.map((item) => (
            <p key={item.id}>
              <EvidenceLink id={item.id} />
            </p>
          ))}
        </>
      )}
      <ol>
        {data.history.map((item, index) => (
          <li key={`${item.createdAt}-${index}`}>
            {new Date(item.createdAt).toLocaleString("vi-VN")} · {item.status}
          </li>
        ))}
      </ol>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
