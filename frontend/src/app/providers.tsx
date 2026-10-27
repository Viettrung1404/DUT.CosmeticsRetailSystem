"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Per mounted tree, never a module-global cache shared by SSR requests.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  }));
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== "glowup-auth-change") return;
      void queryClient.cancelQueries().then(() => { queryClient.clear(); window.location.reload(); });
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [queryClient]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
