export function safeVnpayUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    if (!/^(?:[a-z0-9-]+\.)*(?:vnpay\.vn|vnpayment\.vn)$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
