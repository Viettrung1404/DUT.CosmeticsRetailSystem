# 02 — Danh mục màn hình và tiêu chí triển khai

Ngày cập nhật: 26/10/2026. **Đã chốt làm đủ cả blueprint.** Mọi screen dùng navbar trang chủ, cụm account dùng sidebar Sổ địa chỉ, màu primary `#C85A70`; footer thống nhất theo trang chủ.

## 1. Cách đọc

- Nguồn HTML nằm trong `docs/4-stitch_design/<thư mục>/code.html`; ảnh đối chiếu cùng thư mục `screen.png`.
- Axx là nhóm API đã có; Gxx là chức năng thiếu; Oxx là đề xuất tối ưu trong [03](03_api_contracts_and_gaps.md).
- “API đã có” chỉ là xác nhận source/spec, không khẳng định staging/provider đã hoạt động.
- Các CTA chưa có API được **bỏ khỏi UI bản đầu** theo quyết định người dùng. Vẫn dựng page/template có trong phạm vi; không xóa cả trang chỉ vì bỏ một CTA.
- Nội dung/asset thiếu có fixture ở môi trường phát triển để review bố cục; release dùng dữ liệu thật/được duyệt hoặc empty state trung thực. Không fallback sang mock khi API production lỗi.

## 2. Mapping toàn bộ 41 bản HTML

| ID | Thư mục nguồn | Màn hình | Route / composition | API / phụ thuộc | Phase | Nội dung và lưu ý nghiệm thu |
|---|---|---|---|---|---|---|
| S01 | [404_kh_ng_t_m_th_y_trang_glowup](../../4-stitch_design/404_kh_ng_t_m_th_y_trang_glowup/code.html) | 404 | `not-found.tsx` | Local | FE-01 | Search/tiếp tục mua, HTTP 404; không giữ logo/header giả khác chuẩn. |
| S02 | [b_o_m_t_t_i_kho_n_glowup](../../4-stitch_design/b_o_m_t_t_i_kho_n_glowup/code.html) | Bảo mật tài khoản | `/account/security` | A01; G04 | FE-04 | Dùng luồng reset đang có; bỏ form đổi mật khẩu/2FA/quản lý phiên khi chưa có API. |
| S03 | [c_u_h_i_th_ng_g_p_faq_glowup](../../4-stitch_design/c_u_h_i_th_ng_g_p_faq_glowup/code.html) | FAQ | `/faq` | A10 | FE-06 | Nhóm FAQ, search nội dung đã tải, accordion; sửa copy đổi trả thành 7 ngày. |
| S04 | [ch_ng_tr_nh_khuy_n_m_i_glowup](../../4-stitch_design/ch_ng_tr_nh_khuy_n_m_i_glowup/code.html) | Danh sách khuyến mãi | `/promotions` | A09; O03 | FE-06 | Campaign đang active, phân trang; không tự sinh tab sắp diễn ra từ API active. |
| S05 | [ch_nh_s_ch_i_tr_ho_n_ti_n_glowup](../../4-stitch_design/ch_nh_s_ch_i_tr_ho_n_ti_n_glowup/code.html) | Chính sách đổi trả/hoàn tiền | `/<pageSlug>` | A10 | FE-06 | Template CMS, mục lục; nội dung 7 ngày theo backend, bỏ CTA PDF nếu không có file. |
| S06 | [chi_ti_t_i_tr_b_o_gi_glowup](../../4-stitch_design/chi_ti_t_i_tr_b_o_gi_glowup/code.html) | Chi tiết đổi trả/báo giá | `/account/returns/[id]` | A07 | FE-05 | Quote còn hạn/đổi/hết hạn, số tiền chênh lệch, accept idempotent, settlement/refund status. |
| S07 | [chi_ti_t_khuy_n_m_i_glowup](../../4-stitch_design/chi_ti_t_khuy_n_m_i_glowup/code.html) | Chi tiết khuyến mãi | `/promotions/[id]` | A09; G07/O03 | FE-06 | Điều kiện, thời hạn và sản phẩm đúng campaign; cần contract detail/card, không quét mọi trang để tìm ID. |
| S08 | [chi_ti_t_n_h_ng_glowup](../../4-stitch_design/chi_ti_t_n_h_ng_glowup/code.html) | Chi tiết đơn hàng | `/account/orders/[id]` | A05/A07 | FE-04 | Item snapshots/tổng tiền/status thật; cancel PENDING, link tracking/return/review; in bản đơn hàng không tự gọi là hóa đơn VAT. |
| S09 | [chi_ti_t_s_n_ph_m_pdp_glowup](../../4-stitch_design/chi_ti_t_s_n_ph_m_pdp_glowup/code.html) | Chi tiết sản phẩm | `/products/[slug]` | A02/A03/A06/A07 | FE-02 | Gallery/variant/qty, add/buy, related, reviews, metadata; bỏ thử màu/stock chi nhánh khi thiếu API. |
| S10 | [chi_ti_t_showroom_ng_kh_i_glowup](../../4-stitch_design/chi_ti_t_showroom_ng_kh_i_glowup/code.html) | Chi tiết showroom | `/stores/[id]` | G02 | FE-06 | Giữ page/gallery/giờ mở cửa/địa chỉ với dữ liệu được duyệt; bỏ đặt lịch/pickup/live stock chưa hỗ trợ. |
| S11 | [danh_m_c_ch_m_s_c_da_glowup](../../4-stitch_design/danh_m_c_ch_m_s_c_da_glowup/code.html) | Danh mục chăm sóc da | `/categories/[slug]` | A02; O04 | FE-02 | Resolve slug qua tree; listing/filter chung, không hardcode category ID. |
| S12 | [danh_s_ch_i_tr_glowup](../../4-stitch_design/danh_s_ch_i_tr_glowup/code.html) | Danh sách đổi trả | `/account/returns` | A07 | FE-05 | Filter status, pagination, đơn không đủ điều kiện, link tạo/chi tiết. |
| S13 | [flash_sale_glowup](../../4-stitch_design/flash_sale_glowup/code.html) | Flash sale | `/flash-sale` | A09; O03 | FE-06 | serverTime/endDate, remaining quota, hết giờ refetch; bỏ giữ giá 15 phút trong giỏ và lượt xem giả. |
| S14 | [gi_h_ng_glowup_beauty_retail](../../4-stitch_design/gi_h_ng_glowup_beauty_retail/code.html) | Giỏ hàng | `/cart` | A03/A05 | FE-03 | Guest/customer, isSelected, quantity, remove, unavailable, price changed; đúng ID cart item. |
| S15 | [h_ng_m_i_v_glowup](../../4-stitch_design/h_ng_m_i_v_glowup/code.html) | Hàng mới về | `/new-arrivals` | A02 | FE-02 | Reuse listing sortBy=newest; không cam kết 'trong tháng' khi API chưa lọc ngày. |
| S16 | [h_p_th_th_ng_b_o_glowup](../../4-stitch_design/h_p_th_th_ng_b_o_glowup/code.html) | Thông báo | `/account/notifications` | A08; G08 | FE-05 | Pagination/unread/read từng item; bỏ read-all và lọc category toàn cục nếu chưa có contract. |
| S17 | [h_th_ng_ang_b_o_tr_glowup](../../4-stitch_design/h_th_ng_ang_b_o_tr_glowup/code.html) | Bảo trì | `/maintenance + runtime 503` | Local; G10 | FE-01/07 | Thông báo được cấu hình, Retry-After; bỏ fake tiến độ 75% và email nhận voucher. |
| S18 | [h_th_ng_showroom_glowup](../../4-stitch_design/h_th_ng_showroom_glowup/code.html) | Danh sách showroom | `/stores` | G02 | FE-06 | List/map/filter nếu có tọa độ thật; không có dữ liệu thì empty state, không bịa pin. |
| S19 | [i_m_th_ng_h_ng_th_nh_vi_n_glowup](../../4-stitch_design/i_m_th_ng_h_ng_th_nh_vi_n_glowup/code.html) | Điểm thưởng/hạng | `/account/loyalty` | A06 | FE-05 | Balance/tier/benefits/ledger từ API; không tính tỷ lệ 1 điểm=100đ hoặc đặt tên hạng từ mock. |
| S20 | [i_u_i_glowup](../../4-stitch_design/i_u_i_glowup/code.html) | Đổi ưu đãi | `/account/loyalty/rewards` | A06; G06 | FE-05 | Reward policy, redeem idempotent; 503 policy chưa cấu hình; 'Ví voucher' sidebar dẫn tới đây, không giả danh sách voucher đã sở hữu. |
| S21 | [k_t_qu_t_m_ki_m_glowup](../../4-stitch_design/k_t_qu_t_m_ki_m_glowup/code.html) | Kết quả tìm kiếm | `/search?q=...` | A02 | FE-02 | URL search, suggestion có keyboard, local recent search, empty/error, tránh stale response. |
| S22 | [k_t_qu_thanh_to_n_glowup](../../4-stitch_design/k_t_qu_thanh_to_n_glowup/code.html) | Kết quả thanh toán | `/payment/return` | G01 bắt buộc | FE-03 | VNPAY success/pending/fail/cancel/expired; xác nhận từ backend, reload vẫn đúng; bỏ tab tự đổi trạng thái demo. |
| S23 | [l_ch_s_n_h_ng_glowup](../../4-stitch_design/l_ch_s_n_h_ng_glowup/code.html) | Lịch sử đơn hàng | `/account/orders` | A05; O07 | FE-04 | Pagination/status theo enum; bỏ search/năm và count tab nếu backend chưa hỗ trợ, không filter riêng một page rồi coi là toàn bộ. |
| S24 | [mini_cart_drawer_glowup](../../4-stitch_design/mini_cart_drawer_glowup/code.html) | Mini cart drawer | `Overlay dùng chung` | A03 | FE-03 | Cùng query cart với page; focus trap/Escape/return focus, mutation consistency, CTA cart/checkout. |
| S25 | [ng_k_th_nh_vi_n_glowup](../../4-stitch_design/ng_k_th_nh_vi_n_glowup/code.html) | Đăng ký | `/register` | A01 | FE-01 | Email/fullName/password/phone optional; xác thực bằng link; xử lý PHONE_VERIFICATION_REQUIRED theo API. |
| S26 | [ng_nh_p_glowup_beauty_retail](../../4-stitch_design/ng_nh_p_glowup_beauty_retail/code.html) | Đăng nhập | `/login` | A01/A03 | FE-01 | Email/password, errors, returnTo, merge cart; Google/Facebook chỉ bật sau provider smoke test. |
| S27 | [oauth_challenge_li_n_k_t_t_i_kho_n_glowup](../../4-stitch_design/oauth_challenge_li_n_k_t_t_i_kho_n_glowup/code.html) | OAuth challenge/link | `/oauth/continue` | A01 | FE-01 | Challenge có binding nonce, email proof; link cần session tài khoản đích, không password-or-OTP tùy chọn như mock. |
| S28 | [qu_n_t_l_i_m_t_kh_u_glowup](../../4-stitch_design/qu_n_t_l_i_m_t_kh_u_glowup/code.html) | Quên và đặt lại mật khẩu | `/forgot-password; /reset-password` | A01 | FE-01 | Tách hai route, token single-use/expired, success/error riêng; thời hạn 30 phút theo backend. |
| S29 | [s_a_ch_glowup](../../4-stitch_design/s_a_ch_glowup/code.html) | Sổ địa chỉ — chuẩn sidebar | `/account/addresses` | A04; G05/O06 | FE-01/04 | CRUD/default/max 10, form thực; cho xóa mặc định theo backend; bỏ note riêng nếu DTO chưa có. |
| S30 | [s_c_k_t_n_i_glowup](../../4-stitch_design/s_c_k_t_n_i_glowup/code.html) | Lỗi kết nối | `error.tsx / global-error.tsx` | Local | FE-01/07 | Retry/reset, giữ form draft cần thiết; không gộp network/503 thành bảo trì, không ping/status giả. |
| S31 | [s_n_ph_m_y_u_th_ch_glowup](../../4-stitch_design/s_n_ph_m_y_u_th_ch_glowup/code.html) | Wishlist | `/account/wishlist` | A06/A03 | FE-05 | Product-level wishlist; chọn variant khi add cart, prefer PUT selected; bỏ add-all nếu chưa giải quyết variant/partial failure. |
| S32 | [t_h_ng_th_nh_c_ng_glowup](../../4-stitch_design/t_h_ng_th_nh_c_ng_glowup/code.html) | Đặt hàng thành công | `/order-success/[id]` | A05/G01 | FE-03 | Fetch order UUID có ownership; COD ghi chờ thu tiền, VNPAY theo payment status; orderNumber chỉ để hiển thị. |
| S33 | [t_ng_quan_t_i_kho_n_glowup](../../4-stitch_design/t_ng_quan_t_i_kho_n_glowup/code.html) | Tổng quan tài khoản | `/account` | A04/A05/A06/A08; O07 | FE-04 | Compose bounded calls; bỏ số voucher/expiry/progress chưa có dữ liệu thay vì fake count. |
| S34 | [t_o_y_u_c_u_i_tr_m_i_glowup](../../4-stitch_design/t_o_y_u_c_u_i_tr_m_i_glowup/code.html) | Tạo yêu cầu đổi trả | `/account/returns/new?orderId=...` | A07 | FE-05 | Chọn item/qty/reason/replacement, private evidence, confirm; theo cửa sổ 7 ngày sau COMPLETED. |
| S35 | [t_t_c_s_n_ph_m_glowup](../../4-stitch_design/t_t_c_s_n_ph_m_glowup/code.html) | Tất cả sản phẩm | `/products` | A02; O04 | FE-02 | Filter DTO hỗ trợ, pagination và sort URL; bỏ giảm sâu nhất/multi-brand/skin facets khi chưa có contract. |
| S36 | [th_ng_tin_c_nh_n_glowup](../../4-stitch_design/th_ng_tin_c_nh_n_glowup/code.html) | Thông tin cá nhân | `/account/profile` | A04; G04 | FE-04 | fullName/phone/dateOfBirth/gender; email readonly; bỏ beauty profile/avatar upload chưa hỗ trợ. |
| S37 | [thanh_to_n_glowup](../../4-stitch_design/thanh_to_n_glowup/code.html) | Checkout | `/checkout` | A04/A05; G01 bắt buộc | FE-03 | Navbar chung, form address, coupon/points, preview/quote/idempotency; chỉ COD hoặc VNPAY. |
| S38 | [theo_d_i_v_n_chuy_n_glowup](../../4-stitch_design/theo_d_i_v_n_chuy_n_glowup/code.html) | Theo dõi vận chuyển | `/account/orders/[id]/tracking` | A07 | FE-04 | Nhiều kiện/timeline/trackingUrl; không bịa tọa độ live, số điện thoại tài xế hay ETA. |
| S39 | [trang_ch_glowup_beauty_retail](../../4-stitch_design/trang_ch_glowup_beauty_retail/code.html) | Trang chủ — chuẩn navbar/footer | `/` | A02/A09/A10; G03/O03 | FE-01/02/06 | Hero/banner/category/shelves/brand/blog; navbar/footer dùng lại; bỏ newsletter/try-on CTA chưa hỗ trợ. |
| S40 | [trung_t_m_tr_gi_p_glowup](../../4-stitch_design/trung_t_m_tr_gi_p_glowup/code.html) | Trung tâm trợ giúp | `/help` | A10; G10 | FE-06 | FAQ + CMS + contact đã duyệt; bỏ ticket/chat chưa tích hợp và copy 14 ngày. |
| S41 | [x_c_th_c_email_glowup](../../4-stitch_design/x_c_th_c_email_glowup/code.html) | Xác thực email | `/verify-email?token=...` | A01 | FE-01 | Link token, pending/success/invalid/expired, resend; bỏ 6 ô OTP đăng ký. |

## 3. Năm trang blueprint chưa có HTML riêng

| ID | Blueprint | Route | Cách dựng | Phụ thuộc |
|---|---|---|---|---|
| B01 | §4.4 Brand directory | `/brands` | Logo grid, alphabet/search, featured brands; design tokens/header chung | G03 public brand API |
| B02 | §4.5 Brand collection | `/brands/[slug]` | Brand hero + ProductGrid/filter chung | G03 resolve slug → brandId; A02 products |
| B03 | §7.1 Blog index | `/blog` | Hero editorial, category navigation, article cards, pagination | A10 posts/categories |
| B04 | §7.2 Blog topic | `/blog/category/[slug]` | Resolve category slug → ID; reuse blog list | A10 categoryId filter |
| B05 | §7.3 Blog article | `/blog/[slug]` | Title/excerpt/author/date/content, TOC nếu heading phù hợp, related chỉ khi có cơ sở | A10; O05 view-count side effect |

Các trang này **đã được người dùng xác nhận đưa vào phạm vi**. Dựng theo blueprint và design system, không đợi export Stitch mới. CMS template cũng phục vụ about/contact/privacy/terms/shipping khi có published slug; chính sách đổi trả là mẫu hình thức, không phải nội dung để sao chép sang mọi trang.

## 4. Asset/reference, không tính thành page

| Thư mục | Kết quả xem ảnh | Xử lý |
|---|---|---|
| `image.png_1` | Logo G dạng gương màu hồng | Asset logo tham khảo; chuẩn bị bản rõ ở kích thước header/favicon, không dùng nguyên ảnh lớn gây layout shift |
| `image.png_2` | Bảng nhận diện và biến thể logo | Tham chiếu asset/brand, không thêm route |
| `image.png_3` | Screenshot Beauty Box | Tham khảo trải nghiệm; không đưa nguyên ảnh/nhãn Beauty Box vào GlowUp |
| `glowup_beauty_retail/DESIGN.md` | Design system có token mâu thuẫn | Quyết định người dùng `#C85A70` ghi đè primary trong phần cấu hình cũ |
| `design_1.md` | Blueprint 46 mục | Dùng để bù màn và tương tác chưa được xuất HTML |

## 5. Menu account đã chốt

Giữ sidebar Sổ địa chỉ và bổ sung các mục cần thiết theo đúng hình thức hiện tại:

| Nhóm | Mục | Đích |
|---|---|---|
| Quản lý cá nhân | Tổng quan | `/account` |
| Quản lý cá nhân | Thông tin tài khoản | `/account/profile` |
| Quản lý cá nhân | Đơn hàng của tôi | `/account/orders` |
| Quản lý cá nhân | Sổ địa chỉ | `/account/addresses` |
| Quản lý cá nhân | Sản phẩm yêu thích | `/account/wishlist` |
| Quản lý cá nhân | Yêu cầu đổi trả | `/account/returns` |
| Quản lý cá nhân | Bảo mật | `/account/security` |
| Ưu đãi & Tích lũy | Ví voucher / Đổi ưu đãi | `/account/loyalty/rewards` |
| Ưu đãi & Tích lũy | Điểm thưởng | `/account/loyalty` |
| Ưu đãi & Tích lũy | Thông báo | `/account/notifications` |
| Cuối sidebar | Đăng xuất / hỗ trợ | Logout action / contact thống nhất |

Không làm ví coupon riêng trong bản đầu. Nhãn “Ví voucher” không cho phép hiển thị số voucher đã sở hữu khi chưa có API đó. Header/account badges chỉ có khi dữ liệu đáng tin cậy.

## 6. Overlay, modal và trạng thái bắt buộc

Không chỉ dựng screenshot “happy path”. Mỗi nhóm sau phải có tương tác chạy được:

- Header: mega menu, mobile navigation, account menu, search popover (keyboard/Escape), notification entry, mini-cart chung.
- Catalog: filter mobile, price input validation, applied chips/remove/reset, pagination/back-forward; quick-add chọn variant trước nếu cần. Gallery/zoom, review pagination/filter, form gửi review sau mua.
- Cart: confirm remove, selected/unselected, stock/price conflict, guest merge success/partial failure, empty cart và loading.
- Checkout: address picker/add/edit, coupon error, points bounds do server trả, preview stale/out-of-order, quote changed confirmation, duplicate submit, tạo payment lỗi sau khi đã có order.
- Account: profile dirty/saving/errors, địa chỉ max-10/delete/default, cancel order confirmation, review moderation pending, không có đơn, return không đủ điều kiện.
- Returns: chọn item/replacement, upload progress/fail/retry, MIME/size limit, private attachment expiry, duplicate request, quote changed/expired, accepted và chênh lệch thanh toán.
- Loyalty/rewards: insufficient points, 503 thiếu policy, idempotent retry, success và refresh balance. Không dựng đổi quà vật lý nếu API reward chỉ hỗ trợ voucher.
- Notifications: unread/read/empty, ownership khi mở deep link, resource đã bị xóa/không còn quyền.
- Auth: invalid credentials, unverified email, token expired/used, rate limit, email resend, OAuth challenge expired/link required, refresh expired/network failure.
- VNPAY: initiating → redirect → awaiting verification → paid / failed / cancelled / expired; return sai signature hoặc pending lâu; reload/reopen order khôi phục trạng thái.
- Error: skeleton, partial section failure, 401/403, 404, 409, 429 Retry-After, 503, timeout/offline; không chuyển mọi lỗi thành not-found.

## 7. Quy tắc hình thức và responsive chung

- Kiểm tra 360/390px mobile, 768px tablet, 1280/1440px desktop; không tràn ngang. Giá/CTA/filter không mất chức năng ở mobile.
- Chuẩn navbar/sidebar áp dụng ở mọi route phù hợp, không copy header sai khác từ HTML auth/checkout.
- Footer theo trang chủ; thay nội dung nghiệp vụ bằng 7 ngày/ship theo backend/VNPAY+COD. Hotline trang chủ 1900 8899 chỉ là giá trị thiết kế tạm, cần nội dung chính thức trước public release.
- Một card sản phẩm/CTA/theme duy nhất; snapshot visual chỉ chấp nhận những khác biệt đã được chốt ở decision log.
- Form có label, inline error, focus tới lỗi, trạng thái pending; touch target đủ lớn và dialog quản lý focus đúng.
- Ảnh có alt, aspect ratio và fallback; ưu tiên hero cần thiết, lazy-load ảnh ngoài màn hình. Không chạy CDN Tailwind runtime hoặc script inline Stitch trong sản phẩm.
- Không đặt SLA giao 2h, freeship, tỷ lệ tích điểm, tồn chi nhánh, phiếu quà hay dữ liệu chứng nhận trong UI nếu backend/nội dung được duyệt không chứng minh.

