"use client";
import Link from "next/link";
export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="vi"><body style={{ margin: 0, background: "#f9ecee", color: "#412e27", fontFamily: "sans-serif" }}><main style={{ maxWidth: 640, margin: "15vh auto", padding: 24 }}><p>GLOWUP</p><h1>Chưa thể tải trang</h1><p>Vui lòng thử lại sau ít phút.</p><button onClick={reset}>Thử lại</button> <Link href="/">Về trang chủ</Link></main></body></html>;
}
