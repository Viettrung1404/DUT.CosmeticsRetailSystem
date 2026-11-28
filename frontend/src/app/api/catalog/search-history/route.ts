import { getServerEnv } from "@/shared/config/env";
import { fetchWithTimeout } from "@/shared/api/transport";
import { normalizeApiError, ApiError } from "@/shared/api/errors";
import { failure, privateHeaders } from "@/shared/auth/http";
import { authRuntime, sessionId } from "@/shared/auth/server";

export const runtime = "nodejs";

async function relay(method: string, query?: string | null, body?: unknown, token?: string) {
  const env = getServerEnv();
  const params = query ? `?query=${encodeURIComponent(query)}` : "";
  const response = await fetchWithTimeout(
    `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/customer/products/search-history${params}`,
    {
      method,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env.BACKEND_TIMEOUT_MS,
  );
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw normalizeApiError(response, data);
  if (data === undefined) throw new ApiError(502, "INVALID_RESPONSE");
  return data;
}

async function relayWithOptionalSession(method: string, query?: string | null, body?: unknown) {
  let id: string | undefined;
  try {
    id = await sessionId();
  } catch {
    id = undefined;
  }
  if (id) {
    try {
      const data = await authRuntime().broker.read(id, (token) =>
        relay(method, query, body, token),
      );
      return Response.json(data, { headers: privateHeaders });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
  }
  const data = await relay(method, query, body);
  return Response.json(data, { headers: privateHeaders });
}

export async function GET() {
  try {
    return await relayWithOptionalSession("GET");
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    return await relayWithOptionalSession("POST", undefined, await request.json());
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    return await relayWithOptionalSession("DELETE", new URL(request.url).searchParams.get("query"));
  } catch (error) {
    return failure(error);
  }
}
