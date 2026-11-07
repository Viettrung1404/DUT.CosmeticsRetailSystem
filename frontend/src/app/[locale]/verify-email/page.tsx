import { redirect } from "next/navigation";

export default function VerifyEmailAlias({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.token) query.set("token", searchParams.token);
  if (searchParams.email) query.set("email", searchParams.email);

  const qs = query.toString();
  redirect(`/auth/verify-email${qs ? `?${qs}` : ""}`);
}
