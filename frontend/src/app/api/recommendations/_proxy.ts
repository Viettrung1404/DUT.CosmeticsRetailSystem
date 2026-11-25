import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerEnv } from "@/shared/config/env";
import { authRuntime, cookieName } from "@/shared/auth/server";
import { validId } from "@/shared/auth/store";
import type { Session } from "@/shared/auth/broker";

export const runtime = "nodejs";

export async function forwardRecommendationGet(
  backendPathWithQuery: string,
  includeSessionToken = false,
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
  try {
    const res = await fetch(`${baseUrl}${backendPathWithQuery}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(getServerEnv().BACKEND_TIMEOUT_MS),
    });

    if (!res.ok) {
      return NextResponse.json(
        { placement: "HOME", attributionSource: "rec_home", items: [] },
        { status: 200 },
      );
    }

    const body = await res.json();
    const payload = body?.data ?? body;
    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { placement: "HOME", attributionSource: "rec_home", items: [] },
      { status: 200 },
    );
  }
}
