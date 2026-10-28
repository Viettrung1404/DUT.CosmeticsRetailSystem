import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json, mutationBody } from "@/shared/auth/http";
import {
  acceptExchangeInputSchema,
  createReturnInputSchema,
  exchangeSchema,
  imageUrlSchema,
  loyaltySchema,
  notificationsSchema,
  readNotificationSchema,
  redeemInputSchema,
  redemptionSchema,
  returnCreatedSchema,
  returnDetailSchema,
  returnsSchema,
  returnStatusSchema,
  reviewInputSchema,
  reviewResultSchema,
  rewardsSchema,
  wishlistChangeSchema,
  wishlistResultSchema,
  wishlistSchema,
} from "@/features/post-purchase/contracts";

export const runtime = "nodejs";
type Context = { params: Promise<{ parts: string[] }> };
function pagination(request: Request, allowStatus = false) {
  const url = new URL(request.url);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(url.searchParams.get("page") ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "10" });
  const status = url.searchParams.get("status");
  if (status) {
    if (!allowStatus || !returnStatusSchema.safeParse(status).success)
      throw new ApiError(400, "INVALID_STATUS");
    query.set("status", status);
  }
  return query.toString();
}
export async function GET(request: Request, context: Context) {
  try {
    const parts = (await context.params).parts;
    let path: string;
    let schema: z.ZodType;
    if (parts.length === 1 && parts[0] === "wishlist") {
      path = `/wishlists?${pagination(request)}`;
      schema = wishlistSchema;
    } else if (parts.length === 1 && parts[0] === "loyalty") {
      path = `/customers/me/loyalty?${pagination(request)}`;
      schema = loyaltySchema;
    } else if (parts.length === 1 && parts[0] === "rewards") {
      path = "/customers/me/loyalty/rewards";
      schema = rewardsSchema;
    } else if (parts.length === 1 && parts[0] === "returns") {
      path = `/returns?${pagination(request, true)}`;
      schema = returnsSchema;
    } else if (
      parts.length === 2 &&
      parts[0] === "returns" &&
      z.uuid().safeParse(parts[1]).success
    ) {
      path = `/returns/${parts[1]}`;
      schema = returnDetailSchema;
    } else if (parts.length === 1 && parts[0] === "notifications") {
      path = `/notifications?${pagination(request)}`;
      schema = notificationsSchema;
    } else if (parts.length === 2 && parts[0] === "image" && z.uuid().safeParse(parts[1]).success) {
      path = `/uploads/return-images/${parts[1]}`;
      schema = imageUrlSchema;
    } else throw new ApiError(404, "NOT_FOUND");
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream(path, schema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
async function mutate(request: Request, context: Context) {
  try {
    const parts = (await context.params).parts;
    const raw = await mutationBody(request);
    let path: string;
    let body: unknown;
    let schema: z.ZodType;
    let key: string | undefined;
    if (
      request.method === "PUT" &&
      parts.length === 2 &&
      parts[0] === "wishlist" &&
      z.uuid().safeParse(parts[1]).success
    ) {
      const input = wishlistChangeSchema.parse(raw);
      if (input.productId !== parts[1]) throw new ApiError(400, "ID_MISMATCH");
      key = input.idempotencyKey;
      body = { selected: input.selected };
      path = `/wishlists/${parts[1]}`;
      schema = wishlistResultSchema;
    } else if (request.method === "POST" && parts.join("/") === "redeem") {
      const input = redeemInputSchema.parse(raw);
      key = input.idempotencyKey;
      body = { rewardCode: input.rewardCode };
      path = "/customers/me/loyalty/redeem";
      schema = redemptionSchema;
    } else if (request.method === "POST" && parts.join("/") === "returns") {
      const input = createReturnInputSchema.parse(raw);
      key = input.idempotencyKey;
      body = {
        orderId: input.orderId,
        type: input.type,
        reason: input.reason,
        items: input.items,
        attachmentIds: input.attachmentIds,
        replacements: input.replacements,
      };
      path = "/returns";
      schema = returnCreatedSchema;
    } else if (
      request.method === "POST" &&
      parts.length === 3 &&
      parts[0] === "returns" &&
      z.uuid().safeParse(parts[1]).success &&
      parts[2] === "accept"
    ) {
      const input = acceptExchangeInputSchema.parse(raw);
      key = input.idempotencyKey;
      body = { quoteVersion: input.quoteVersion, paymentMethod: input.paymentMethod };
      path = `/returns/${parts[1]}/exchange/accept`;
      schema = exchangeSchema;
    } else if (
      request.method === "PUT" &&
      parts.length === 2 &&
      parts[0] === "notifications" &&
      z.uuid().safeParse(parts[1]).success
    ) {
      z.object({}).strict().parse(raw);
      body = {};
      path = `/notifications/${parts[1]}/read`;
      schema = readNotificationSchema;
    } else if (request.method === "POST" && parts.join("/") === "reviews") {
      body = reviewInputSchema.parse(raw);
      path = "/reviews";
      schema = reviewResultSchema;
    } else throw new ApiError(404, "NOT_FOUND");
    return json(
      await authRuntime().broker.write(
        await sessionId(),
        (token) =>
          upstream(
            path,
            schema,
            body,
            token,
            request.method,
            key ? { "Idempotency-Key": key } : {},
          ),
        (token) => upstream("/auth/me", userSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export const POST = mutate;
export const PUT = mutate;
