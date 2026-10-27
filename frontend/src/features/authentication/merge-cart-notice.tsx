"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authPost, authMessage } from "./client";
export function MergeCartNotice() {
  const params = useSearchParams(); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (params.get("cartMerge") !== "pending" || done) return null;
  return <section className="notice"><p>Giỏ hàng khách chưa được đồng bộ. Bạn có thể thử lại; giỏ hàng vẫn được giữ.</p><button className="button" disabled={busy} onClick={async () => { setBusy(true); try { const result = await authPost("merge-cart", {}); if (result.cart !== "pending") setDone(true); else setError("Chưa thể đồng bộ. Vui lòng thử lại sau."); } catch (e) { setError(authMessage(e)); } finally { setBusy(false); } }}>Đồng bộ giỏ hàng</button>{error && <p role="alert">{error}</p>}</section>;
}
