# 05 — Quyết định đã chốt và giả định triển khai

Ngày cập nhật: **28/10/2026**. Quyết định D00 đã được người dùng đổi sang navbar trang Danh mục chăm sóc da; các quyết định khác tiếp tục theo những câu trả lời đã chốt.

## 1. Quyết định của người dùng

| ID | Mâu thuẫn / câu hỏi | Quyết định đã chốt | Tác động triển khai |
|---|---|---|---|
| D00 | Navbar giữa home/account/auth/checkout khác nhau | **Dùng navbar trong `code.html` trang Danh mục chăm sóc da làm layout** (cập nhật 28/10/2026) | Một SiteHeader theo `danh_m_c_ch_m_s_c_da_glowup/code.html`: announcement hồng, search/camera, cửa hàng/tạp chí, account, wishlist/cart và pill nhiều màu; áp dụng site trừ nhóm auth (D11), active state theo route thực |
| D01 | Blueprint primary #C85A70; HTML/frontmatter DESIGN.md #9D394F | **#C85A70 theo đặc tả thương hiệu** | CSS tokens chung; kiểm tra contrast để chọn token chữ phù hợp |
| D02 | Sidebar Sổ địa chỉ thiếu Tổng quan/Đổi trả/Bảo mật; “Ví voucher” khác trang rewards | **Giữ sidebar Sổ địa chỉ, bổ sung mục; Ví voucher dẫn Đổi ưu đãi** | Account nav theo [02](02_screen_inventory.md); không làm ví coupon riêng |
| D03 | Trang policy/help/request ghi 14 ngày; home/list returns/backend ghi 7 | **7 ngày theo backend** | Toàn bộ copy thống nhất; eligibility thật vẫn BE tính từ COMPLETED |
| D04 | Verify mock có 6 ô OTP; API đăng ký verify token link | **Link email** | Bỏ OTP đăng ký; resend đúng `/auth/resend-verification`. OAuth email proof là flow riêng, không bỏ |
| D05 | Checkout mock có nhiều phương thức; backend hiện COD-only | **Online bắt buộc; VNPAY + COD trước** | G01 là release blocker; bỏ MoMo/cổng thẻ riêng. Không nghiệm thu cuối bằng COD-only |
| D06 | Nhiều CTA ngoài API: showroom booking, newsletter, change-password, try-on… | **Có thể bỏ CTA chưa có API** | Bỏ CTA, không giả xử lý thành công; giữ page/template theo phạm vi. Security dùng forgot/reset thật |
| D07 | Blueprint có 5 trang brand/blog chưa có HTML | **Làm đủ cả blueprint** | B01–B05 thuộc phạm vi; dựng từ design system và blueprint |
| D08 | Freeship 299k/359k vs pricing mặc định 500k; reset 15 vs 30 phút; delete default bị chặn trong mock | **Đồng bộ quy tắc theo backend hiện có** | Không sửa BE để khớp mock; shipping theo quote/campaign, reset 30 phút, default address deletion theo BE |
| D09 | Footer/hotline/email khác nhau giữa các trang | **Footer theo trang chủ** | Một footer, contact cấu hình tập trung; nội dung official vẫn cần chuẩn bị trước public release |
| D11 | Auth cần không có header/footer | **Auth dùng layout riêng, không SiteHeader/SiteFooter** (28/10/2026) | `(auth)` cùng cấp `(site)`; login/register/recovery/verify/OAuth và boundary auth không có chrome site |
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
| Social login đã có API nhưng SDK/SMTP thật chưa nghiệm thu | SDK và BFF được nối, bật bằng cấu hình riêng; nghiệm thu provider thật vẫn cần smoke end-to-end | Không đánh đồng API exists với provider ready |
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
- Navbar trang Danh mục chăm sóc da áp dụng home/checkout/account; auth không header/footer theo D11; `global-error` và maintenance khi app hỏng có thể dùng shell tự chứa tối giản, không phụ thuộc API/header đang lỗi.
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

## 7. Đổi nguồn navbar chuẩn — 28/10/2026

- Theo yêu cầu mới của người dùng, D00 thay nguồn navbar từ trang chủ sang [Danh mục chăm sóc da — code.html](../../4-stitch_design/danh_m_c_ch_m_s_c_da_glowup/code.html).
- Người dùng xác nhận **`code.html` là thiết kế hiện tại**, `screen.png` đã cũ. Mọi màn lấy HTML làm chuẩn bố cục/style; ảnh PNG cũ chỉ tham khảo lịch sử. Navbar đối chiếu thêm ảnh mới người dùng gửi ngày 28/10/2026, không lấy navbar trong PNG cũ.
- Một navbar dùng chung các trang ngoài auth (D11); mục được chọn phản ánh route đang mở, không cố định “Chăm sóc da” trên mọi trang. Badge/tên người dùng/giỏ hàng lấy dữ liệu thật theo các quy tắc đã chốt.
- Đây là cập nhật yêu cầu thiết kế; chưa đánh dấu navbar hiện tại đã được sửa hoặc nghiệm thu theo mẫu mới.

## 8. Sửa UI FE-01 theo thiết kế Stitch — 28/10/2026

- Người dùng yêu cầu triển khai bám giao diện đã thiết kế. Mỗi màn phải render và đối chiếu **`code.html`** tương ứng; không tự thay bằng template có cùng màu nhưng khác bố cục, ảnh, typography và nhịp khoảng cách. `screen.png` cũ không có quyền ghi đè HTML hiện tại.
- Navbar dùng S11 theo D00 mới, footer dùng S39, sidebar dùng S29. Đây là các thành phần được chuẩn hóa xuyên site; phần nội dung còn lại giữ composition riêng của từng màn.
- S25/S26 (register/login) có editorial hai cột; S28 (forgot/reset), S41 (verify) và S27 (OAuth) có card giữa trang. Trên mobile, chuyển cột theo responsive và giữ thứ tự form dễ sử dụng.
- S29 dùng card địa chỉ và biểu mẫu thêm/sửa mở ngay trong trang theo thiết kế; có validation, focus và các mutation thật của FE-01.
- Các ngoại lệ nghiệp vụ D03–D09 vẫn áp dụng: email link thay OTP đăng ký, reset 30 phút, đổi trả 7 ngày, không số lượng/giá trị/quyền lợi mẫu. Provider/CTA chưa nghiệm thu không giả hoạt động. Mỗi khác biệt có căn cứ trong [bảng đối chiếu FE-01](../../../frontend/docs/fe-01-design-review.md).
- UI code đã được cập nhật theo yêu cầu; kiểm tra chức năng và ảnh review không thay thế sign-off backend/provider hoặc xác nhận thiết kế cuối cùng của người dùng.

- Navbar giữ nguyên copy announcement và nhãn pill theo HTML/ảnh mới người dùng yêu cầu. Số badge chỉ hiện khi có dữ liệu thật. Camera search và pickup giữ hình thức thiết kế nhưng ở trạng thái chưa khả dụng khi chưa có luồng tích hợp; không tạo giao dịch hoặc thông báo thành công giả.

## 9. Auth độc lập và social sign-in — 28/10/2026

- Theo yêu cầu mới, tất cả route auth không có header/footer site; chuyển `(auth)` ra cùng cấp `(site)`, giữ nguyên URL và root providers. Login/register giữ editorial riêng theo HTML.
- Bổ sung Google Identity Services và Facebook JS SDK ở login/register. Chỉ public client/app ID được truyền ra browser; Facebook secret ở backend. BFF và UI dùng chung kiểm tra cấu hình `OAUTH_*_ENABLED`; bật tính năng không đồng nghĩa đã nghiệm thu provider thật.
- Callback gửi Google ID token/Facebook access token về BFF; session opaque, challenge/nonce, email proof và login tài khoản đích giữ nguyên. Chưa cấu hình thì provider hiện chưa khả dụng, lỗi SDK/provider không chặn login email.
- Test fixture kiểm tra SDK callback → BFF → Upstash → backend fixture, đăng nhập trực tiếp, proof, linking, hủy và lỗi SDK. Nghiệm thu tài khoản/consent/SMTP thật vẫn thuộc ENV-01.

## 10. Sửa FE-03–06 theo HTML và cho phép guest checkout — 29/10/2026

- Người dùng yêu cầu sửa cả FE-03, FE-04, FE-05 cùng FE-06; cart được nêu rõ là màn còn khác thiết kế. Chuẩn vẫn là từng `code.html`, với các thành phần chung S11/S29/S39 theo quyết định trước.
- Guest được thêm giỏ và đặt hàng không cần đăng nhập. Backend trước lượt sửa có guest cart nhưng tạo đơn yêu cầu customer; đã bổ sung báo giá/tạo đơn/đọc đơn/thanh toán VNPAY theo phiên guest. Không tạo customer giả. Điểm và mã ưu đãi dành cho tài khoản vẫn theo quyền backend.
- Người dùng cho phép bổ sung API còn thiếu trong backend. Bổ sung tìm đơn theo mã/tên sản phẩm và năm để thanh tìm kiếm trong S23 hoạt động thật.
- Người dùng xác nhận chưa có danh sách showroom thật: giữ trạng thái chờ nội dung, không công khai địa chỉ seed.
- Không lấy banner đã có chữ làm nền rồi chồng lại cùng nội dung. Home dùng ảnh nguồn Stitch và một lớp chữ HTML.
- Kết quả, bằng chứng và các khác biệt nghiệp vụ được ghi ở [bảng sửa UI FE-03–06](../../../frontend/docs/fe-03-06-design-review.md). Build/test không thay thế duyệt thiết kế cuối cùng hay nghiệm thu VNPAY với provider.
