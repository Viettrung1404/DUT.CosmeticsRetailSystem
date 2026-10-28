"use client";
import type { QueryClient } from "@tanstack/react-query";
export async function sessionChanged(query: QueryClient, destination: string) {
  await query.cancelQueries();
  query.clear();
  try {
    window.localStorage.setItem("glowup-auth-change", crypto.randomUUID());
  } catch {
    /* Storage can be disabled by browser privacy settings. */
  }
  // A fresh document discards the previous user's RSC/router cache as well as Query data.
  window.location.assign(destination);
}
