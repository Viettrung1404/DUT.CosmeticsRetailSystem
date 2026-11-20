import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "./server";
import { ApiError } from "@/shared/api/errors";
import { ALLOWED_STAFF_ROLES } from "./roles";

export { ALLOWED_STAFF_ROLES };

export async function requireAdminUser(returnTo = "/admin") {
  try {
    const user = await currentUser();
    const role = (user?.roleName || (user as { role?: string })?.role || "").toUpperCase();
    if (role === "CUSTOMER" || (role && !(ALLOWED_STAFF_ROLES as readonly string[]).includes(role))) {
      redirect("/admin/access-denied");
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    throw error;
  }
}
