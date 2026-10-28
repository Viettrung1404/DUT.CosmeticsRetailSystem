"use client";
import { ErrorState } from "@/shared/ui/error-state";
export default function AuthError({ reset }: { reset: () => void }) {
  return <ErrorState reset={reset} embedded />;
}
