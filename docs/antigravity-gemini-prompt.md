# Prompt cho agent Gemini (Antigravity, model Gemini Flash) — rà soát GlowUp

Bạn là agent trong Antigravity IDE, đang mở project GlowUp tại `D:\VS_Code\DUT\PBL6` (backend NestJS port 3000, frontend Next.js port 3001, mobile Expo port 8081). Cả ba server đang chạy. Backend health: `http://localhost:3000/api/v1/health/ready` → 200. Ảnh chụp màn hình web + mobile Expo web nằm ở `C:\Temp\shots\` (8 file PNG).

## Việc cần làm

1. Đọc file `docs/shopee-hasaki-review-2026-11-13.md` — đó là bản rà soát của Muse (một agent khác) về cùng project, đối chiếu GlowUp với Shopee/Hasaki.
2. Tự kiểm tra độc lập code + chạy thử các luồng chính trên web (`http://localhost:3001`) và mobile web (`http://localhost:8081`): trang chủ, tìm kiếm, PDP, giỏ, checkout, flash sale, tài khoản/đơn/đổi trả.
3. Trả lời các câu hỏi: (a) Điểm nào trong bản của Muse là đúng, điểm nào sai hoặc đã lỗi thời so với code hiện tại? (b) Muse bỏ sót điểm chưa hợp lý nào quan trọng? (c) Nếu chỉ được sửa 5 việc trong 1 tuần trước buổi demo/bảo vệ, bạn chọn 5 việc nào và vì sao?
4. Chỉ ghi kết quả vào file mới `docs/antigravity-gemini-findings.md` — KHÔNG sửa code, KHÔNG chạy lệnh thay đổi dữ liệu, KHÔNG xoá file. Trong file đó ghi rõ: đồng ý/không đồng ý với từng điểm P0 của Muse + bằng chứng file/dòng, các phát hiện mới của bạn + bằng chứng, và top 5 ưu tiên của bạn.
5. Khi xong, trả lời ngắn trong chat Antigravity: "Đã ghi xong vào docs/antigravity-gemini-findings.md" + 3 phát hiện quan trọng nhất của bạn.
