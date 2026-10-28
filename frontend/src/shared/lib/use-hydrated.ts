"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
// Keep sensitive submit buttons disabled until React has attached event handlers.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
