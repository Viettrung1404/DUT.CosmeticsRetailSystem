import { AuthPage } from "@/features/authentication/auth-page";
export const metadata = { title: "Đăng nhập" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage action="login" searchParams={searchParams}/>;
}
