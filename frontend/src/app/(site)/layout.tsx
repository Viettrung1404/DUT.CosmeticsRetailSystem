import type { ReactNode } from "react";

// FE-01 adds the shared home header/footer here, once for every site route group.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
