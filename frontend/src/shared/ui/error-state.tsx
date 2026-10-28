import Link from "next/link";
import { CloudLightning, House, RefreshCcw, WifiOff } from "lucide-react";
export function ErrorState({
  reset,
  embedded = false,
}: {
  reset?: () => void;
  embedded?: boolean;
}) {
  const Container = embedded ? "section" : "main";
  return (
    <Container id={embedded ? undefined : "main-content"} className="site-container state-main">
      <div className="state-icon">
        <CloudLightning size={50} />
      </div>
      <p className="state-label">KẾT NỐI ĐANG GIÁN ĐOẠN</p>
      <h1>Đang có sự cố kết nối tạm thời</h1>
      <p>
        Dịch vụ đang gặp gián đoạn hoặc kết nối mạng chưa ổn định. Vui lòng thử lại sau ít phút để
        tiếp tục hành trình làm đẹp cùng GlowUp.
      </p>
      <div className="recovery-tips">
        <h2>Gợi ý thao tác nhanh dành cho bạn:</h2>
        <p>
          <WifiOff size={18} />
          Kiểm tra lại kết nối Internet hoặc tín hiệu Wi-Fi trên thiết bị.
        </p>
        <p>
          <RefreshCcw size={18} />
          Thử tải lại trang sau ít phút. Nếu đang đặt hàng, hãy kiểm tra lịch sử đơn trước khi gửi
          lại.
        </p>
      </div>
      <div className="state-actions">
        {reset && (
          <button className="button" onClick={reset}>
            <RefreshCcw size={18} /> Thử lại kết nối
          </button>
        )}
        <Link className="button secondary" href="/">
          <House size={18} /> Về trang chủ
        </Link>
      </div>
    </Container>
  );
}
