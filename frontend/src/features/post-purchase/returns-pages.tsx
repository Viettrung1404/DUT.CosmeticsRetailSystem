"use client";
import Link from "next/link";
import { ArrowRight, ShieldCheck, ImagePlus, Package, Clock3, Check, Plus } from "lucide-react";
import { AccountHeading, StatusBadge, returnStatusText } from "@/features/account/account-ui";
import { ContentEmpty } from "@/features/catalog/content-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { productPageSchema } from "@/features/catalog/contracts";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
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
    <section className="account-screen">
      <AccountHeading
        title="Yêu cầu đổi / trả hàng"
        description="Theo dõi yêu cầu đổi trả và cập nhật báo giá xử lý của bạn."
        actions={
          <Link className="button" href="/account/returns/new">
            <Plus size={16} />
            Tạo yêu cầu mới
          </Link>
        }
      />
      <div className="account-tip">
        <ShieldCheck size={22} />
        <p>
          Yêu cầu đổi trả được tiếp nhận trong 7 ngày kể từ khi đơn hoàn tất, theo điều kiện chính
          sách.
        </p>
      </div>
      <nav className="account-tabs" role="tablist" aria-label="Trạng thái đổi trả">
        {["", ...returnStatusSchema.options].map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={status === value}
            onClick={() => router.push(`/account/returns?status=${value}`)}
          >
            {value ? returnStatusText[value] : "Tất cả"}
          </button>
        ))}
      </nav>
      {query.isPending ? (
        <p role="status">Đang tải…</p>
      ) : query.isError ? (
        <div className="account-surface" role="alert">
          Không tải được yêu cầu. <button onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : (
        <>
          <div className="order-cards">
            {query.data.items.map((item) => (
              <article className="return-card" key={item.id}>
                <header>
                  <div>
                    <h2>{item.returnCode}</h2>
                    <small>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</small>
                  </div>
                  <StatusBadge value={item.status} kind="return" />
                </header>
                <div>
                  <div>
                    <p>
                      <strong>
                        {item.returnType === "EXCHANGE" ? "Đổi sản phẩm" : "Trả hàng & hoàn tiền"}
                      </strong>
                    </p>
                    <p>Lý do: {reasonLabels[item.reason] ?? item.reason}</p>
                    {item.refundAmount !== null && (
                      <p>
                        Giá trị hoàn dự kiến: <strong>{formatPrice(item.refundAmount)}</strong>
                      </p>
                    )}
                  </div>
                  <Link href={`/account/returns/${item.id}`}>
                    Xem chi tiết <ArrowRight size={14} style={{ display: "inline" }} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!query.data.items.length && (
            <ContentEmpty title="Chưa có yêu cầu trong trạng thái này">
              Các yêu cầu đổi trả sẽ được cập nhật tại đây.
            </ContentEmpty>
          )}
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
      <section className="account-screen">
        <AccountHeading
          title="Tạo yêu cầu đổi / trả hàng"
          description="Chọn đơn hàng đã hoàn tất để bắt đầu yêu cầu."
        />
        {orders.isPending ? (
          <p role="status">Đang tải đơn hàng…</p>
        ) : orders.isError ? (
          <p role="alert">
            Không tải được danh sách đơn hàng.{" "}
            <button onClick={() => orders.refetch()}>Thử lại</button>
          </p>
        ) : orders.data.orders.length ? (
          <>
            <div className="order-cards">
              {orders.data.orders.map((item) => (
                <article className="return-card" key={item.id}>
                  <header>
                    <h2>{item.orderNumber}</h2>
                    <StatusBadge value={item.status} />
                  </header>
                  <div>
                    <p>
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")} ·{" "}
                      {formatPrice(item.totalAmount)}
                    </p>
                    <Link href={`/account/returns/new?orderId=${item.id}`}>
                      Chọn đơn hàng này →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
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
          <ContentEmpty title="Chưa có đơn hoàn thành để đổi trả">
            Bạn có thể tạo yêu cầu từ chi tiết một đơn đã hoàn tất.
          </ContentEmpty>
        )}
      </section>
    );
  if (order.isPending) return <p role="status">Đang tải đơn hàng…</p>;
  if (order.isError) return <p role="alert">Không xem được đơn hàng.</p>;
  if (order.data.status !== "COMPLETED") return <p>Đơn hàng chưa đủ điều kiện đổi trả.</p>;
  return (
    <section className="account-screen">
      <AccountHeading
        title="Tạo yêu cầu đổi / trả hàng"
        description={`Đơn hàng ${order.data.orderNumber}`}
      />
      <div className="account-tip">
        <ShieldCheck size={22} />
        <p>
          Yêu cầu chỉ được nhận trong 7 ngày từ khi đơn hoàn thành; hệ thống sẽ kiểm tra điều kiện
          khi bạn gửi.
        </p>
      </div>
      <div className="return-form">
        <fieldset>
          <legend>1. Chọn sản phẩm cần đổi hoặc hoàn tiền</legend>
          {order.data.items.map((item) => (
            <label key={item.id} className="return-quantity-line">
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {item.thumbnailUrl ? (
                  <CatalogImage
                    className="return-item-image"
                    src={item.thumbnailUrl}
                    alt={item.productName}
                  />
                ) : (
                  <Package size={28} />
                )}
                <span>
                  {item.productName}
                  <small
                    style={{ display: "block", marginTop: 6, color: "#776d6d", fontWeight: 400 }}
                  >
                    {item.variantName} · Đã mua {item.quantity}
                  </small>
                </span>
              </span>
              <input
                aria-label={`Số lượng đổi trả ${item.productName}`}
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
        <fieldset>
          <legend>2. Lý do & Hình ảnh minh chứng</legend>
          <div className="account-form-grid">
            <label>
              Loại yêu cầu
              <select
                value={type}
                onChange={(event) => setType(event.target.value as "REFUND" | "EXCHANGE")}
              >
                <option value="REFUND">Trả hàng & hoàn tiền</option>
                <option value="EXCHANGE">Đổi sản phẩm</option>
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
            <div className="return-evidence full-width">
              <ImagePlus size={30} />
              <label>
                Thêm ảnh bằng chứng
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
              <p>
                {uploading ? "Đang tải ảnh…" : `${attachmentIds.length}/5 ảnh đã tải lên`} · JPEG,
                PNG hoặc WebP, mỗi ảnh không quá 5 MB
              </p>
              {attachmentIds.map((id, index) => (
                <div key={id} className="return-attachment">
                  <span>Ảnh {index + 1}</span>
                  <EvidenceLink id={id} />
                  <button
                    type="button"
                    onClick={() => setAttachmentIds((value) => value.filter((item) => item !== id))}
                  >
                    Bỏ ảnh
                  </button>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
        {type === "EXCHANGE" && (
          <fieldset>
            <legend>3. Chọn sản phẩm đổi thay thế</legend>
            <div className="account-form-grid">
              <label className="full-width">
                Tìm sản phẩm
                <input
                  value={search}
                  placeholder="Nhập tên sản phẩm muốn đổi"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              {products.isPending && search.length >= 2 && <p role="status">Đang tìm…</p>}
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
                  value={replacementQuantity}
                  onChange={(event) =>
                    setReplacementQuantity(Math.max(1, Number(event.target.value) || 1))
                  }
                />
              </label>
            </div>
          </fieldset>
        )}
        <footer className="account-surface return-submit">
          <Link href="/account/returns">← Quay lại danh sách</Link>
          <button
            className="button"
            type="button"
            disabled={busy || uploading}
            onClick={() => void submit()}
          >
            {busy ? "Đang gửi…" : "Gửi yêu cầu đổi trả"}
          </button>
        </footer>
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
    <section className="account-screen">
      <AccountHeading
        title={`Chi tiết yêu cầu ${data.returnCode}`}
        description={`${data.returnType === "EXCHANGE" ? "Đổi sản phẩm" : "Trả hàng & hoàn tiền"} · ${new Date(data.createdAt).toLocaleDateString("vi-VN")}`}
        actions={<StatusBadge value={data.status} kind="return" />}
      />
      <section className="account-surface">
        <h2>Tiến trình xử lý yêu cầu</h2>
        <ol className="return-progress">
          {["REQUESTED", "APPROVED", "RECEIVED", "INSPECTED", "COMPLETED"].map((value) => (
            <li
              key={value}
              className={
                data.history.some((item) => item.status === value) || data.status === value
                  ? "is-complete"
                  : ""
              }
            >
              <span>
                <Check size={17} />
              </span>
              <strong>{returnStatusText[value]}</strong>
            </li>
          ))}
        </ol>
        <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
          Lý do: {reasonLabels[data.reason] ?? data.reason} ·{" "}
          <Link href={`/account/orders/${data.orderId}`}>Xem đơn hàng gốc</Link>
        </p>
      </section>
      <section className="account-surface">
        <h2>Bảng đối soát sản phẩm</h2>
        <div className="order-lines">
          {data.items.map((item) => (
            <article key={item.id}>
              <div className="order-line-image">
                <Package size={28} />
              </div>
              <div>
                <h3>
                  {originalOrder.data?.items.find((line) => line.id === item.orderItemId)
                    ?.productName ?? "Sản phẩm"}
                </h3>
                <p>Số lượng: {item.quantity}</p>
              </div>
              <strong>{formatPrice(item.refundAmount)}</strong>
            </article>
          ))}
        </div>
      </section>
      {data.quoteSnapshot && (
        <section className="return-quote">
          <h2>Báo giá đổi hàng</h2>
          <dl className="order-totals">
            <div>
              <dt>Giá trị hàng đổi</dt>
              <dd>{formatPrice(data.quoteSnapshot.payable)}</dd>
            </div>
            <div>
              <dt>Giá trị được bù</dt>
              <dd>{formatPrice(data.quoteSnapshot.credit)}</dd>
            </div>
            <div>
              <dt>Phí xử lý / giao hàng</dt>
              <dd>{formatPrice(data.quoteSnapshot.fee)}</dd>
            </div>
          </dl>
          <div className="return-quote-lines">
            {data.quoteSnapshot.lines.map((line) => (
              <p key={line.variantId}>
                {line.name} · {line.quantity} · {formatPrice(line.price)}
              </p>
            ))}
          </div>
          <p>
            <Clock3 size={15} style={{ display: "inline", marginRight: 6 }} />
            Hết hạn:{" "}
            {data.quoteExpiresAt ? new Date(data.quoteExpiresAt).toLocaleString("vi-VN") : "—"}
          </p>
          {quoteValid ? (
            <button className="button" disabled={busy} onClick={() => void accept()}>
              {busy ? "Đang xác nhận…" : "Xác nhận chấp nhận báo giá"}
            </button>
          ) : (
            <div className="account-tip">
              <ShieldCheck size={20} />
              <p>
                Báo giá chưa thể chấp nhận hoặc đã hết hạn. Vui lòng kiểm tra trạng thái mới nhất.
              </p>
            </div>
          )}
        </section>
      )}
      {data.settlement && (
        <section className="account-surface">
          <h2>Đối soát thanh toán</h2>
          <p>
            Đơn thay thế:{" "}
            <Link href={`/account/orders/${data.settlement.replacementOrderId}`}>Xem đơn</Link>
          </p>
          <dl className="order-totals">
            <div>
              <dt>Cần thanh toán thêm</dt>
              <dd>{formatPrice(data.settlement.additionalDue)}</dd>
            </div>
            <div>
              <dt>Hoàn lại</dt>
              <dd>{formatPrice(data.settlement.refundDue)}</dd>
            </div>
          </dl>
          <p className="muted">{data.settlement.status}</p>
        </section>
      )}
      {accepted && (
        <p role="status">
          Đã ghi nhận chấp nhận báo giá.{" "}
          <Link href={`/account/orders/${accepted.replacementOrderId}`}>Xem đơn thay thế</Link>
        </p>
      )}
      {data.refunds.length > 0 && (
        <section className="account-surface">
          <h2>Hoàn tiền</h2>
          {data.refunds.map((refund) => (
            <p key={refund.id}>
              {formatPrice(refund.amount)} · {refund.status}
            </p>
          ))}
        </section>
      )}
      {data.attachments.length > 0 && (
        <section className="account-surface">
          <h2>Ảnh bằng chứng đã tải lên</h2>
          <div className="return-attachment-grid">
            {data.attachments.map((item, index) => (
              <div key={item.id}>
                <ImagePlus size={28} />
                <p>Ảnh {index + 1}</p>
                <EvidenceLink id={item.id} />
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="account-surface">
        <h2>Lịch sử xử lý</h2>
        <ol className="tracking-timeline">
          {data.history.map((item, index) => (
            <li key={`${item.createdAt}-${index}`}>
              <time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time>
              <strong>{returnStatusText[item.status] ?? item.status}</strong>
              {item.note && <p className="muted">{item.note}</p>}
            </li>
          ))}
        </ol>
      </section>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
