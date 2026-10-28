import type { Metadata } from "next";
import { AccountBreadcrumb, AccountSidebar } from "@/widgets/account-sidebar";
import { requireUser } from "@/shared/auth/guard";
export const metadata: Metadata = { title: "Tài khoản", robots: { index: false, follow: false } };
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <main id="main-content" className="site-container account-main">
      <AccountBreadcrumb />
      <div className="account-grid">
        <AccountSidebar user={user} />
        <div className="account-content">{children}</div>
      </div>
    </main>
  );
}
