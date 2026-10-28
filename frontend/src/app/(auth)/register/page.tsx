import { AuthPage } from "@/features/authentication/auth-page";
export const metadata = { title: "Đăng ký" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage action="register" searchParams={searchParams}/>;
}
