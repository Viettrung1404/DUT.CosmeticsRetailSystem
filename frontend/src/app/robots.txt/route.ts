import { getServerEnv } from "@/shared/config/env";
export const dynamic = "force-dynamic";
export function GET() {
  const env = getServerEnv();
  const body =
    env.SEO_INDEXING_ENABLED === "true"
      ? `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /checkout\nDisallow: /cart\nSitemap: ${env.SITE_URL.replace(/\/$/, "")}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
