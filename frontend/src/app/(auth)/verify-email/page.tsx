import { AuthPage } from "@/features/authentication/auth-page";
export const metadata = { title: "Xác thực email" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AuthPage action="verify-email" searchParams={searchParams}/>;
}
