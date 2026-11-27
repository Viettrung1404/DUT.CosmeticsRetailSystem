import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerEnv } from "@/shared/config/env";
import { authRuntime, cookieName } from "@/shared/auth/server";
import { validId } from "@/shared/auth/store";
import type { Session } from "@/shared/auth/broker";
import { guestCartSession } from "@/shared/auth/cart";
import { json } from "@/shared/auth/http";

export const runtime = "nodejs";

export async function forwardRecommendationGet(
  backendPathWithQuery: string,
  includeSessionToken = false,
  homeFeed = false,
) {
  let accessToken: string | undefined;

  if (includeSessionToken) {
    try {
      const jar = await cookies();
      const sid = jar.get(cookieName())?.value;
      if (validId(sid)) {
        const session = await authRuntime().store.get<Session>(sid);
        if (session && session.expiresAt > Date.now()) {
          accessToken = session.accessToken;
        }
      }
    } catch {
      // Fallback gracefully as guest if session lookup fails
    }
  }

  const baseUrl = getServerEnv().BACKEND_API_BASE_URL.replace(/\/$/, "");
  const guestSession = homeFeed && !accessToken ? await guestCartSession().catch(() => null) : null;
  try {
    const res = await fetch(`${baseUrl}${backendPathWithQuery}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(guestSession ? { "x-session-id": guestSession } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(getServerEnv().BACKEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (homeFeed) return json({ items: [] }, 502);
      return NextResponse.json(
        { placement: "HOME", attributionSource: "rec_home", items: [] },
        { status: 200 },
      );
    }

    const body = await res.json();
    const payload = body?.data ?? body;
    return homeFeed ? json(payload) : NextResponse.json(payload, { status: 200 });
  } catch {
    if (homeFeed) return json({ items: [] }, 502);
    return NextResponse.json(
      { placement: "HOME", attributionSource: "rec_home", items: [] },
      { status: 200 },
    );
  }
}
