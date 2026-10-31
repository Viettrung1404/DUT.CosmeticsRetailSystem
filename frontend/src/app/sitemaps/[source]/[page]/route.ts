import { proxySitemap } from "@/shared/seo/proxy";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ source: string; page: string }> },
) {
  const { source, page } = await params;
  if (
    !["products", "categories", "brands", "blog", "pages"].includes(source) ||
    !/^[1-9]\d{0,4}\.xml$/.test(page)
  )
    return new Response("Not found", { status: 404 });
  return proxySitemap(`sitemaps/${source}/${page}`);
}
