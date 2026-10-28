# FE-01 — Đối chiếu giao diện Stitch

Ngày cập nhật: **28/10/2026**. Nguồn thiết kế chuẩn là **`code.html`**; `screen.png`
đã cũ theo xác nhận của người dùng. Code đã chỉnh theo nguồn bên dưới; ảnh
review và test không có nghĩa người dùng đã sign-off toàn bộ giao diện.

| Phần giao diện | Nguồn trong `docs/4-stitch_design/` | Triển khai / ảnh kiểm tra |
|---|---|---|
| Navbar S11 | `danh_m_c_ch_m_s_c_da_glowup/code.html` | `widgets/site-shell.tsx`: announcement hồng, logo tròn, search/camera, cửa hàng/tạp chí/more/account/wishlist/cart, pill nhiều màu, nút cuộn tiếp; mobile drawer. Nguồn mới theo D00 và ảnh người dùng gửi. |
| Footer S39 | `trang_ch_glowup_beauty_retail` | Dải thẻ dịch vụ, bốn cột link, phương thức thanh toán và copyright; nội dung theo D03/D05/D06/D09. |
| Login S26 | `ng_nh_p_glowup_beauty_retail` | `/login`: editorial ảnh phủ màu, logo/club, nhóm lợi ích, form bên phải; `login-stitch.png`. |
| Register S25 | `ng_k_th_nh_vi_n_glowup` | `/register`: cột editorial nền blush, ảnh mỹ phẩm/caption, nhóm thẻ, form có icon và độ mạnh mật khẩu; `register-stitch.png`. |
| Recovery S28 | `qu_n_t_l_i_m_t_kh_u_glowup` | `/forgot-password`, `/reset-password`: brand phía trên, card giữa trang, hai bước, icon bảo mật; `forgot-password-stitch.png`, `reset-password-stitch.png`. |
| Verify S41 | `x_c_th_c_email_glowup` | `/verify-email`: card giữa trang viền trên, logo, icon email, trạng thái thiếu/expired/success và resend; `verify-email-stitch.png`. |
| OAuth S27 | `oauth_challenge_li_n_k_t_t_i_kho_n_glowup` | `/oauth/continue`: card giữa trang, logo, bảo vệ tài khoản, hai bước của flow thực; thiếu challenge hiện expired; `oauth-continue-stitch.png`. |
| Account/address S29 | `s_a_ch_glowup` | Sidebar 260px có icon, nhóm menu, active state, hỗ trợ; card địa chỉ, ô thêm địa chỉ, form inline; `addresses.png`, `address-editor.png`. |
| 404 S01 | `404_kh_ng_t_m_th_y_trang_glowup` | Card trắng trên nền blush, biểu tượng 404 lá, search, gợi ý route và hai CTA; `not-found-stitch.png`. |
| Connection error S17 | `s_c_k_t_n_i_glowup` | Card trắng, icon kết nối, khối hướng dẫn, retry/home. Giữ lỗi network riêng với bảo trì. |
| Maintenance S30 | `h_th_ng_ang_b_o_tr_glowup` | Document 503 tự chứa: logo phía trên, card bảo trì, status, retry và hỗ trợ; `maintenance-stitch.png`. |

## Các khác biệt có căn cứ

- Navbar S11/footer S39 áp dụng ngoài auth; auth không header/footer theo D11. Sidebar account theo D02.
- Primary thương hiệu `#C85A70`, action/chữ nhỏ `#9D394F` theo quyết định contrast
  FE-00. Logo và hai ảnh editorial lấy từ thiết kế đã cung cấp, chuyển WebP local;
  nguồn nằm trong `public/images/stitch/sources.json`.
- Không hiển thị số giỏ hàng mẫu, giá trị giỏ hàng mẫu, tên khách/VIP giả, quà
  50.000đ, tích lũy 5%, freeship hay chứng nhận chưa được xác nhận. Giữ khối hình
  thức tương ứng với nội dung chức năng có thật.
- Google Identity Services/Facebook JS SDK nối BFF ở login/register; bật khi cấu hình hợp lệ và `OAUTH_*_ENABLED=true`. Fixture không thay nghiệm thu provider thật; không có checkbox “ghi nhớ” giả thay đổi TTL session.
  Hai provider đặt cạnh nhau và xếp dọc trên mobile theo HTML; nút Google dùng renderButton chính thức nên copy/branding theo SDK thay cho nút demo.
  Hai nút cùng cao 40px, cùng giới hạn rộng 400px; đã đo bằng SDK Google thật ở viewport 1440/1920/390px, không tràn ngang.
  Navbar camera/pickup giữ hình thức HTML và thể hiện chưa khả dụng. Announcement
  giữ nguyên nội dung thiết kế theo yêu cầu mới; phí giao hàng thực vẫn theo quote backend.
- Register verify bằng email link thay sáu ô OTP; OAuth proof theo API riêng.
  Reset link 30 phút, đổi trả 7 ngày; không copy số 15 phút/14–15 ngày từ mock.
- Địa chỉ không có note hoặc danh mục địa giới từ API: giữ trường text theo DTO.
  Biểu mẫu inline chỉ mở khi thêm/sửa; không trưng dữ liệu demo trong trạng thái
  xem danh sách. Cho phép thao tác địa chỉ mặc định theo backend.
- Không hiển thị tiến độ bảo trì, giờ hoàn tất hoặc latency giả. Bảo trì/global
  failure được dùng shell tự chứa tối giản để vẫn hiển thị khi app hỏng.
- Trang `/` vẫn là trang chờ FE-00; hero/catalog/home shelves thuộc FE-02/06,
  chưa được ghi là UI home hoàn tất.

## Kiểm tra

`tests/e2e/auth.spec.ts` chụp sáu route auth trên Chromium desktop và mobile,
kiểm tra composition riêng, auth không header/footer, navbar site, overflow và các luồng FE-01. Ảnh nằm trong
`test-results/` (gitignored). Review ảnh cạnh bản render `code.html` ở cùng viewport;
navbar đối chiếu thêm ảnh mới người dùng gửi. Không coi PNG cũ hoặc baseline tự
sinh là thiết kế được duyệt.

Đã render trực tiếp HTML navbar và chụp đối chiếu cùng viewport 1600px:
`test-results/navbar-html-review/reference-code-html.png` và `implementation.png`.
Ảnh này không chứa số badge demo trong implementation; badge vẫn chờ dữ liệu thật.

```powershell
cd frontend
$env:PLAYWRIGHT_PORT='3011' # Nếu app dev đang chạy ở 3001
npm run test:e2e
```

Test dùng backend fixture tại 3100, Upstash namespace riêng và build directory
`.next-e2e`, không dùng backend thật hay build directory của app dev.
