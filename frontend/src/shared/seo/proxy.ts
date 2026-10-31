import "server-only";
import { getServerEnv } from "@/shared/config/env";
export async function proxySitemap(path: string) {
  const env = getServerEnv();
  if (env.SEO_INDEXING_ENABLED !== "true")
    return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  try {
    const response = await fetch(`${env.BACKEND_API_BASE_URL.replace(/\/$/, "")}/${path}`, {
      signal: AbortSignal.timeout(env.BACKEND_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok)
      return new Response("Sitemap unavailable", { status: response.status === 404 ? 404 : 503 });
    return new Response(await response.text(), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Sitemap unavailable", { status: 503 });
  }
}
