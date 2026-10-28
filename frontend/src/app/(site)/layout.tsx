import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
