import { z } from "zod";
import { ordersSchema, orderStatusSchema } from "@/features/account/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { failure, json } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(url.searchParams.get("page") ?? "1");
    const status = url.searchParams.get("status");
    if (status && !orderStatusSchema.safeParse(status).success)
      throw new ApiError(400, "INVALID_STATUS");
    const query = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) query.set("status", status);
    const search = z
      .string()
      .trim()
      .max(100)
      .parse(url.searchParams.get("search") ?? "");
    const year = url.searchParams.get("year");
    if (search) query.set("search", search);
    if (year) query.set("year", String(z.coerce.number().int().min(2000).max(2100).parse(year)));
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream(`/customers/me/orders?${query}`, ordersSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
