import { cookies } from "next/headers";
import { getServerEnv } from "@/shared/config/env";
import { authRuntime, cookieName } from "@/shared/auth/server";
import { validId } from "@/shared/auth/store";
import type { Session } from "@/shared/auth/broker";
import { failure, json, mutationBody } from "@/shared/auth/http";

export const runtime = "nodejs";

/**
 * Same-origin BFF proxy for browser recommendation tracking (`keepalive: true` safe).
 * Forwards to Cloudflare Worker Ingress (if configured) or NestJS `/recommendations/events/batch`.
 */
export async function POST(request: Request) {
  try {
    const body = await mutationBody(request);
    const jar = await cookies();
    const sid = jar.get(cookieName())?.value;

    let accessToken: string | undefined;
    if (validId(sid)) {
      try {
        const session = await authRuntime().store.get<Session>(sid);
        if (session && session.expiresAt > Date.now()) {
          accessToken = session.accessToken;
        }
      } catch {
        // Fallback to anonymous tracking when session lookup fails
      }
    }

    const targetUrl =
      process.env.CLOUDFLARE_TRACKING_INGRESS_URL ||
      `${getServerEnv().BACKEND_API_BASE_URL}/recommendations/events/batch`;

    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(request.headers.get("user-agent")
            ? { "User-Agent": request.headers.get("user-agent")! }
            : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(getServerEnv().BACKEND_TIMEOUT_MS),
      });

      if (upstreamResponse.status === 400 || upstreamResponse.status === 413) {
        const errBody = await upstreamResponse.json().catch(() => ({ accepted: false }));
        return Response.json(errBody, { status: upstreamResponse.status });
      }
    } catch {
      // Graceful degradation: tracking failures never block browser UX
    }

    return json({ accepted: true }, 202);
  } catch (error) {
    return failure(error);
  }
}
