# 05 — Quyết định đã chốt và giả định triển khai

Ngày cập nhật: **26/10/2026**, sau hai nhóm trả lời và lựa chọn cổng thanh toán của người dùng. Các câu hỏi nghiệp vụ chính đã được trả lời; không còn chờ xác nhận những mục dưới đây.

## 1. Quyết định của người dùng

| ID | Mâu thuẫn / câu hỏi | Quyết định đã chốt | Tác động triển khai |
|---|---|---|---|
| D00 | Navbar giữa home/account/auth/checkout khác nhau | **Dùng navbar trang chủ làm layout** | Một SiteHeader, không lấy header ở từng mock |
| D01 | Blueprint primary #C85A70; HTML/frontmatter DESIGN.md #9D394F | **#C85A70 theo đặc tả thương hiệu** | CSS tokens chung; kiểm tra contrast để chọn token chữ phù hợp |
| D02 | Sidebar Sổ địa chỉ thiếu Tổng quan/Đổi trả/Bảo mật; “Ví voucher” khác trang rewards | **Giữ sidebar Sổ địa chỉ, bổ sung mục; Ví voucher dẫn Đổi ưu đãi** | Account nav theo [02](02_screen_inventory.md); không làm ví coupon riêng |
| D03 | Trang policy/help/request ghi 14 ngày; home/list returns/backend ghi 7 | **7 ngày theo backend** | Toàn bộ copy thống nhất; eligibility thật vẫn BE tính từ COMPLETED |
| D04 | Verify mock có 6 ô OTP; API đăng ký verify token link | **Link email** | Bỏ OTP đăng ký; resend đúng `/auth/resend-verification`. OAuth email proof là flow riêng, không bỏ |
| D05 | Checkout mock có nhiều phương thức; backend hiện COD-only | **Online bắt buộc; VNPAY + COD trước** | G01 là release blocker; bỏ MoMo/cổng thẻ riêng. Không nghiệm thu cuối bằng COD-only |
| D06 | Nhiều CTA ngoài API: showroom booking, newsletter, change-password, try-on… | **Có thể bỏ CTA chưa có API** | Bỏ CTA, không giả xử lý thành công; giữ page/template theo phạm vi. Security dùng forgot/reset thật |
| D07 | Blueprint có 5 trang brand/blog chưa có HTML | **Làm đủ cả blueprint** | B01–B05 thuộc phạm vi; dựng từ design system và blueprint |
| D08 | Freeship 299k/359k vs pricing mặc định 500k; reset 15 vs 30 phút; delete default bị chặn trong mock | **Đồng bộ quy tắc theo backend hiện có** | Không sửa BE để khớp mock; shipping theo quote/campaign, reset 30 phút, default address deletion theo BE |
| D09 | Footer/hotline/email khác nhau giữa các trang | **Footer theo trang chủ** | Một footer, contact cấu hình tập trung; nội dung official vẫn cần chuẩn bị trước public release |
| D10 | Public costPrice; schema generic; flash card thiếu fields; GET blog tăng view | **Lên kế hoạch sửa cả nhóm trước tích hợp** | O01/O02/O03/O05 là workstream BE đi trước, không chỉ ghi “nice-to-have” |

Các quyết định trên là lựa chọn do người dùng trả lời trong phiên, không phải suy đoán sau khi câu hỏi hết thời gian. Sau yêu cầu “triển khai fe-00”, foundation FE đã được triển khai; chưa sửa BE.

## 2. Các mâu thuẫn còn lại được xử lý theo quyết định trên

| Hiện trạng | Cách xử lý trong bản đầu | Căn cứ |
|---|---|---|
| Tên hội viên Gold/Rose Gold/Platinum/Diamond, số điểm 1.240/1.250/1.450, % thăng hạng không nhất quán | Dữ liệu backend và policy; không dùng số mẫu làm logic | D08, backend authoritative |
| Flash sale nói “giữ giá 15 phút tại giỏ”; API `reservation:false` | Bỏ lời hứa; cart/preview chưa giữ quota; backend confirm khi create | D08 |
| Checkout dùng bước giao hàng/ship 2h và pickup trong vài mock | Có address form; bỏ lựa chọn shipping service/pickup nếu backend chưa hỗ trợ | D06/D08 |
| Quà tặng tự thêm, BOGO, x3 điểm, mã công khai từ campaign | Chỉ hiển thị khi contract/policy thực có hỗ trợ; không áp luật trên FE | D06/D08 |
| OAuth nói password hoặc OTP và hợp nhất lịch sử account | Theo flow backend login tài khoản đích + email proof; không tự merge identity/POS history | D08, handoff |
| Social login đã có API nhưng SDK/SMTP thật chưa nghiệm thu | UI flow được làm; provider button chỉ bật khi config/test thật đạt | Không đánh đồng API exists với provider ready |
| Sổ địa chỉ ghi API `/api/v1/user/addresses`, note riêng và dropdown địa giới | Gọi `/customers/me/addresses`; bỏ note; text fields theo DTO trước khi có catalog địa giới | D06/D08 |
| Order history search/năm/count tab nhưng API chỉ status/page/limit | Bỏ control/count chưa hỗ trợ hoặc ghi đề xuất O07, không lọc một page rồi trình bày là toàn bộ | D06 |
| Tracking có live map/tài xế/ETA nhưng API chỉ shipments/events/link | Giữ timeline nhiều kiện và link đã kiểm tra; bỏ chi tiết không có nguồn | D06 |
| Review ảnh/video, wishlist “thêm tất cả”, notification read-all, maintenance nhận voucher | Bỏ tính năng chưa có contract; giữ luồng thực tương ứng | D06 |
| Profile/avatar/beauty profile/2FA không có API | Không submit field giả; dùng profile cơ bản và reset-password link | D06 |
| Hotlines 1800 6838/1900 6868/1900 8899, số cửa hàng 15+, năm 2025/2026, chứng nhận và SLA giả | Dùng config/footer chuẩn home; cần nội dung thực trước public release; bỏ claim không được xác nhận | D09 |

## 3. Giả định kỹ thuật có thể tiến hành

Đây là lựa chọn kỹ thuật đề xuất trong kế hoạch, không phải câu trả lời giả của người dùng:

- Project `frontend/` ngang `backend/`; Next 16.x stable patch được pin khi bootstrap; server local cổng 3001 như handoff.
- Route product/category dùng số nhiều theo cấu trúc người dùng và sitemap backend. CMS canonical `/<pageSlug>` khớp sitemap hiện có, `/pages/<slug>` là alias redirect. Có reserved slug/route allowlist; không dùng catch-all nuốt account/api/static.
- Session web opaque HttpOnly cookie + server session store có TTL và lock refresh; giữ mọi quyết định nghiệp vụ ở NestJS.
- Navbar home áp dụng cả auth/checkout; `global-error` và maintenance khi app hỏng có thể dùng shell tự chứa tối giản, không phụ thuộc API/header đang lỗi.
- Footer kiểu trang chủ được dùng; loại phần newsletter CTA chưa API theo D06 và payment logos MoMo/thẻ riêng theo D05.
- Không đưa sandbox/preview mock data vào release fallback. Page thiếu data hiển thị empty/unavailable; integration chưa đủ vẫn ghi dependency, không âm thầm giảm scope.

## 4. Handoff còn cần chuẩn bị khi triển khai

Những mục này là đầu vào công việc, **không phải lý do dừng viết kế hoạch**:

1. VNPAY sandbox merchant/config, domain Return/IPN, protocol/version và module payment owner; secret chỉ cấp qua môi trường backend.
2. Contract public brands/stores và dữ liệu logo/địa chỉ/tọa độ; nếu chọn nội dung tĩnh cho showroom, phải có nguồn được duyệt và không coi đó là nguồn stock/order.
3. Nội dung CMS chính thức: điều khoản, privacy, return/shipping policy, hotline/email, pháp nhân, asset; kiểm tra các claim như 2h/PCI/VAT/chứng nhận.
4. SMTP, OAuth registration, private evidence storage, migrations và session store đã được cấu hình/kiểm chứng lại.
5. Ước lượng BE cho G01 và O01/O02/O03/O05; từ đó mới chốt lịch calendar FE, không dùng ước lượng frontend làm cam kết toàn dự án.

Nếu cần thêm tính năng đã bỏ (MoMo, pickup, change-password, newsletter, ví voucher riêng, skin filters), tạo thay đổi phạm vi với impact API/UI/test rõ ràng trước khi đưa vào sprint.

## 5. Quyết định kỹ thuật tại FE-00 — 26/10/2026

- Next 16.4.3 / React 19.3.1 và toàn bộ dependencies pin exact + npm lockfile; baseline Node 22.14.0. Không đổi phạm vi nghiệp vụ.
- Chọn opaque session + Redis TTL/lock/CAS cho FE-01; ADR nêu recovery khi refresh timeout có kết quả không xác định. FE-00 chưa triển khai auth runtime.
- Giữ `cacheComponents: false` ở baseline: dynamic SSR/no-store đã có, opt-in caching chờ public representation/invalidation và spike riêng. Không ghi rằng đã benchmark Cache Components.
- Brand primary #C85A70 giữ nguyên; action/text #9D394F cho chữ nhỏ vì contrast trắng/primary chỉ 4.08:1, trắng/action 6.71:1.
- Diagnostic SSR chỉ development và explicit env flag, production 404. E2E fixture không thay nghiệm thu backend thật.
- Generated types lấy spec hiện tại; schema generic/O02 và các blocker BE vẫn giữ nguyên. Asset manifest không đồng nghĩa ảnh đã được duyệt xuất bản.

Chi tiết: [ADR session](../../../frontend/docs/adr/001-session-refresh.md), [ADR runtime/contracts/cache](../../../frontend/docs/adr/002-runtime-contracts-cache.md).

## 6. Triển khai FE-01 — 27/10/2026

- Người dùng yêu cầu dùng chung Upstash hiện có của backend, thay Redis local. Frontend sử dụng kết nối TLS qua `SESSION_REDIS_URL`, namespace runtime/test riêng; credentials trong file env bị gitignore, không dùng biến NEXT_PUBLIC.
- Upstash FE-01 là session store phía server Next/BFF. Giữ upstream/private response no-store và cache tương tác TanStack Query trong memory có scope user; chưa bật persistent public data cache trong FE-01.
- Opaque refresh token chưa có expiry trong response. Web session dùng deadline cấu hình không vượt TTL backend; chưa sửa backend. Nhánh refresh outcome không xác định giữ recovery record, không replay refresh token cũ; gate môi trường còn mở.
