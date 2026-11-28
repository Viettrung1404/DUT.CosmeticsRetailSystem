import "server-only";
import { ZodError } from "zod";
import { ApiError } from "@/shared/api/errors";
import { getServerEnv } from "@/shared/config/env";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "Referrer-Policy": "no-referrer",
};
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}
export function failure(error: unknown) {
  const e =
    error instanceof ApiError
      ? error
      : error instanceof ZodError
        ? new ApiError(400, "INVALID_INPUT", error.flatten())
        : new ApiError(503, "SERVICE_UNAVAILABLE");
  return Response.json(
    { code: e.code, details: e.details },
    {
      status: e.status,
      headers: { ...privateHeaders, ...(e.retryAfter ? { "Retry-After": e.retryAfter } : {}) },
    },
  );
}
export async function mutationBody(request: Request) {
  // Chỉ chấp nhận mutation cùng origin. So sánh theo HOST (không so scheme):
  // site chạy sau Caddy/ngrok nên TLS kết thúc ở ngrok — request.url mà
  // Next thấy là http://<domain> trong khi trình duyệt gửi Origin là
  // https://<domain>. So nguyên origin (kèm scheme) sẽ luôn lệch nhau.
  // Host hợp lệ là SITE_URL (cấu hình lúc build, mặc định localhost:3001)
  // HOẶC host mà request này thực sự tới — nhờ vậy site chạy được trên mọi
  // domain (localhost, ngrok, domain thật) mà vẫn chặn request khác host.
  // Trước đây chỉ so với SITE_URL nên mọi mutation qua ngrok đều 403
  // INVALID_ORIGIN (thêm giỏ, checkout, wishlist... đều hỏng).
  const origin = request.headers.get("origin");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  const allowedHosts = new Set([
    new URL(getServerEnv().SITE_URL).host,
    new URL(request.url).host,
    // Truy cập trực tiếp lúc dev (http://localhost:3001). request.url mà
    // Next thấy có host là 0.0.0.0:3001 (hostname lúc chạy next start) nên
    // không thể dựa vào nó để nhận diện localhost — liệt kê rõ ở đây.
    "localhost:3001",
    "127.0.0.1:3001",
  ]);
  if (!originHost || !allowedHosts.has(originHost))
    throw new ApiError(403, "INVALID_ORIGIN");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new ApiError(403, "INVALID_ORIGIN");
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json")
    throw new ApiError(415, "JSON_REQUIRED");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_INPUT");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24576) {
      await reader.cancel();
      throw new ApiError(413, "BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_INPUT");
  }
}
