import { getServerEnv } from "@/shared/config/env";
import { NextRequest } from "next/server";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const slug = (await params).slug;
  const env = getServerEnv();
  const existing = request.cookies.get("glowup_visitor")?.value;
  const validVisitor = existing && /^[0-9a-f-]{36}$/i.test(existing);
  const visitor = validVisitor ? existing : crypto.randomUUID();
  try {
    const response = await fetch(
      `${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/blog/posts/${encodeURIComponent(slug)}/view`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(env.BACKEND_TIMEOUT_MS),
        headers: { "X-Glowup-Visitor": visitor },
      },
    );
    const result = new Response(null, {
      status: response.ok ? 204 : response.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (!validVisitor)
      result.headers.append(
        "Set-Cookie",
        `glowup_visitor=${visitor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${env.SITE_URL.startsWith("https:") ? "; Secure" : ""}`,
      );
    return result;
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
