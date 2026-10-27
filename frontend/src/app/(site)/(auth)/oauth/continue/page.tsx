import { ApiError } from "@/shared/api/errors";
import { oauthFlow } from "@/shared/auth/oauth";
import { OAuthForm } from "@/features/authentication/oauth-form";
export const metadata = { title: "Liên kết tài khoản" };
export default async function OAuthPage() {
  let code: string | null = null;
  try { code = (await oauthFlow()).flow.code; } catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  return <OAuthForm code={code}/>;
}
