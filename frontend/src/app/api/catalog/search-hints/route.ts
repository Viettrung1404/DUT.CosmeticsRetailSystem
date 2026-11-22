import { getSearchHints } from "@/features/catalog/server";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 100)
    return Response.json(
      { keywords: [], brands: [], products: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    return Response.json(await getSearchHints(query), {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    return Response.json(
      { code: error instanceof ApiError ? error.code : "SERVICE_UNAVAILABLE" },
      {
        status: error instanceof ApiError ? error.status : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
