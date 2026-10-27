import "server-only";
import { redirect } from "next/navigation";
import { ApiError } from "@/shared/api/errors";
import { currentUser } from "./server";
import { safeReturnTo } from "./contracts";
export async function requireUser(returnTo = "/account") {
  try { return await currentUser(); }
  catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
    throw error;
  }
}
