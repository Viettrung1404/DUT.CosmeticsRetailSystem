import { ApiError } from "@/shared/api/errors";
import { fetchWithTimeout } from "@/shared/api/transport";
import { readApiResponse } from "@/shared/api/response";
import { getServerEnv } from "@/shared/config/env";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json } from "@/shared/auth/http";
import { imageUploadSchema } from "@/features/post-purchase/contracts";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const env = getServerEnv();
    if (
      request.headers.get("origin") !== new URL(env.SITE_URL).origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new ApiError(403, "INVALID_ORIGIN");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
      throw new ApiError(415, "MULTIPART_REQUIRED");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "IMAGE_REQUIRED");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024 + 65536) {
        await reader.cancel();
        throw new ApiError(413, "IMAGE_TOO_LARGE");
      }
      chunks.push(value);
    }
    const parsed = await new Request("http://localhost/upload", {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type")! },
      body: Buffer.concat(chunks),
    }).formData();
    const file = parsed.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new ApiError(400, "INVALID_IMAGE");
    const form = new FormData();
    form.set("file", file);
    const result = await authRuntime().broker.write(
      await sessionId(),
      async (token) => {
        const response = await fetchWithTimeout(
          `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/uploads/return-images`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "X-Request-Id": crypto.randomUUID(),
            },
            body: form,
          },
          env.BACKEND_TIMEOUT_MS,
        );
        return (await readApiResponse(response, imageUploadSchema)).data;
      },
      (token) => upstream("/auth/me", userSchema, undefined, token),
    );
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
