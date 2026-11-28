import { z } from "zod";

const errorBody = z.object({
  code: z.string().optional(),
  message: z.unknown().optional(),
  details: z.unknown().optional(),
});

export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
    readonly retryAfter: string | null = null,
    readonly requestId: string | null = null,
  ) {
    // Upstream message/body must never accidentally reach logs or the UI.
    super(code);
  }
}

export function normalizeApiError(response: Response, body: unknown): ApiError {
  const parsed = errorBody.safeParse(body);
  return new ApiError(
    response.status,
    parsed.success && parsed.data.code ? parsed.data.code : `HTTP_${response.status}`,
    parsed.success ? parsed.data.details : undefined,
    response.headers.get("retry-after"),
    response.headers.get("x-request-id"),
  );
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  if (error.code === "ORDER_PRICE_CHANGED")
    return "Giá và ưu đãi đã thay đổi. Vui lòng kiểm tra báo giá mới trước khi đặt hàng lại.";
  if (error.code.startsWith("COUPON_"))
    return "Voucher không còn áp dụng được cho đơn hàng hiện tại. Vui lòng chọn lại ưu đãi.";
  if (error.code === "INSUFFICIENT_POINTS")
    return "Số xu có thể dùng đã thay đổi. Vui lòng kiểm tra lại ưu đãi.";
  if (error.code === "STOCK_LIMIT_EXCEEDED")
    return "Tổng số lượng, bao gồm sản phẩm đã có trong giỏ, vượt tồn kho hiện tại. Vui lòng giảm số lượng hoặc kiểm tra lại giỏ hàng.";
  if (["INSUFFICIENT_STOCK", "NO_STORE_WITH_STOCK", "STORE_OUT_OF_STOCK"].includes(error.code))
    return "Số lượng đã chọn vượt quá tồn kho hiện tại hoặc hàng vừa được khách khác đặt. Vui lòng giảm số lượng và thử lại.";
  if (error.code === "CART_QUANTITY_LIMIT")
    return "Mỗi phân loại được mua tối đa 99 sản phẩm. Vui lòng kiểm tra cả số lượng đã có trong giỏ.";
  if (error.code === "INVALID_QUANTITY") return "Vui lòng nhập số lượng là số nguyên từ 1 đến 99.";
  if (error.status === 401) return "Vui lòng đăng nhập để tiếp tục.";
  if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (error.status === 404) return "Không tìm thấy nội dung yêu cầu.";
  if (error.status === 400) return "Thông tin chưa hợp lệ. Vui lòng kiểm tra và thử lại.";
  if (error.status === 409)
    return "Dữ liệu đã thay đổi hoặc thao tác bị xung đột. Vui lòng tải lại và thử tiếp.";
  if (error.status === 413) return "Tệp vượt quá dung lượng cho phép.";
  if (error.status === 429)
    return "Dịch vụ đang nhận nhiều yêu cầu. Vui lòng đợi trước khi thử lại.";
  if (error.code === "INVALID_RESPONSE") return "Chưa thể tải dữ liệu. Vui lòng thử lại sau.";
  return "Chưa thể kết nối dịch vụ. Vui lòng thử lại sau.";
}
