"use client";
import { ContentLoading } from "@/shared/ui/content-loading";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  ImagePlus,
  Package,
  Clock3,
  Check,
  Plus,
  Truck,
  MapPin,
  AlertCircle,
  Video,
  ExternalLink,
  Building2,
  FileVideo,
  CheckCircle2,
} from "lucide-react";
import { AccountHeading, StatusBadge, returnStatusText } from "@/features/account/account-ui";
import { ContentEmpty } from "@/features/catalog/content-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { CatalogImage, formatPrice } from "@/features/catalog/components";
import { orderDetailSchema, ordersSchema } from "@/features/account/contracts";
import { readBff, requestBff } from "@/shared/api/browser";
import { apiErrorMessage } from "@/shared/api/errors";
import {
  imageUploadSchema,
  imageUrlSchema,
  orderEligibilitySchema,
  returnCreatedSchema,
  returnDetailSchema,
  returnsSchema,
  returnStatusSchema,
  storeLocationsSchema,
  submitReturnInputSchema,
  exchangeSchema,
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      <button type="button" className="button button-outline" disabled={busy} onClick={() => void load()}>
        {busy ? "Đang tải ảnh…" : "Xem ảnh bằng chứng"}
      </button>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: "#c85a70" }}>
          Mở ảnh xem trực tiếp (5 phút) <ExternalLink size={13} style={{ display: "inline" }} />
        </a>
      )}
      {error && <span role="alert" style={{ color: "#d9534f" }}>{error}</span>}
    </span>
  );
}

const reasonLabels: Record<string, string> = {
  CHANGE_OF_MIND: "Đổi ý / Không còn nhu cầu",
  CUSTOMER_CHANGE_MIND: "Đổi ý / Không còn nhu cầu",
  WRONG_ITEM: "Giao sai sản phẩm",
  DAMAGED_IN_TRANSIT: "Hư hỏng trong quá trình vận chuyển",
  DEFECTIVE: "Sản phẩm bị lỗi / khuyết tật NSX",
  EXPIRED: "Sản phẩm cận / hết hạn sử dụng",
  ALLERGIC: "Dị ứng / Kích ứng da",
};

const conditionLabels: Record<string, string> = {
  UNOPENED: "Nguyên seal / Chưa bóc",
  OPENED_INTACT: "Đã mở seal, còn nguyên vẹn",
  DAMAGED: "Hư hỏng / Biến dạng",
  DEFECTIVE: "Lỗi kỹ thuật / Khuyết tật NSX",
};

const dispositionLabels: Record<string, string> = {
  RESTOCK: "Nhập lại kho lưu hành",
  QUARANTINE: "Cách ly kỹ thuật kiểm tra",
  SCRAP: "Tiêu hủy an toàn",
  RETURN_TO_CUSTOMER: "Chuyển trả lại cho khách hàng",
};

const inspectionStatusLabels: Record<string, string> = {
  PASSED: "Đạt yêu cầu kiểm định",
  FAILED: "Không đạt yêu cầu",
  PENDING: "Đang chờ kiểm định",
  DISPUTED: "Đang khiếu nại kết quả",
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
        description="Theo dõi toàn bộ tiến trình xử lý, kiểm định QC và hoàn tiền."
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
          Chính sách đổi trả minh bạch: Hỗ trợ tiếp nhận tại showroom hoặc thu hồi tận nơi qua bưu tá.
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
            {value ? returnStatusText[value] ?? value : "Tất cả"}
          </button>
        ))}
      </nav>
      {query.isPending ? (
        <ContentLoading variant="list" label="Đang tải danh sách đổi trả…" heading={false} />
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
                    <small>
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                      {item.order?.orderNumber && ` · Đơn #${item.order.orderNumber}`}
                    </small>
                  </div>
                  <StatusBadge value={item.status} kind="return" />
                </header>
                <div>
                  <div>
                    <p>
                      <strong>
                        {item.returnChannel === "STORE_DROPOFF"
                          ? "Gửi tại Showroom"
                          : "Thu hồi tận nơi"}
                      </strong>
                      {item.dropoffLocation && ` · ${item.dropoffLocation.name}`}
                    </p>
                    <p>Lý do: {reasonLabels[item.reason] ?? item.reason}</p>
                    {item.refundAmount != null && item.refundAmount > 0 && (
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
              Các yêu cầu đổi trả của bạn sẽ được hiển thị và cập nhật liên tục tại đây.
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

  const eligibility = useQuery({
    queryKey: ["return-eligibility", orderId],
    enabled: validOrder,
    queryFn: ({ signal }) =>
      readBff(
        `/api/account/commerce/orders/${orderId}/return-eligibility`,
        orderEligibilitySchema,
        signal,
      ),
  });

  const showrooms = useQuery({
    queryKey: ["showrooms-list"],
    queryFn: ({ signal }) =>
      readBff("/api/account/commerce/stores", storeLocationsSchema, signal),
  });

  type ItemFormState = {
    selected: boolean;
    quantity: number;
    reasonCode: string;
    customerNote: string;
    evidenceImages: string[];
    evidenceVideoUrl: string;
  };

  const [itemsState, setItemsState] = useState<Record<string, ItemFormState>>({});
  const [returnChannel, setReturnChannel] = useState<"CARRIER_PICKUP" | "STORE_DROPOFF">("CARRIER_PICKUP");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [pickupAddress, setPickupAddress] = useState<any>(null);
  const [customerGeneralNote, setCustomerGeneralNote] = useState("");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const command = useRef<{ fingerprint: string; key: string } | null>(null);

  // Initialize items state when eligibility data loads
  useEffect(() => {
    if (!eligibility.data?.items) return;
    setItemsState((prev) => {
      const next = { ...prev };
      for (const item of eligibility.data.items) {
        if (!next[item.orderItemId]) {
          next[item.orderItemId] = {
            selected: item.isEligible,
            quantity: Math.min(1, item.availableReturnQuantity),
            reasonCode: item.allowedRules[0]?.reasonCode ?? "CHANGE_OF_MIND",
            customerNote: "",
            evidenceImages: [],
            evidenceVideoUrl: "",
          };
        }
      }
      return next;
    });
  }, [eligibility.data]);

  // Set default pickup address from order shipping address
  useEffect(() => {
    if (order.data?.shippingAddress && !pickupAddress) {
      setPickupAddress(order.data.shippingAddress);
    }
  }, [order.data, pickupAddress]);

  // Set default showroom if available
  useEffect(() => {
    if (showrooms.data?.length && !dropoffLocationId && showrooms.data[0]?.id) {
      setDropoffLocationId(showrooms.data[0].id);
    }
  }, [showrooms.data, dropoffLocationId]);

  async function uploadItemImage(orderItemId: string, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh bằng chứng tối đa 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Định dạng ảnh hỗ trợ: JPEG, PNG, WebP.");
      return;
    }
    setUploadingItemId(orderItemId);
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
      setItemsState((prev) => {
        const item = prev[orderItemId];
        if (!item) return prev;
        return {
          ...prev,
          [orderItemId]: {
            ...item,
            evidenceImages: [...item.evidenceImages, result.attachmentId],
          },
        };
      });
    } catch {
      setError("Không thể tải lên ảnh bằng chứng. Vui lòng thử lại.");
    } finally {
      setUploadingItemId(null);
    }
  }

  function handleVideoFile(orderItemId: string, file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError("Video bằng chứng không được vượt quá 50 MB.");
      return;
    }
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setError("Định dạng video hợp lệ: MP4 hoặc WebM.");
      return;
    }
    setError("");
    const videoUrl = URL.createObjectURL(file);
    setItemsState((prev) => {
      const item = prev[orderItemId];
      if (!item) return prev;
      return {
        ...prev,
        [orderItemId]: {
          ...item,
          evidenceVideoUrl: videoUrl,
        },
      };
    });
  }

  async function submit() {
    if (!validOrder || !eligibility.data || busy || uploadingItemId) return;
    setError("");

    const selectedItems = eligibility.data.items
      .filter((i) => {
        const s = itemsState[i.orderItemId];
        return s && s.selected && s.quantity > 0;
      })
      .map((i) => {
        const s = itemsState[i.orderItemId]!;
        return {
          orderItemId: i.orderItemId,
          quantity: s.quantity,
          reasonCode: s.reasonCode,
          customerNote: s.customerNote || "",
          evidenceImages: s.evidenceImages || [],
          evidenceVideoUrl: s.evidenceVideoUrl || "",
          productName: i.productName,
          itemMeta: i,
        };
      });

    if (selectedItems.length === 0) {
      setError("Vui lòng tích chọn ít nhất 1 sản phẩm bạn muốn đổi trả.");
      return;
    }

    for (const item of selectedItems) {
      const matchedRule = item.itemMeta.allowedRules.find((r) => r.reasonCode === item.reasonCode);
      if (item.evidenceImages.length === 0) {
        setError(`Sản phẩm "${item.productName}" bắt buộc cần ít nhất 1 ảnh bằng chứng.`);
        return;
      }
      if (matchedRule?.requiresEvidenceVideo && !item.evidenceVideoUrl.trim()) {
        setError(
          `Lý do "${reasonLabels[item.reasonCode] ?? item.reasonCode}" cho sản phẩm "${item.productName}" bắt buộc phải có video khui kiện hàng hoặc lỗi sản phẩm.`,
        );
        return;
      }
    }

    if (returnChannel === "STORE_DROPOFF" && !dropoffLocationId) {
      setError("Vui lòng chọn Showroom tiếp nhận để mang sản phẩm đến đổi trả.");
      return;
    }

    const payload = submitReturnInputSchema.safeParse({
      orderId,
      returnChannel,
      dropoffLocationId: returnChannel === "STORE_DROPOFF" ? dropoffLocationId : undefined,
      pickupAddress: returnChannel === "CARRIER_PICKUP" ? (pickupAddress ?? {}) : undefined,
      customerNote: customerGeneralNote.trim() || undefined,
      items: selectedItems.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reasonCode: item.reasonCode,
        customerNote: item.customerNote.trim() || undefined,
        evidenceImages: item.evidenceImages,
        evidenceVideoUrl: item.evidenceVideoUrl.trim() || undefined,
      })),
      idempotencyKey: crypto.randomUUID(),
    });

    if (!payload.success) {
      setError("Thông tin đổi trả chưa hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    const { idempotencyKey, ...bodyPayload } = payload.data;
    const fingerprint = JSON.stringify(bodyPayload);
    const key = command.current?.fingerprint === fingerprint ? command.current.key : idempotencyKey;
    command.current = { fingerprint, key: key || crypto.randomUUID() };

    setBusy(true);
    try {
      const created = await requestBff("/api/account/commerce/returns", returnCreatedSchema, {
        method: "POST",
        body: { ...bodyPayload, idempotencyKey: key },
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

  // View when orderId is not selected yet
  if (!validOrder) {
    return (
      <section className="account-screen">
        <AccountHeading
          title="Tạo yêu cầu đổi / trả hàng"
          description="Chọn đơn hàng đã giao thành công để bắt đầu kiểm tra điều kiện đổi trả."
        />
        {orders.isPending ? (
          <ContentLoading variant="list" label="Đang tải danh sách đơn hàng…" heading={false} />
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
                      Chọn đơn này để đổi trả →
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
          <ContentEmpty title="Chưa có đơn hàng hoàn tất để đổi trả">
            Chỉ những đơn hàng đã hoàn tất hoặc giao thành công mới đủ điều kiện khởi tạo đổi trả theo
            chính sách.
          </ContentEmpty>
        )}
      </section>
    );
  }

  if (order.isPending || eligibility.isPending || showrooms.isPending) {
    return <ContentLoading variant="detail" label="Đang kiểm tra chính sách đổi trả cho đơn hàng…" />;
  }

  if (order.isError || eligibility.isError) {
    return (
      <div className="account-surface" role="alert">
        <p>Không thể kiểm tra điều kiện đổi trả cho đơn hàng này.</p>
        <Link href="/account/returns">← Quay lại danh sách đổi trả</Link>
      </div>
    );
  }

  const eligData = eligibility.data;

  return (
    <section className="account-screen">
      <AccountHeading
        title="Tạo yêu cầu đổi / trả hàng"
        description={`Đơn hàng #${order.data?.orderNumber ?? orderId} · Chính sách áp dụng: ${eligData.policyVersionName || "GlowUp Standard Policy"}`}
      />

      {!eligData.isEligible && (
        <div className="account-surface" role="alert" style={{ borderLeft: "4px solid #d9534f" }}>
          <h2 style={{ color: "#d9534f", fontSize: 16 }}>Đơn hàng không đủ điều kiện tạo đổi trả</h2>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {eligData.ineligibleReasons.map((reason, idx) => (
              <li key={idx} style={{ color: "#776d6d", fontSize: 13 }}>
                {reason}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 12 }}>
            <Link href="/account/returns">← Quay lại danh sách đổi trả</Link>
          </p>
        </div>
      )}

      {eligData.isEligible && (
        <div className="return-form">
          {/* STEP 1: PRODUCTS & REASONS */}
          <fieldset>
            <legend>1. Chọn sản phẩm & cung cấp bằng chứng minh bạch</legend>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Tích chọn sản phẩm muốn đổi trả. Với các lý do hư hại khi vận chuyển hoặc lỗi sản phẩm,
              bắt buộc phải có hình ảnh và video chứng thực.
            </p>

            {eligData.items.map((item) => {
              const state = itemsState[item.orderItemId] ?? {
                selected: false,
                quantity: 1,
                reasonCode: "CHANGE_OF_MIND",
                customerNote: "",
                evidenceImages: [],
                evidenceVideoUrl: "",
              };
              const matchedRule = item.allowedRules.find((r) => r.reasonCode === state.reasonCode);
              const isUploading = uploadingItemId === item.orderItemId;

              return (
                <div
                  key={item.orderItemId}
                  className={`return-item-box ${!item.isEligible ? "is-ineligible" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <input
                      type="checkbox"
                      disabled={!item.isEligible}
                      checked={state.selected}
                      onChange={(e) =>
                        setItemsState((prev) => ({
                          ...prev,
                          [item.orderItemId]: {
                            ...state,
                            selected: e.target.checked,
                          },
                        }))
                      }
                      style={{ marginTop: 6 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <strong>{item.productName}</strong>
                          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                            {item.variantName && `${item.variantName} · `}
                            Đã mua: {item.purchasedQuantity} · Khả dụng đổi trả:{" "}
                            <strong>{item.availableReturnQuantity}</strong>
                          </p>
                        </div>
                        {!item.isEligible && (
                          <span className="order-status" style={{ background: "#f8d7da", color: "#721c24" }}>
                            {item.ineligibleReason || "Không đủ điều kiện"}
                          </span>
                        )}
                      </div>

                      {item.isEligible && state.selected && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #efe5e7" }}>
                          <div className="account-form-grid" style={{ marginBottom: 12 }}>
                            <label>
                              Số lượng muốn trả (tối đa {item.availableReturnQuantity})
                              <input
                                type="number"
                                min="1"
                                max={item.availableReturnQuantity}
                                value={state.quantity}
                                onChange={(e) =>
                                  setItemsState((prev) => ({
                                    ...prev,
                                    [item.orderItemId]: {
                                      ...state,
                                      quantity: Math.max(
                                        1,
                                        Math.min(
                                          item.availableReturnQuantity,
                                          Number(e.target.value) || 1,
                                        ),
                                      ),
                                    },
                                  }))
                                }
                              />
                            </label>
                            <label>
                              Lý do đổi trả
                              <select
                                value={state.reasonCode}
                                onChange={(e) =>
                                  setItemsState((prev) => ({
                                    ...prev,
                                    [item.orderItemId]: {
                                      ...state,
                                      reasonCode: e.target.value,
                                    },
                                  }))
                                }
                              >
                                {item.allowedRules.map((rule) => (
                                  <option key={rule.reasonCode} value={rule.reasonCode}>
                                    {reasonLabels[rule.reasonCode] ?? rule.reasonCode} ({rule.daysRemaining} ngày còn lại)
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {matchedRule && (
                            <div className="return-rule-badges">
                              {matchedRule.requiresEvidenceVideo && (
                                <span className="return-rule-badge is-video">
                                  <Video size={11} style={{ display: "inline", marginRight: 3 }} />
                                  Bắt buộc Video khui kiện / lỗi
                                </span>
                              )}
                              {matchedRule.requiresOriginalSeal && (
                                <span className="return-rule-badge is-seal">Yêu cầu nguyên tem / seal</span>
                              )}
                              {matchedRule.shippingFeeBearer === "GLOWUP" && (
                                <span className="return-rule-badge is-free">Freeship thu hồi (GlowUp hỗ trợ)</span>
                              )}
                            </div>
                          )}

                          <label style={{ marginTop: 8 }}>
                            Mô tả chi tiết tình trạng sản phẩm
                            <input
                              type="text"
                              placeholder="Mô tả cụ thể lý do hoặc lỗi gặp phải..."
                              value={state.customerNote}
                              onChange={(e) =>
                                setItemsState((prev) => ({
                                  ...prev,
                                  [item.orderItemId]: {
                                    ...state,
                                    customerNote: e.target.value,
                                  },
                                }))
                              }
                            />
                          </label>

                          {/* Evidence Uploads */}
                          <div style={{ marginTop: 14 }}>
                            <strong>Hình ảnh & Video bằng chứng</strong>
                            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                              <label
                                className="button button-outline"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                              >
                                <ImagePlus size={16} />
                                {isUploading ? "Đang tải ảnh lên…" : "Thêm ảnh bằng chứng"}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={isUploading || state.evidenceImages.length >= 5}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void uploadItemImage(item.orderItemId, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>

                              <label
                                className="button button-outline"
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                              >
                                <FileVideo size={16} />
                                Chọn video clip (≤ 50MB)
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleVideoFile(item.orderItemId, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            {/* URL video fallback */}
                            <div style={{ marginTop: 8 }}>
                              <input
                                type="text"
                                placeholder="Hoặc dán liên kết video (Google Drive, YouTube, S3...)"
                                value={state.evidenceVideoUrl}
                                onChange={(e) =>
                                  setItemsState((prev) => ({
                                    ...prev,
                                    [item.orderItemId]: {
                                      ...state,
                                      evidenceVideoUrl: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>

                            {/* Images and video preview list */}
                            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {state.evidenceImages.map((imgId, idx) => (
                                <div key={imgId} className="return-attachment">
                                  <span>Ảnh {idx + 1}</span>
                                  <EvidenceLink id={imgId} />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setItemsState((prev) => ({
                                        ...prev,
                                        [item.orderItemId]: {
                                          ...state,
                                          evidenceImages: state.evidenceImages.filter((id) => id !== imgId),
                                        },
                                      }))
                                    }
                                  >
                                    Bỏ
                                  </button>
                                </div>
                              ))}
                              {state.evidenceVideoUrl && (
                                <div className="return-attachment" style={{ background: "#e8f4fd", borderColor: "#b8daff" }}>
                                  <span style={{ color: "#004085" }}>
                                    <Video size={13} style={{ display: "inline", marginRight: 4 }} />
                                    Đã có video
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setItemsState((prev) => ({
                                        ...prev,
                                        [item.orderItemId]: {
                                          ...state,
                                          evidenceVideoUrl: "",
                                        },
                                      }))
                                    }
                                  >
                                    Bỏ
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </fieldset>

          {/* STEP 2: RETURN CHANNEL */}
          <fieldset>
            <legend>2. Chọn hình thức gửi hàng đổi trả (Omnichannel)</legend>
            <div className="return-channel-options">
              <label
                className={`return-channel-card ${returnChannel === "CARRIER_PICKUP" ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="returnChannel"
                  checked={returnChannel === "CARRIER_PICKUP"}
                  onChange={() => setReturnChannel("CARRIER_PICKUP")}
                />
                <span className="checkout-shipping-icon">
                  <Truck size={24} />
                </span>
                <div className="return-channel-info">
                  <strong>Bưu tá đến thu hồi tận nơi</strong>
                  <p>Nhân viên vận chuyển sẽ đến nhận kiện hàng đổi trả theo địa chỉ của bạn.</p>
                </div>
              </label>

              <label
                className={`return-channel-card ${returnChannel === "STORE_DROPOFF" ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="returnChannel"
                  checked={returnChannel === "STORE_DROPOFF"}
                  onChange={() => setReturnChannel("STORE_DROPOFF")}
                />
                <span className="checkout-shipping-icon">
                  <Building2 size={24} />
                </span>
                <div className="return-channel-info">
                  <strong>Gửi trực tiếp tại Showroom GlowUp</strong>
                  <p>Chủ động mang sản phẩm đến cửa hàng gần nhất để được nhân viên kiểm định ngay.</p>
                </div>
              </label>
            </div>

            {returnChannel === "CARRIER_PICKUP" && (
              <div className="account-surface" style={{ marginTop: 12 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Địa chỉ bưu tá đến lấy hàng:</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#554a4c" }}>
                  {pickupAddress?.recipientName} · {pickupAddress?.phone}
                  <br />
                  {pickupAddress?.addressLine}, {pickupAddress?.ward && `${pickupAddress.ward}, `}
                  {pickupAddress?.district && `${pickupAddress.district}, `}
                  {pickupAddress?.city}
                </p>
              </div>
            )}

            {returnChannel === "STORE_DROPOFF" && (
              <div style={{ marginTop: 12 }}>
                <label>
                  Chọn Showroom GlowUp gần bạn:
                  <select
                    value={dropoffLocationId}
                    onChange={(e) => setDropoffLocationId(e.target.value)}
                  >
                    {showrooms.data?.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name} — {store.address} ({store.city ?? "Toàn quốc"})
                      </option>
                    ))}
                  </select>
                </label>

                {(() => {
                  const selectedStore = showrooms.data?.find((s) => s.id === dropoffLocationId);
                  if (!selectedStore) return null;
                  return (
                    <div className="return-showroom-card">
                      <strong>{selectedStore.name}</strong>
                      <p style={{ margin: "2px 0 0" }}>
                        <MapPin size={13} style={{ display: "inline", marginRight: 4 }} />
                        {selectedStore.address}
                        {selectedStore.phone && ` · Hotline: ${selectedStore.phone}`}
                      </p>
                      {Boolean(selectedStore.openingHours) && (
                        <p style={{ margin: "4px 0 0", color: "#666" }}>
                          Giờ mở cửa:{" "}
                          {typeof selectedStore.openingHours === "string"
                            ? selectedStore.openingHours
                            : typeof selectedStore.openingHours === "object"
                              ? Object.values(selectedStore.openingHours as Record<string, string>).join(", ")
                              : ""}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </fieldset>

          {/* STEP 3: GENERAL NOTE & SUBMIT */}
          <fieldset>
            <legend>3. Ghi chú chung & Xác nhận</legend>
            <label>
              Ghi chú thêm cho bộ phận chăm sóc khách hàng (không bắt buộc)
              <textarea
                rows={3}
                placeholder="Ví dụ: Mong muốn đổi sang mùi hương khác, hoặc thời gian thuận tiện..."
                value={customerGeneralNote}
                onChange={(e) => setCustomerGeneralNote(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #efe5e7",
                  background: "#fefafc",
                  padding: 12,
                  borderRadius: 12,
                  fontFamily: "inherit",
                }}
              />
            </label>
          </fieldset>

          <footer className="account-surface return-submit">
            <Link href="/account/returns">← Quay lại danh sách</Link>
            <button
              className="button"
              type="button"
              disabled={busy || uploadingItemId !== null}
              onClick={() => void submit()}
            >
              {busy ? "Đang gửi yêu cầu…" : "Gửi yêu cầu đổi trả"}
              <ArrowRight size={16} />
            </button>
          </footer>

          {error && (
            <p role="alert" className="cart-warning" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function ReturnDetailPage({ id }: { id: string }) {
  const [now, setNow] = useState(() => Date.now());
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<{ version: number; value: string } | null>(null);

  const query = useQuery({
    queryKey: ["return", id],
    queryFn: ({ signal }) =>
      readBff(`/api/account/commerce/returns/${id}`, returnDetailSchema, signal),
  });

  const data = query.data;
  const quoteValid = data ? canAcceptQuote(data as any, now) : false;

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
    if (!data?.quoteSnapshot || !data.quoteExpiresAt || new Date(data.quoteExpiresAt).getTime() <= Date.now())
      return;
    if (!window.confirm("Xác nhận chấp nhận phương án và chi phí đổi hàng?")) return;
    const currentVersion = data.quoteVersion ?? 1;
    const value = key.current?.version === currentVersion ? key.current.value : crypto.randomUUID();
    key.current = { version: currentVersion, value };
    setBusy(true);
    setError("");
    try {
      await requestBff(`/api/account/commerce/returns/${id}/accept`, exchangeSchema, {
        method: "POST",
        body: { quoteVersion: currentVersion, paymentMethod: "COD", idempotencyKey: value },
      });
      key.current = null;
      void client.invalidateQueries({ queryKey: ["return", id] });
    } catch (e) {
      setError(apiErrorMessage(e));
      void query.refetch();
    } finally {
      setBusy(false);
    }
  }

  if (query.isPending) return <ContentLoading variant="detail" label="Đang tải thông tin hồ sơ đổi trả…" />;
  if (query.isError || !data)
    return (
      <div className="account-surface" role="alert">
        <p>Không xem được hồ sơ đổi trả này.</p>
        <button className="button button-outline" onClick={() => query.refetch()}>
          Thử lại
        </button>
      </div>
    );

  const isStoreDropoff = data.returnChannel === "STORE_DROPOFF" || !!data.dropoffLocation;

  return (
    <section className="account-screen">
      <AccountHeading
        title={`Hồ sơ đổi trả #${data.returnCode}`}
        description={`${data.returnType === "EXCHANGE" ? "Đổi sản phẩm" : "Trả hàng & hoàn tiền"} · Tạo ngày ${new Date(data.createdAt).toLocaleDateString("vi-VN")}`}
        actions={<StatusBadge value={data.status} kind="return" />}
      />

      {/* REJECTION ALERT IF REJECTED */}
      {data.status === "REJECTED" && (
        <div className="tracking-failure-alert" role="alert" style={{ background: "#f8d7da", borderColor: "#f5c6cb", color: "#721c24" }}>
          <AlertCircle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Yêu cầu đổi trả đã bị từ chối</strong>
            <p style={{ margin: "4px 0 0" }}>
              Hồ sơ không đáp ứng điều kiện bảo hành hoặc quy định đổi trả. Vui lòng xem ghi chú trong phần Lịch sử xử lý bên dưới hoặc liên hệ tổng đài để được hỗ trợ.
            </p>
          </div>
        </div>
      )}

      {/* CHANNEL & LOGISTICS DETAILS */}
      <section className="account-surface">
        <h2>Hình thức tiếp nhận hàng đổi trả</h2>
        {isStoreDropoff ? (
          <div className="return-showroom-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Building2 size={18} />
              <strong>Gửi tại Showroom: {data.dropoffLocation?.name ?? "Cửa hàng GlowUp"}</strong>
            </div>
            <p style={{ margin: "2px 0 0" }}>
              Địa chỉ: {data.dropoffLocation?.address}
              {data.dropoffLocation?.phone && ` · SĐT: ${data.dropoffLocation.phone}`}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#555" }}>
              💡 Quý khách vui lòng mang sản phẩm cùng phụ kiện nguyên vẹn đến địa chỉ trên trong giờ mở cửa để nhân viên tiến hành đối soát và hoàn tất hồ sơ.
            </p>
          </div>
        ) : (
          <div className="return-showroom-card" style={{ background: "#fafafa", borderColor: "#eee", color: "#333" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Truck size={18} color="#c85a70" />
              <strong>Thu hồi tận nơi qua bưu tá</strong>
            </div>
            {data.pickupAddress && (
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#554a4c" }}>
                Địa chỉ lấy hàng: {(data.pickupAddress as any).recipientName} · {(data.pickupAddress as any).phone}
                <br />
                {(data.pickupAddress as any).addressLine}, {(data.pickupAddress as any).ward && `${(data.pickupAddress as any).ward}, `}
                {(data.pickupAddress as any).district && `${(data.pickupAddress as any).district}, `}
                {(data.pickupAddress as any).city}
              </p>
            )}
          </div>
        )}
      </section>

      {/* PRODUCTS & QC INSPECTION RESULTS */}
      <section className="account-surface">
        <h2>Sản phẩm & Kết quả kiểm định chất lượng (QC)</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {data.items.map((item, index) => {
            const hasQc = !!item.inspectionStatus;
            const isPassed = item.inspectionStatus === "PASSED";
            const isFailed = item.inspectionStatus === "FAILED";

            return (
              <article key={item.id || index} className="return-item-box" style={{ background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>
                      {item.variant?.product?.name ?? "Sản phẩm đổi trả"}
                    </h3>
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                      {item.variant?.option1Value && `${item.variant.option1Value} · `}
                      SKU: {item.variant?.sku ?? "N/A"} · Số lượng: <strong>{item.quantity}</strong>
                    </p>
                    <p style={{ fontSize: 13, margin: "4px 0 0", color: "#554a4c" }}>
                      Lý do: <strong>{reasonLabels[item.reasonCode ?? ""] ?? item.reasonCode ?? data.reason}</strong>
                    </p>
                  </div>
                  {item.refundAmount != null && item.refundAmount > 0 && (
                    <strong style={{ fontSize: 15, color: "#c85a70" }}>
                      {formatPrice(item.refundAmount)}
                    </strong>
                  )}
                </div>

                {/* Evidence links */}
                {item.evidenceImages && item.evidenceImages.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="muted" style={{ fontSize: 12 }}>Bằng chứng đính kèm:</span>
                    {item.evidenceImages.map((imgId, imgIdx) => (
                      <EvidenceLink key={imgId} id={imgId} />
                    ))}
                    {item.evidenceVideoUrl && (
                      <a
                        href={item.evidenceVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-outline"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                      >
                        <Video size={13} style={{ display: "inline", marginRight: 4 }} />
                        Mở video bằng chứng
                      </a>
                    )}
                  </div>
                )}

                {/* QC Inspection Outcome Box */}
                <div className="return-qc-summary">
                  <div>
                    <dt>Kết quả kiểm định (QC)</dt>
                    <dd>
                      <span
                        className={`return-qc-badge ${isPassed ? "is-passed" : isFailed ? "is-failed" : "is-pending"}`}
                      >
                        {inspectionStatusLabels[item.inspectionStatus ?? ""] ?? item.inspectionStatus ?? "Đang kiểm định"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Tình trạng sản phẩm</dt>
                    <dd>
                      {conditionLabels[item.inspectionCondition ?? ""] ?? item.condition ?? "Đang đánh giá"}
                    </dd>
                  </div>
                  <div>
                    <dt>Phương án xử lý</dt>
                    <dd>
                      {dispositionLabels[item.disposition ?? ""] ?? item.disposition ?? "Chờ chỉ định"}
                    </dd>
                  </div>
                  {item.inspectionNote && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <dt>Ghi chú của kiểm định viên:</dt>
                      <dd style={{ fontWeight: 400, color: "#555" }}>{item.inspectionNote}</dd>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* REFUND AMOUNT / SETTLEMENT */}
      {data.refundAmount != null && data.refundAmount > 0 && (
        <section className="account-surface">
          <h2>Thông tin hoàn tiền</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 14 }}>Tổng tiền hoàn trả:</p>
              <small className="muted">Số tiền hoàn về tài khoản hoặc phương thức ban đầu</small>
            </div>
            <strong style={{ fontSize: 20, color: "#c85a70" }}>{formatPrice(data.refundAmount)}</strong>
          </div>
          {data.refunds.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px dashed #efe5e7", paddingTop: 10 }}>
              {data.refunds.map((ref) => (
                <p key={ref.id} style={{ fontSize: 13, margin: "4px 0" }}>
                  Giao dịch hoàn tiền: <strong>{formatPrice(ref.amount)}</strong> · Trạng thái:{" "}
                  <span className="order-status">{ref.status}</span>
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EXCHANGE SETTLEMENT IF APPLICABLE */}
      {data.settlement && (
        <section className="account-surface">
          <h2>Đối soát đơn hàng thay thế</h2>
          {data.settlement.replacementOrderId && (
            <p>
              Đơn hàng thay thế:{" "}
              <Link href={`/account/orders/${data.settlement.replacementOrderId}`}>
                Xem đơn thay thế #{data.settlement.replacementOrderId}
              </Link>
            </p>
          )}
          <dl className="order-totals">
            {data.settlement.additionalDue != null && (
              <div>
                <dt>Cần thanh toán thêm</dt>
                <dd>{formatPrice(data.settlement.additionalDue)}</dd>
              </div>
            )}
            {data.settlement.refundDue != null && (
              <div>
                <dt>Tiền hoàn trả lại</dt>
                <dd>{formatPrice(data.settlement.refundDue)}</dd>
              </div>
            )}
          </dl>
          <p className="muted">Trạng thái đối soát: {data.settlement.status}</p>
        </section>
      )}

      {/* STATUS HISTORY TIMELINE */}
      <section className="account-surface">
        <h2>Nhật ký tiến trình đổi trả</h2>
        {data.history && data.history.length > 0 ? (
          <ol className="tracking-timeline">
            {data.history.map((item, index) => (
              <li key={`${item.createdAt}-${index}`}>
                <time>{new Date(item.createdAt).toLocaleString("vi-VN")}</time>
                <strong>{returnStatusText[item.status] ?? item.status}</strong>
                {item.note && <p className="muted" style={{ margin: "2px 0 0" }}>{item.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>Đang cập nhật nhật ký xử lý.</p>
        )}
      </section>

      {error && <p role="alert" className="cart-warning">{error}</p>}
    </section>
  );
}
