import { getSuggestions } from "@/features/catalog/server";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 100)
    return Response.json([], { headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json(await getSuggestions(query), { headers: { "Cache-Control": "no-store" } });
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
