import { z } from "zod";
import { getProducts } from "@/features/catalog/server";
import { filtersFromSearch } from "@/features/catalog/filters";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const categoryId = params.get("categoryId");
  if (categoryId && !z.uuid().safeParse(categoryId).success)
    return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  try {
    return Response.json(
      await getProducts({ ...filtersFromSearch(params), categoryId: categoryId || undefined }),
      { headers: { "Cache-Control": "private, max-age=0" } },
    );
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
