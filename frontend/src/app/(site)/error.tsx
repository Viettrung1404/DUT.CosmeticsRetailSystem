"use client";
import { ErrorState } from "@/shared/ui/error-state";
export default function SiteError({ reset }: { reset: () => void }) {
  return <ErrorState reset={reset} />;
}
