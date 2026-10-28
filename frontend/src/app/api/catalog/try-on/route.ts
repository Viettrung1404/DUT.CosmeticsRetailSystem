import { z } from "zod";
import { getTryOnColors } from "@/features/catalog/server";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!z.uuid().safeParse(productId).success)
    return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  try {
    return Response.json(await getTryOnColors(productId!), {
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
