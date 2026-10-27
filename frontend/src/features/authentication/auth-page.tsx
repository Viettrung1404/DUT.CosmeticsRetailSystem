import { AuthForm } from "./auth-form";
import type { AuthAction } from "@/shared/auth/contracts";
export async function AuthPage({ action, searchParams }: { action: AuthAction; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <AuthForm action={action} token={typeof params.token === "string" ? params.token : undefined} returnTo={typeof params.returnTo === "string" ? params.returnTo : undefined}/>;
}
