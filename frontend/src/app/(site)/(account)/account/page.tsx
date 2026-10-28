import { requireUser } from "@/shared/auth/guard";
import { MergeCartNotice } from "@/features/authentication/merge-cart-notice";
import { AccountOverview } from "@/features/account/account-pages";
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <AccountOverview name={user.fullName} email={user.email} />
      <MergeCartNotice />
    </>
  );
}
