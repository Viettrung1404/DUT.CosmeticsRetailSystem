import "server-only";
import { authRuntime, sessionId, upstream } from "@/shared/auth/server";
import { addressesSchema } from "./contracts";
export async function getAddresses() {
  return authRuntime().broker.read(await sessionId(), (token) =>
    upstream("/customers/me/addresses", addressesSchema, undefined, token),
  );
}
