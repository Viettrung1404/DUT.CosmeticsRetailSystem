"use client";
import { useEffect } from "react";
export function BlogView({ slug }: { slug: string }) {
  useEffect(() => {
    if (document.visibilityState === "visible")
      void fetch(`/api/blog/view/${encodeURIComponent(slug)}`, {
        method: "POST",
        credentials: "same-origin",
      }).catch(() => {});
  }, [slug]);
  return null;
}
