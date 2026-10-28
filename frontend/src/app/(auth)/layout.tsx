import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <main id="main-content" className="site-container auth-main">
        {children}
      </main>
    </div>
  );
}
