import Link from "next/link";
import { CloudOff } from "lucide-react";
export function ErrorState({ reset }: { reset?: () => void }) {
  return <main id="main-content" className="site-container state-main"><div className="state-icon"><CloudOff size={48}/></div><p className="eyebrow">GLOWUP</p><h1>Chưa thể kết nối</h1><p>Dịch vụ đang gặp gián đoạn. Vui lòng thử lại sau ít phút.</p><div className="state-actions">{reset && <button className="button" onClick={reset}>Thử lại</button>}<Link className="button secondary" href="/">Về trang chủ</Link></div></main>;
}
