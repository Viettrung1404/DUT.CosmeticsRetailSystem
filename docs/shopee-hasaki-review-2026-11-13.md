# GlowUp — Rà soát để trở thành sản phẩm như Shopee / Hasaki

Ngày rà soát: 13/11/2026. Phạm vi: `D:\VS_Code\DUT\PBL6` — backend NestJS, frontend Next.js, mobile Expo.
Người rà soát: Muse (qua SSH Tailscale tới laptop-9hsfq7c5) + 3 lượt đọc code độc lập cho be/fe/mobile.

## 0. Trạng thái lúc rà soát (đã kiểm chứng live, không đoán)

- Antigravity IDE đang chạy trên máy (nhiều tiến trình `Antigravity IDE.exe`).
- Backend: `npm run start:dev` — biên dịch 0 lỗi, Nest khởi động xong 22:06:19, `GET /api/v1/health/ready` → 200 `ready`.
  Cảnh báo trong log: `Elasticsearch is currently unreachable (http://localhost:9200/) — Database fallback active` → tìm kiếm đang chạy bằng SQL LIKE, không phải Elasticsearch.
- Frontend: `npm run dev` — Next.js 16.4.3, `http://localhost:3001` → 200 (2,15 s).
- Mobile: `expo start --web --port 8081` — Metro chạy, `http://localhost:8081` → 200. Đây là bản web của app Expo, chưa phải app native trên điện thoại/emulator.
- Dữ liệu demo: 350 sản phẩm. 3 sản phẩm đầu kiểm tra đều có `totalSold: 0`, `avgRating: 0`, `totalReviews: 0`.
- Đã chụp 8 ảnh màn hình bằng Playwright trên máy bạn (xem `C:\Temp\shots\`): home/PDP/search/flash-sale/cart desktop, home/PDP mobile web, mobile Expo web.
- Cách chạy server qua SSH: `start /min` và `Start-Process` đều chết khi SSH ngắt kết nối. Cách chạy được là `Invoke-CimMethod Win32_Process Create` với file `.bat` trong `C:\Temp\start-be.bat`, `start-fe.bat`, `start-mobile.bat`. Log: `C:\Temp\glowup-be.log`, `glowup-fe.log`, `glowup-mobile.log`.

## 1. Kết luận tổng

GlowUp **không phải là Shopee thu nhỏ, mà là một hệ single-brand retail + POS + kho/vận hành nội bộ rất mạnh**. Backend có cả POS, tồn kho FEFO, chuyển kho, kiểm kê, nhà cung cấp, nhân sự/ca/chấm công, tài chính đối soát, báo cáo RFM/dự báo — vượt Shopee ở mảng quản trị chuỗi. Nhưng ở mặt **người mua**, khoảng cách với Shopee/Hasaki nằm ở đúng những thứ làm nên sàn: niềm tin (đánh giá/đã bán/shop), khuyến mãi (voucher/xu/flash sale thật), vận chuyển/thanh toán đa lựa chọn, chat/livestream, và gợi ý cá nhân hoá.

Thứ tự ưu tiên đề xuất (xem chi tiết ở §2–§4):

**P0 — sửa ngay, vì đang sai lệch với người dùng:**
1. Thống nhất ngưỡng freeship — hiện có **3 con số khác nhau**: header web hardcode "129k → Freeship 15k · 359k → 25k · 459k → toàn quốc", promotion backend `FREE_SHIPPING` "miễn phí giao đơn từ 300K", pricing-engine `freeFrom: 500000` + phí chuẩn 30.000đ. Một trong ba chắc chắn sai với người mua.
2. Xoá dữ liệu giả trên mobile — OrderScreen/PDP/Search khởi tạo bằng đơn/sản phẩm mẫu hardcode và chỉ ghi đè khi API trả về non-empty; mất mạng là user thấy đơn giả như thật. Thay bằng empty state + báo lỗi rõ ràng.
3. Flash sale: promotion demo kéo dài tới 27/10/2027, trang web đếm ngược 347 giờ; mobile đếm ngược 04:23:08 là giả, không gắn deal backend nào. Hoặc gắn API thật, hoặc gỡ.
4. Mobile: bỏ IP LAN hardcode `192.168.110.249` trong `.env.example` và fallback của `apiClient.ts` — đổi Wi-Fi là hỏng. Dùng domain/tunnel + env theo môi trường.

**P1 — thiếu hẳn so với Shopee/Hasaki:**
5. PDP không có: số đã bán, % giảm, thông tin shop (chat shop, tỉ lệ phản hồi), Q&A, voucher shop, mua kèm/bundle. Đánh giá chỉ có text + sao, không ảnh/video, không theo variant.
6. Checkout chỉ có 1 hãng vận chuyển (không ETA, không giao nhanh/hoả tốc, không nhận tại cửa hàng dù header quảng cáo "Mua online nhận tại cửa hàng") và 2 phương thức thanh toán (COD + SePay VietQR). Backend đã có code VNPay/MoMo/ZaloPay nhưng mặc định tắt hết; VNPay ghi chú "chỉ giữ để đối soát lịch sử".
7. Không có chat (CSKH/shop), không livestream/video, không affiliate, không seller centre / đăng ký bán hàng — muốn làm marketplace đa seller thì phải thiết kế lại, vì hiện tại `Order.storeId` bắt buộc và Store là cửa hàng của chuỗi.
8. Không có "Voucher của tôi", không có xu kiểu Shopee (chỉ có điểm loyalty đổi voucher), guest không dùng được voucher/xu.
9. Trang chủ thiếu "Gợi ý hôm nay / Dành cho bạn" cá nhân hoá và "Đã xem gần đây"; bán chạy chỉ lấy 5 sản phẩm, danh mục chỉ cắt 6.

**P2 — chất lượng/trải nghiệm:**
10. Web mobile: hero carousel desktop bị cắt chữ hai bên ở viewport 390px ("RỰC RỠ / TIỆC / N ÁO" mất chữ); nút tròn "N" góc dưới-trái che nội dung mô tả trên PDP mobile.
11. SEO đang tắt mặc định (`SEO_INDEXING_ENABLED=false`, sitemap trả 404 khi tắt), không có JSON-LD Product/Breadcrumb; ảnh dùng `Image unoptimized` 600×600 cho mọi kích cỡ.
12. Mobile thiếu push notification (không có `expo-notifications`; backend notifications chỉ là email SMTP outbox), không có deep link thật (`app.json` không khai báo `scheme`), không onboarding, SePay trên mobile dở dang (chọn SEPAY xong không hiện QR/mã chuyển khoản).
13. Rate limit toàn cục 100 req/phút có thể quá chặt vào giờ flash sale; Swagger bật mặc định — nhớ tắt ở production.

## 2. Web (frontend)

Đã có, làm khá kỹ: home/PDP/search/cart/checkout/account/loyalty/returns/notifications/flash-sale/promotions/brands/blog, checkout có idempotency key + quoteVersion + xử lý 409, đổi trả có upload ảnh, loyalty có đổi điểm lấy coupon.
Thiếu/chưa hợp lý (đã đọc code + ảnh chụp):
- Tìm kiếm "son" trả 57 sản phẩm, lọc thương hiệu/danh mục/giá/rating hoạt động, nhưng mọi thẻ đều `0.0 (0)` — không đã bán, không % giảm; nút tìm bằng hình ảnh bị disable "sắp ra mắt"; không lọc theo % giảm/còn hàng/freeship/dung tích, không lịch sử tìm kiếm.
- Giỏ hàng: voucher **không áp được ở giỏ** (chỉ nhắc "nhập mã ở bước thanh toán"); gợi ý chỉ là 4 sản phẩm chung chung, không theo giỏ; không có progress bar "mua thêm X để freeship".
- Tài khoản: đủ mục đơn/đổi trả/xu/thông báo/wishlist/địa chỉ, nhưng trùng `/wishlist` và `/account/wishlist`; không có 2FA/quản lý phiên; thông báo chỉ có trong web, mobile là list tĩnh.
- Hardcode nhiều: hero/editorial dùng ảnh Stitch, banner campaign `campaign-*.webp`, giờ mở cửa fallback "08:00 - 22:00", 5 tag nhu cầu da, tab "Hướng dẫn sử dụng" là text chung cho mọi sản phẩm.
- Polling có chủ đích: trang kết quả thanh toán poll 5s tối đa ~16 phút; chi tiết đơn `PENDING_PAYMENT` refetch 5s. Header không polling (React Query staleTime 30s) — các lần gọi lặp trước đây là do load lại trang/hot-reload, không phải vòng lặp.
- Docs tự nhận: toàn bộ screen S01–S41, B01–B05 đều chỉ `UI-ready`, **không screen nào `Verified`**; chưa đo LCP/INP/CLS thật.

## 3. Mobile (Expo, SDK 58)

25 màn hình, 5 tab, khách vãng lai duyệt được ngay. Mức hoàn thiện thực tế **vượt README** (README vẫn ghi Sprint 2 là placeholder, SDK 57, port 5000, có thư mục `src/components/` và `assets/` — tất cả đều sai/lỗi thời so với code thật).
Đã chạy thật: auth (kèm sinh trắc học), home/catalog, PDP, tìm kiếm, giỏ, checkout COD/SePay, đơn hàng + huỷ, tạo RMA kèm ảnh, loyalty, địa chỉ CRUD, wishlist đồng bộ server, guest cart + merge khi đăng nhập.
Nửa thật/mock (xem P0 §1): OrderScreen đơn mẫu GHN hardcode, PDP fallback sản phẩm mock khi API lỗi, Search lọc trên mock, Checkout prefill dữ liệu demo + phí ship hardcode 0 + voucher chỉ hiện alert, OrderSuccess ETA và "+145 GlowPoints" hardcode, Home banner Unsplash hardcode.
Hoàn toàn hardcode: NotificationCenter, StoreLocator (không bản đồ, chỉ mở Google Maps), RmaTracking (step 2 cố định), Profile (chỉ đọc store local).
Thiếu so với app Shopee/Hasaki: push, chat, livestream/video, flash sale thật, voucher trên mobile (backend có API promotion nhưng mobile không gọi), gợi ý cá nhân hoá, tìm kiếm bằng ảnh/giọng nói, thanh toán ngoài COD/SePay, theo dõi đơn realtime/bản đồ, đánh giá có ảnh, offline/cache, deep link standalone, onboarding.

## 4. Backend (NestJS)

21 module. Đã có: auth + OAuth Google/Facebook, catalog + facets/suggest, cart merge, đơn + guest checkout, 4 cổng thanh toán (SePay/VNPay/MoMo/ZaloPay) + COD, promotion/coupon/flash-sale quota, loyalty, review có duyệt, RMA đầy đủ (đổi hàng, hoàn tiền, ảnh bằng chứng), shipment + tracking, wishlist, notification, search Elasticsearch (đang fallback DB), POS/kho/nhà cung cấp/HR/tài chính/báo cáo/SEO/marketing.
Đã đính chính một nghi ngờ trong lúc rà soát: `CustomerExperienceModule` không import trực tiếp trong `app.module.ts`, nhưng được import qua `marketing.module.ts` và `orders.module.ts` — kiểm chứng live: `GET /promotions/flash-sale`, `/promotions/active`, `/brands`, `/banners` đều trả 200. **Không có chuyện các API public này bị 404.**
Thiếu hẳn: chat/livestream/affiliate/seller centre (0 kết quả tìm kiếm trong `src`), xu, voucher freeship riêng (freeship chỉ là ngưỡng + promotion), gợi ý cá nhân hoá, tích hợp hãng vận chuyển (GHN/GHTK = 0 kết quả; tracking phụ thuộc nhập tay), review không có ảnh/video, không Q&A.
Rủi ro cần soi thêm trước khi kết luận: chống duplicate webhook (đã có `PaymentWebhookInbox` nhưng chưa kiểm tra handler), row-lock khi giữ quota flash sale, worker huỷ đơn treo 15 phút (online) / 30 phút (COD) nếu webhook trễ.

## 5. Về việc "cùng thảo luận với agent Gemini trong Antigravity"

Nói thẳng để không gây hiểu lầm: **Antigravity IDE đang chạy trên máy bạn, nhưng agent Gemini bên trong nó là giao diện đồ hoạ, không có CLI/API để Muse gọi trực tiếp được.** Muse không thể "nhắn" cho agent đó, cũng không thể đọc màn hình IDE của bạn.
Cách làm việc chung thực tế, đã chuẩn bị sẵn:
1. File này (`docs/shopee-hasaki-review-2026-11-13.md`) đã nằm trong project — bạn mở Antigravity, chọn model Gemini Flash, paste prompt trong `docs/antigravity-gemini-prompt.md` (hoặc bảo nó đọc 2 file này).
2. Nhờ agent Gemini viết bổ sung của nó vào `docs/antigravity-gemini-findings.md` (không sửa code, chỉ ghi file).
3. Bạn nhắn lại cho Muse "Gemini xong rồi" — Muse đọc file đó qua SSH và hợp nhất thành bản tổng hợp cuối, đối chiếu điểm nào hai bên đồng ý/khác nhau.
