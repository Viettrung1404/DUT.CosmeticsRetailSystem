import { failure, json, mutationBody } from "@/shared/auth/http";
import { oauthAction } from "@/shared/auth/oauth";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    return json(await oauthAction((await context.params).action, await mutationBody(request)));
  } catch (error) {
    return failure(error);
  }
}
