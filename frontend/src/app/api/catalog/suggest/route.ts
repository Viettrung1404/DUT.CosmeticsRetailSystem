import { getSuggestions } from "@/features/catalog/server";
import { failure } from "@/shared/auth/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 100)
    return Response.json([], { headers: { "Cache-Control": "no-store" } });
  try {
    return Response.json(await getSuggestions(query), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
