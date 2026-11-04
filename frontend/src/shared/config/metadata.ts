export const PAGE_TITLE_TEMPLATE = "%s | GlowUp";

// Page titles omit the brand suffix; the layouts add it exactly once.
export function metadataTitle(title: string | null | undefined, fallback: string): string {
  const suffix = /(?:\s*[|–—-]\s*GlowUp)+\s*$/i;
  return title?.replace(suffix, "").trim() || fallback.replace(suffix, "").trim();
}
