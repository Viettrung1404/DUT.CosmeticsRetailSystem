import { AuthForm } from "./auth-form";
import type { AuthAction } from "@/shared/auth/contracts";
import { AuthFrame } from "./auth-frame";
import { oauthProviders } from "@/shared/auth/provider-config";
export async function AuthPage({
  action,
  searchParams,
}: {
  action: AuthAction;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const variant =
    action === "login" || action === "register"
      ? action
      : action === "verify-email"
        ? "verification"
        : "recovery";
  return (
    <AuthFrame variant={variant}>
      <AuthForm
        action={action}
        providers={action === "login" || action === "register" ? oauthProviders() : undefined}
        token={typeof params.token === "string" ? params.token : undefined}
        returnTo={typeof params.returnTo === "string" ? params.returnTo : undefined}
      />
    </AuthFrame>
  );
}
