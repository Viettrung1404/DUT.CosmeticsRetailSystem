import { profileInputSchema, profileSchema } from "@/features/account/contracts";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { userSchema } from "@/shared/auth/contracts";
import { failure, json, mutationBody } from "@/shared/auth/http";

export const runtime = "nodejs";
export async function GET() {
  try {
    return json(
      await authRuntime().broker.read(await sessionId(), (token) =>
        upstream("/customers/me", profileSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const input = profileInputSchema.parse(await mutationBody(request));
    return json(
      await authRuntime().broker.write(
        await sessionId(),
        (token) => upstream("/customers/me", profileSchema, input, token, "PUT"),
        (token) => upstream("/auth/me", userSchema, undefined, token),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
