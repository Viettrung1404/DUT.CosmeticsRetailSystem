import type { Metadata } from "next";
import { AccountBreadcrumb, AccountSidebar } from "@/widgets/account-sidebar";
import { requireUser } from "@/shared/auth/guard";
import { PAGE_TITLE_TEMPLATE } from "@/shared/config/metadata";
export const metadata: Metadata = {
  title: { default: "Tài khoản của tôi", template: PAGE_TITLE_TEMPLATE },
  robots: { index: false, follow: false },
};
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
