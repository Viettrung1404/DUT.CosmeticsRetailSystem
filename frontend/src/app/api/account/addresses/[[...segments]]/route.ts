import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { addressInput, addressSchema } from "@/features/addresses/contracts";
import { getAddresses } from "@/features/addresses/server";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json, mutationBody } from "@/shared/auth/http";
type Context = { params: Promise<{ segments?: string[] }> };
export const runtime = "nodejs";
export async function GET(_request: Request, context: Context) {
  try { if ((await context.params).segments?.length) throw new ApiError(404, "NOT_FOUND"); return json(await getAddresses()); }
  catch (error) { return failure(error); }
}
async function mutate(request: Request, context: Context) {
  try {
    const input = await mutationBody(request); const parts = (await context.params).segments ?? [];
    const method = request.method;
    if (parts.length > 2 || (parts[0] && !z.uuidv4().safeParse(parts[0]).success)) throw new ApiError(404, "NOT_FOUND");
    const create = method === "POST" && parts.length === 0;
    const update = method === "PUT" && parts.length === 1;
    const remove = method === "DELETE" && parts.length === 1;
    const setDefault = method === "PATCH" && parts.length === 2 && parts[1] === "default";
    if (!create && !update && !remove && !setDefault) throw new ApiError(405, "METHOD_NOT_ALLOWED");
    const parsed = (create || update ? addressInput : z.object({}).strict()).safeParse(input);
    if (!parsed.success) throw new ApiError(400, "INVALID_INPUT", parsed.error.flatten());
    const schema: z.ZodType = create || update ? addressSchema : z.object({ success: z.literal(true), message: z.string() });
    const result = await authRuntime().broker.write(await sessionId(), (token) => upstream(`/customers/me/addresses${parts.length ? `/${parts.join("/")}` : ""}`, schema, parsed.data, token, method), (token) => upstream("/auth/me", userSchema, undefined, token));
    return json(result, create ? 201 : 200);
  } catch (error) { return failure(error); }
}
export const POST = mutate;
export const PUT = mutate;
export const DELETE = mutate;
export const PATCH = mutate;
