"use client";
import { ErrorState } from "@/shared/ui/error-state";
import { SiteHeader, SiteFooter } from "@/widgets/site-shell";
export default function RootError({ reset }: { reset: () => void }) {
  return (
    <>
      <SiteHeader />
      <ErrorState reset={reset} />
      <SiteFooter />
    </>
  );
}
