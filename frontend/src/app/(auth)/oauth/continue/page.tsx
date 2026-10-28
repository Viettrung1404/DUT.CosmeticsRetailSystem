import { ApiError } from "@/shared/api/errors";
import { oauthFlow } from "@/shared/auth/oauth";
import { OAuthForm } from "@/features/authentication/oauth-form";
import { AuthFrame } from "@/features/authentication/auth-frame";
export const metadata = { title: "Liên kết tài khoản" };
export default async function OAuthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let code: string | null = null;
  try { code = (await oauthFlow()).flow.code; } catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  return <AuthFrame variant="oauth"><OAuthForm code={code} returnTo={typeof params.returnTo === "string" ? params.returnTo : undefined}/></AuthFrame>;
}
