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
  if (request.headers.get("origin") !== new URL(getServerEnv().SITE_URL).origin)
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
