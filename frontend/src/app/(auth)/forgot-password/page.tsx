import { AuthPage } from "@/features/authentication/auth-page";
export const metadata = { title: "Quên mật khẩu" };
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuthPage action="forgot-password" searchParams={searchParams} />;
}
