import { z } from "zod";
import { getAvailability } from "@/features/catalog/server";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const variantId = url.searchParams.get("variantId");
  if (!z.uuid().safeParse(productId).success || !z.uuid().safeParse(variantId).success)
    return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  try {
    return Response.json(await getAvailability(productId!, variantId!), {
      headers: { "Cache-Control": "no-store" },
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
