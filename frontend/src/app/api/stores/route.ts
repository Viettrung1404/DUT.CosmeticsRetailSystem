import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/shared/config/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const env = getServerEnv();
    const baseApi = env.BACKEND_API_BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${baseApi}/stores`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend responded with status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch stores" },
      { status: 500 }
    );
  }
}
