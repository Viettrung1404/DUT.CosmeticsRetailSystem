import { z } from "zod";
import { guestCartSession } from "@/shared/auth/cart";
import { failure, json, mutationBody } from "@/shared/auth/http";
import { ApiError } from "@/shared/api/errors";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!z.object({}).strict().safeParse(await mutationBody(request)).success) throw new ApiError(400, "INVALID_INPUT");
    await guestCartSession(true);
    return json({ success: true }); // Backend cart identity never goes to browser JavaScript.
  } catch (error) { return failure(error); }
}
