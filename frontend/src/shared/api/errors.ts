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
  if (error.status === 401) return "Vui lòng đăng nhập để tiếp tục.";
  if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (error.status === 404) return "Không tìm thấy nội dung yêu cầu.";
  if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
  if (error.code === "INVALID_RESPONSE") return "Chưa thể tải dữ liệu. Vui lòng thử lại sau.";
  return "Chưa thể kết nối dịch vụ. Vui lòng thử lại sau.";
}
