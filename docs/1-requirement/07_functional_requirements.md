# 📋 Functional Requirements (FR) — Hệ thống GlowUp

**Dự án:** GlowUp — Hệ thống quản lý bán hàng và phân tích kinh doanh cho chuỗi cửa hàng bán lẻ mỹ phẩm  
**Phiên bản:** 1.0  
**Ngày tạo:** 2026-09-19  
**Tham chiếu:** Use Case Diagrams (Doc 06), Thiết kế CSDL (Doc 04), Kiến trúc hệ thống (Doc 03)

---

## Mục lục

1. [Quy ước & Hướng dẫn đọc tài liệu](#1-quy-ước--hướng-dẫn-đọc-tài-liệu)
2. [Tổng hợp chức năng theo độ ưu tiên](#2-tổng-hợp-chức-năng-theo-độ-ưu-tiên)
3. [FR-01: Quản lý Tài khoản & Xác thực](#fr-01-quản-lý-tài-khoản--xác-thực)
4. [FR-02: Mua hàng Online (Customer Website/App)](#fr-02-mua-hàng-online)
5. [FR-03: Bán hàng POS (Tại cửa hàng)](#fr-03-bán-hàng-pos)
6. [FR-04: Quản lý Đơn hàng](#fr-04-quản-lý-đơn-hàng)
7. [FR-05: Quản lý Kho hàng](#fr-05-quản-lý-kho-hàng)
8. [FR-06: Quản lý Sản phẩm & Danh mục](#fr-06-quản-lý-sản-phẩm--danh-mục)
9. [FR-07: Thanh toán](#fr-07-thanh-toán)
10. [FR-08: Quản lý Khách hàng & CRM](#fr-08-quản-lý-khách-hàng--crm)
11. [FR-09: Phân tích Kinh doanh & Dashboard](#fr-09-phân-tích-kinh-doanh--dashboard)
12. [FR-10: Quản lý Khuyến mãi & Marketing](#fr-10-quản-lý-khuyến-mãi--marketing)
13. [FR-11: Quản lý Nhân sự](#fr-11-quản-lý-nhân-sự)
14. [FR-12: Quản lý Nhà cung cấp & Nhập hàng](#fr-12-quản-lý-nhà-cung-cấp--nhập-hàng)
15. [FR-13: Quản lý Nội dung (CMS & SEO)](#fr-13-quản-lý-nội-dung-cms--seo)

---

## 1. Quy ước & Hướng dẫn đọc tài liệu

### 1.1 Mức độ ưu tiên

| Ký hiệu | Ý nghĩa | Mô tả |
|:--------:|---------|-------|
| 🔴 P0 | **Critical** | Bắt buộc có trong MVP. Không có thì hệ thống không vận hành được. |
| 🟠 P1 | **High** | Rất quan trọng, cần hoàn thành trong giai đoạn đầu sau MVP. |
| 🟡 P2 | **Medium** | Nên có, nâng cao trải nghiệm người dùng. Có thể lên kế hoạch ở sprint sau. |
| 🟢 P3 | **Nice-to-have** | Giá trị gia tăng, triển khai khi có thời gian dư. |

### 1.2 Phân loại platform

| Tag | Platform | Mô tả |
|-----|----------|-------|
| `[BE]` | Backend API | API endpoints, business logic, database, integration |
| `[FE-Admin]` | Web Admin (React) | Giao diện quản trị dành cho Staff, Manager, Admin |
| `[FE-Web]` | Web End-user (Next.js) | Website mua sắm cho khách hàng |
| `[Mobile]` | Mobile App (React Native) | Ứng dụng di động cho khách hàng |

### 1.3 Các vai trò Actor chính

| Mã | Vai trò | Ghi chú |
|----|---------|---------|
| A01 | Khách vãng lai (Guest) | Chưa đăng nhập |
| A02 | Khách hàng (Customer) | Đã đăng ký/đăng nhập |
| A03 | NV Bán hàng (Sales Staff) | Nhân viên tại cửa hàng |
| A04 | NV Kho (Warehouse Staff) | Nhân viên quản lý kho |
| A05 | QL Cửa hàng (Store Manager) | Quản lý 1 chi nhánh |
| A06 | Kế toán (Accountant) | Nhân viên kế toán |
| A07 | Admin hệ thống (System Admin) | Quản trị viên cao nhất |

### 1.4 Cấu trúc mỗi chức năng

Mỗi FR sẽ gồm:
- **Mã FR** — Mã định danh duy nhất
- **Tên chức năng** — Tên ngắn gọn
- **Actor** — Người dùng liên quan
- **Mô tả** — Mô tả chi tiết user story
- **Đầu ra mong muốn** — Kết quả sau khi hoàn thành
- **Quy tắc nghiệp vụ** — Business rules cần tuân thủ
- **Phân công** — Công việc cụ thể cho BE / FE-Admin / FE-Web / Mobile
- **Bảng CSDL liên quan** — Mapping với thiết kế DB
- **Ưu tiên** — P0 ~ P3

---

## 2. Tổng hợp chức năng theo độ ưu tiên

### 🔴 P0 — Critical (MVP)

| Module | FR | Chức năng |
|--------|----|-----------|
| Auth | FR-01.01 ~ FR-01.04 | Đăng ký, Đăng nhập, Đăng xuất, Quên mật khẩu |
| Sản phẩm | FR-06.01 ~ FR-06.04 | CRUD sản phẩm, danh mục, thương hiệu, biến thể |
| Mua hàng | FR-02.01 ~ FR-02.06 | Xem SP, Tìm kiếm, Chi tiết, Giỏ hàng, Đặt hàng |
| POS | FR-03.01 ~ FR-03.06 | Mở/đóng ca, Tạo đơn POS, Thu tiền, In hóa đơn |
| Đơn hàng | FR-04.01 ~ FR-04.05 | Xem/Xác nhận/Cập nhật/Hủy đơn |
| Kho | FR-05.01 ~ FR-05.03 | Nhập kho, Xuất kho, Xem tồn kho |
| Thanh toán | FR-07.01 ~ FR-07.03 | TT Online, COD, TT tại quầy |
| KH & CRM | FR-08.01 ~ FR-08.03 | Hồ sơ KH, Địa chỉ, Lịch sử mua |

### 🟠 P1 — High

| Module | FR | Chức năng |
|--------|----|-----------|
| Auth | FR-01.05 ~ FR-01.07 | Đổi MK, Hồ sơ cá nhân, Phân quyền |
| Kho | FR-05.04 ~ FR-05.07 | Chuyển kho, Kiểm kê, Lô hàng & HSD, Cảnh báo |
| Đơn hàng | FR-04.06 ~ FR-04.08 | Hoàn trả, Vận đơn, Theo dõi GH |
| Thanh toán | FR-07.04 ~ FR-07.06 | Lịch sử GD, Đối soát, Hoàn tiền |
| KH & CRM | FR-08.04 ~ FR-08.07 | Loyalty, Đổi điểm, Phân nhóm, Wishlist |
| Nhân sự | FR-11.01 ~ FR-11.07 | CRUD NV, Phòng ban, Ca, Chấm công, Hoa hồng |
| NCC | FR-12.01 ~ FR-12.06 | CRUD NCC, PO, Nhận hàng, Công nợ |

### 🟡 P2 — Medium

| Module | FR | Chức năng |
|--------|----|-----------|
| Sản phẩm | FR-06.05 ~ FR-06.07 | Tags, Import hàng loạt, SEO |
| Mua hàng | FR-02.07 ~ FR-02.08 | Wishlist, Đánh giá SP |
| Analytics | FR-09.01 ~ FR-09.08 | Dashboard, BC doanh thu, RFM, Dự báo |
| Marketing | FR-10.01 ~ FR-10.06 | KM, Voucher, Banner, Email, Push |
| CMS | FR-13.01 ~ FR-13.05 | Trang tĩnh, Blog, Banner, FAQ |

### 🟢 P3 — Nice-to-have

| Module | FR | Chức năng |
|--------|----|-----------|
| Auth | FR-01.08 | Đăng nhập Google/Facebook |
| Mua hàng | FR-02.09 | Lọc theo thành phần (Ingredients) |
| Analytics | FR-09.09 ~ FR-09.10 | Dự báo AI, Heatmap |

---

## FR-01: Quản lý Tài khoản & Xác thực

> **Actors:** A01 (Guest), A02 (Customer), A03~A06 (Staff), A07 (Admin)  
> **Bảng CSDL:** `users`, `roles`, `permissions`, `user_stores`, `user_oauth_accounts`, `verification_tokens`

---

### FR-01.01 — Đăng ký tài khoản 🔴 P0

**Actor:** A01 (Guest)

**Mô tả:**  
Khách vãng lai có thể tạo tài khoản mới bằng email hoặc số điện thoại. Hệ thống gửi mã OTP hoặc email xác thực để kích hoạt tài khoản. Sau khi xác thực, tài khoản được gán role mặc định `Customer` (`role_id = 6`).

**Đầu ra mong muốn:**
- Tạo bản ghi trong bảng `users` với `status = 'ACTIVE'`, `email_verified = TRUE` (hoặc `phone_verified = TRUE`)
- Tạo bản ghi tương ứng trong bảng `customers` để liên kết hồ sơ CRM
- Nếu SĐT trùng với khách POS vãng lai (`customers.phone`), tự động liên kết `user_id` vào bản ghi `customers` có sẵn (kế thừa lịch sử mua & điểm thưởng)
- Gửi email/SMS chào mừng

**Quy tắc nghiệp vụ:**
1. Email phải unique, hợp lệ (regex), không trùng với tài khoản đã tồn tại
2. Mật khẩu tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số
3. OTP hết hạn sau 5 phút, tối đa gửi lại 3 lần/giờ
4. Mã xác thực được lưu dạng hash trong `verification_tokens.token_hash`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/auth/register` | Validate input, hash password (bcrypt), tạo user, tạo customer, gửi OTP/email verify, xử lý merge customer POS |
| `[BE]` | API `POST /api/v1/auth/verify-email` | Kiểm tra token hợp lệ & chưa hết hạn, cập nhật `email_verified = TRUE` |
| `[BE]` | API `POST /api/v1/auth/verify-phone` | Kiểm tra OTP, cập nhật `phone_verified = TRUE`, merge customer POS nếu trùng SĐT |
| `[BE]` | API `POST /api/v1/auth/resend-otp` | Rate limiting 3 lần/giờ, tạo token mới |
| `[FE-Web]` | Trang `/register` | Form đăng ký (email, phone, password, full_name), step xác thực OTP/email |
| `[FE-Web]` | UX | Hiển thị strength indicator cho password, thông báo lỗi inline |
| `[Mobile]` | Màn hình đăng ký | Form tương tự FE-Web, auto-fill OTP từ SMS (Android), nhập OTP (iOS) |

---

### FR-01.02 — Đăng nhập 🔴 P0

**Actor:** A01~A07 (Tất cả)

**Mô tả:**  
Người dùng đăng nhập bằng email/password. Hệ thống xác thực và trả về JWT (Access Token + Refresh Token). Hệ thống phân biệt đăng nhập cho khách hàng (Web/App) và nhân viên (Admin portal).

**Đầu ra mong muốn:**
- Trả về `access_token` (JWT, TTL 15 phút) và `refresh_token` (TTL 7 ngày)
- Payload JWT chứa: `userId`, `roleId`, `roleName`, `dataScope`, `permissionCodes[]`
- Cập nhật `users.last_login_at`
- Ghi log đăng nhập thành công/thất bại vào `audit_logs`

**Quy tắc nghiệp vụ:**
1. Khóa tài khoản tạm thời 15 phút sau 5 lần nhập sai liên tiếp
2. Tài khoản `status = 'BANNED'` hoặc `'INACTIVE'` không được đăng nhập
3. Email chưa xác thực → redirect sang trang verify
4. Effective permissions tính theo công thức bitmask: `(roles.permissions | users.extra_permissions) & ~users.revoked_permissions`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/auth/login` | Validate credentials, check status/locked, generate JWT pair, log audit |
| `[BE]` | API `POST /api/v1/auth/refresh-token` | Validate refresh token, rotate token pair |
| `[BE]` | Middleware `authGuard` | Verify JWT, extract user info, attach to request |
| `[BE]` | Middleware `permissionGuard(requiredPermissions[])` | Check effective permissions bằng mảng mã quyền string |
| `[BE]` | Service `getUserEffectivePermissions(userId)` | **Hàm duy nhất** thực hiện bitwise operations, trả về mảng `permission_code` |
| `[FE-Web]` | Trang `/login` | Form email/password, remember me, link quên MK |
| `[FE-Admin]` | Trang `/admin/login` | Form đăng nhập riêng cho Staff/Admin |
| `[FE-Web]` / `[FE-Admin]` | Auth context/store | Lưu token, auto refresh, redirect khi hết hạn |
| `[Mobile]` | Màn hình đăng nhập | Form login, biometric login (FaceID/Fingerprint) — P3 |

---

### FR-01.03 — Đăng xuất 🔴 P0

**Actor:** A02~A07

**Mô tả:**  
Người dùng đăng xuất khỏi hệ thống. Hủy phiên làm việc hiện tại.

**Đầu ra mong muốn:**
- Invalidate refresh token phía server (blacklist hoặc xóa khỏi DB/Redis)
- Xóa token lưu trữ phía client (localStorage / SecureStorage)
- Redirect về trang chủ hoặc trang đăng nhập

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/auth/logout` | Blacklist refresh token trong Redis (TTL = remaining expiry) |
| `[FE-Web]` / `[FE-Admin]` | Logout handler | Gọi API, clear localStorage, redirect |
| `[Mobile]` | Logout handler | Gọi API, clear SecureStorage, navigate to Login |

---

### FR-01.04 — Quên mật khẩu 🔴 P0

**Actor:** A02~A07

**Mô tả:**  
Người dùng nhập email, hệ thống gửi link/OTP khôi phục mật khẩu. Link có thời hạn 30 phút, chỉ sử dụng 1 lần.

**Đầu ra mong muốn:**
- Gửi email chứa link reset password (hoặc OTP qua SMS)
- Tạo bản ghi `verification_tokens` với `type = 'PASSWORD_RESET'`, `expires_at = NOW() + 30 min`
- Sau khi reset thành công, invalidate tất cả refresh token cũ (force re-login)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/auth/forgot-password` | Tạo token hash, gửi email/SMS |
| `[BE]` | API `POST /api/v1/auth/reset-password` | Validate token, update password_hash, mark token as used, invalidate sessions |
| `[FE-Web]` | Trang `/forgot-password` | Form nhập email → thông báo đã gửi |
| `[FE-Web]` | Trang `/reset-password?token=xxx` | Form nhập mật khẩu mới + xác nhận |
| `[Mobile]` | Màn hình quên mật khẩu | Flow tương tự, dùng deeplink mở app từ email |

---

### FR-01.05 — Đổi mật khẩu 🟠 P1

**Actor:** A02~A07

**Mô tả:**  
Người dùng đã đăng nhập đổi mật khẩu. Yêu cầu nhập đúng mật khẩu cũ trước khi đặt mật khẩu mới.

**Đầu ra mong muốn:**
- Cập nhật `users.password_hash` mới
- Invalidate tất cả session/refresh token trên các thiết bị khác
- Gửi email thông báo "Mật khẩu đã được thay đổi"
- Ghi `audit_logs`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/auth/change-password` | Verify old password, update hash, invalidate other sessions |
| `[FE-Web]` / `[FE-Admin]` | Form đổi MK trong Settings | Input: old_password, new_password, confirm_password |
| `[Mobile]` | Màn hình đổi MK trong Profile | Tương tự |

---

### FR-01.06 — Quản lý Hồ sơ cá nhân 🟠 P1

**Actor:** A02~A07

**Mô tả:**  
Người dùng xem và chỉnh sửa thông tin cá nhân: họ tên, số điện thoại, ảnh đại diện. Khách hàng có thêm ngày sinh, giới tính.

**Đầu ra mong muốn:**
- Cập nhật thông tin trong `users` (full_name, phone, avatar_url)
- Cập nhật thông tin trong `customers` (date_of_birth, gender) cho khách hàng
- Upload avatar lên S3/MinIO, lưu URL

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/users/me` | Trả profile user + customer info (nếu có) |
| `[BE]` | API `PUT /api/v1/users/me` | Cập nhật thông tin |
| `[BE]` | API `POST /api/v1/upload/avatar` | Upload ảnh, resize, trả URL CDN |
| `[FE-Web]` | Trang `/account/profile` | Form chỉnh sửa hồ sơ, upload avatar preview |
| `[FE-Admin]` | Trang `/admin/profile` | Tương tự cho staff |
| `[Mobile]` | Tab Profile | Native image picker, form chỉnh sửa |

---

### FR-01.07 — Quản lý Người dùng & Phân quyền 🟠 P1

**Actor:** A07 (Admin)

**Mô tả:**  
Admin quản lý toàn bộ tài khoản người dùng: xem danh sách, tạo/sửa/khóa tài khoản, gán vai trò, cấp/thu hồi quyền cá nhân, phân công cửa hàng phụ trách.

**Đầu ra mong muốn:**
- Danh sách users phân trang, lọc theo role/status/store
- CRUD user (tạo tài khoản staff, gán role, set extra/revoked permissions)
- Gán user vào nhiều stores (bảng `user_stores`)
- Ghi tất cả thao tác phân quyền vào `audit_logs`
- Không cho phép xóa role có `is_system = TRUE`

**Quy tắc nghiệp vụ:**
1. Admin không thể tự hạ quyền chính mình
2. Chỉ Admin mới được gán vai trò Admin cho người khác
3. Khi thay đổi `extra_permissions` hoặc `revoked_permissions`, phải ghi `audit_logs` với old/new data

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/users` | Phân trang, filter, search |
| `[BE]` | API `POST /api/v1/admin/users` | Tạo tài khoản staff, gửi email kích hoạt |
| `[BE]` | API `PUT /api/v1/admin/users/:id` | Cập nhật role, status, permissions |
| `[BE]` | API `PUT /api/v1/admin/users/:id/permissions` | Cập nhật extra_permissions, revoked_permissions |
| `[BE]` | API `PUT /api/v1/admin/users/:id/stores` | Gán/gỡ cửa hàng phụ trách |
| `[BE]` | API `GET /api/v1/admin/roles` | Danh sách vai trò |
| `[BE]` | API `GET /api/v1/admin/permissions` | Danh mục 53 quyền (từ bảng `permissions`) |
| `[FE-Admin]` | Trang `/admin/users` | Bảng danh sách users, actions (edit, lock, unlock) |
| `[FE-Admin]` | Modal tạo/sửa user | Form thông tin, dropdown role, multi-select stores |
| `[FE-Admin]` | Tab phân quyền chi tiết | **Checkbox matrix** hiển thị tất cả permissions theo module, toggle extra/revoked |

---

### FR-01.08 — Đăng nhập bằng Google/Facebook 🟢 P3

**Actor:** A01 (Guest), A02 (Customer)

**Mô tả:**  
Khách hàng đăng nhập bằng tài khoản Google hoặc Facebook thông qua OAuth2. Nếu lần đầu, tự động tạo tài khoản.

**Đầu ra mong muốn:**
- Tạo/liên kết bản ghi `user_oauth_accounts`
- Nếu email OAuth trùng với email đã đăng ký → liên kết, không tạo mới
- Lưu `provider` và `provider_user_id`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/auth/oauth/google` | Verify Google ID token, create/link user |
| `[BE]` | API `POST /api/v1/auth/oauth/facebook` | Verify FB access token, create/link user |
| `[FE-Web]` | Nút "Đăng nhập bằng Google/Facebook" | Google Sign-In SDK, Facebook Login SDK |
| `[Mobile]` | Nút OAuth login | Native OAuth flow (Expo AuthSession) |

---

## FR-02: Mua hàng Online

> **Actors:** A01 (Guest), A02 (Customer)  
> **Bảng CSDL:** `products`, `product_variants`, `product_images`, `categories`, `brands`, `carts`, `cart_items`, `orders`, `order_items`, `wishlists`, `reviews`

---

### FR-02.01 — Xem danh sách sản phẩm 🔴 P0

**Actor:** A01, A02

**Mô tả:**  
Hiển thị danh sách sản phẩm theo danh mục, thương hiệu, hoặc trang chủ. Hỗ trợ phân trang (pagination), lọc (filter) và sắp xếp (sort).

**Đầu ra mong muốn:**
- Danh sách sản phẩm dạng grid/list với: ảnh chính, tên SP, giá (`base_price`), giá KM (`sale_price`), rating, badge (bestseller/new)
- Filter: theo danh mục, thương hiệu, khoảng giá, rating, tags
- Sort: giá tăng/giảm, mới nhất, bán chạy nhất, đánh giá cao
- Phân trang: 20 SP/trang, infinite scroll (mobile)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/products` | Query params: category_id, brand_id, min_price, max_price, rating, tags, sort_by, page, limit. Chỉ trả `is_active = TRUE` |
| `[BE]` | Elasticsearch indexing | Index products cho full-text search, autocomplete |
| `[FE-Web]` | Trang `/products`, `/category/:slug` | Product grid responsive (4 col desktop, 2 col mobile), sidebar filters, breadcrumb |
| `[FE-Web]` | SSR/ISR (Next.js) | Server-side rendering cho SEO, Incremental Static Regeneration |
| `[Mobile]` | Màn hình danh sách SP | FlatList/FlashList với infinite scroll, pull-to-refresh, filter bottom sheet |

---

### FR-02.02 — Tìm kiếm sản phẩm 🔴 P0

**Actor:** A01, A02

**Mô tả:**  
Tìm kiếm sản phẩm theo từ khóa (tên, thương hiệu, thành phần). Hỗ trợ autocomplete, gợi ý tìm kiếm, xử lý tiếng Việt có dấu/không dấu.

**Đầu ra mong muốn:**
- Kết quả tìm kiếm hiển thị tương tự danh sách SP
- Autocomplete dropdown khi gõ (debounce 300ms)
- Highlight keyword trong kết quả
- Hỗ trợ tìm kiếm fuzzy (VD: "son mac" → tìm được "Son MAC Lipstick")

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/products/search?q=xxx` | Elasticsearch query: multi-match trên name, brand, ingredients. Hỗ trợ Vietnamese analyzer |
| `[BE]` | API `GET /api/v1/products/suggest?q=xxx` | Autocomplete suggestions (max 8 items) |
| `[FE-Web]` | Search bar header | Autocomplete dropdown, search history (localStorage), popular searches |
| `[Mobile]` | Search screen | Search bar với voice search (P3), recent searches, trending |

---

### FR-02.03 — Xem chi tiết sản phẩm 🔴 P0

**Actor:** A01, A02

**Mô tả:**  
Hiển thị đầy đủ thông tin sản phẩm: gallery ảnh, mô tả, biến thể (chọn dung tích/màu), giá, tồn kho, thành phần, đánh giá, sản phẩm liên quan.

**Đầu ra mong muốn:**
- Gallery ảnh: swipe, zoom, ảnh thay đổi theo biến thể được chọn
- Selector biến thể: hiển thị option1/2/3 (VD: dung tích 30ml/50ml, màu sắc)
- Giá cập nhật theo biến thể: `product_variants.price`
- Tình trạng tồn kho: `Còn hàng` / `Hết hàng` / `Sắp hết` (dựa trên `stock_quantity`)
- Thành phần (ingredients): danh sách với highlight thành phần chính
- Tab đánh giá: rating tổng hợp + danh sách reviews
- Sản phẩm liên quan: cùng danh mục/thương hiệu

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/products/:slug` | Trả full detail: product + variants + images + ingredients + tags + reviews summary |
| `[BE]` | API `GET /api/v1/products/:id/related` | Sản phẩm cùng category/brand, exclude current (limit 8) |
| `[FE-Web]` | Trang `/product/:slug` | SSR cho SEO (JSON-LD structured data), image gallery, variant selector, add-to-cart CTA |
| `[FE-Web]` | SEO metadata | `<title>`, `<meta description>`, Open Graph, canonical URL |
| `[Mobile]` | Màn hình chi tiết SP | ScrollView, image carousel, variant picker, sticky bottom CTA bar |

---

### FR-02.04 — Thêm vào giỏ hàng 🔴 P0

**Actor:** A02 (Customer, phải đăng nhập trên Web/App). A01 (Guest — lưu giỏ tạm bằng session)

**Mô tả:**  
Thêm một biến thể sản phẩm vào giỏ hàng với số lượng mong muốn. Kiểm tra tồn kho trước khi cho phép thêm.

**Đầu ra mong muốn:**
- Tạo/cập nhật bản ghi `cart_items` (nếu đã có biến thể trong giỏ → tăng quantity)
- Badge số lượng trên icon giỏ hàng cập nhật realtime
- Thông báo toast "Đã thêm vào giỏ"
- Nếu hết hàng → disable nút, hiển thị "Hết hàng"

**Quy tắc nghiệp vụ:**
1. Kiểm tra `product_variants.stock_quantity > 0` (hoặc `inventory.available_quantity > 0` cho multi-store)
2. Quantity tối đa = min(stock_quantity, 99)
3. Guest cart lưu bằng session_id; khi đăng nhập → merge vào cart của customer

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/cart/items` | Body: `{ product_variant_id, quantity }`. Validate stock, upsert cart_item |
| `[BE]` | API `POST /api/v1/cart/merge` | Merge guest cart vào customer cart khi login |
| `[FE-Web]` | Nút "Thêm vào giỏ" | Variant phải được chọn trước, quantity input, toast notification |
| `[FE-Web]` | Mini cart dropdown | Hiển thị khi hover/click icon giỏ hàng ở header |
| `[Mobile]` | Nút "Thêm vào giỏ" | Haptic feedback, badge animation, bottom sheet confirm |

---

### FR-02.05 — Quản lý giỏ hàng 🔴 P0

**Actor:** A02 (Customer)

**Mô tả:**  
Xem danh sách sản phẩm trong giỏ, thay đổi số lượng, xóa sản phẩm, xem tổng tiền tạm tính.

**Đầu ra mong muốn:**
- Danh sách items: ảnh, tên SP + biến thể, đơn giá, quantity (+/-), thành tiền, nút xóa
- Tổng tiền tạm tính (subtotal)
- Nút "Tiến hành đặt hàng" → chuyển sang checkout
- Cập nhật realtime khi thay đổi quantity

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/cart` | Trả cart + items + product info (name, image, price, stock) |
| `[BE]` | API `PUT /api/v1/cart/items/:id` | Cập nhật quantity |
| `[BE]` | API `DELETE /api/v1/cart/items/:id` | Xóa item |
| `[FE-Web]` | Trang `/cart` | Bảng danh sách, stepper quantity, summary sidebar |
| `[Mobile]` | Màn hình giỏ hàng | SwipeToDelete, inline quantity stepper |

---

### FR-02.06 — Đặt hàng (Checkout) 🔴 P0

**Actor:** A02 (Customer)

**Mô tả:**  
Khách hàng hoàn tất đơn hàng: chọn/thêm địa chỉ giao hàng, chọn phương thức thanh toán, áp mã giảm giá, sử dụng điểm thưởng, xác nhận đặt hàng.

**Đầu ra mong muốn:**
- Tạo bản ghi `orders` với `order_type = 'ONLINE'`, `status = 'PENDING'`
- Tạo `order_items` với snapshot giá bán (`unit_price`) và giá vốn (`unit_cost`)
- Áp dụng coupon → tạo `coupon_usage`, tăng `coupons.used_count`
- Áp dụng loyalty points → trừ `customers.total_points`, tạo `loyalty_points_transactions` type `REDEEM`
- Reserve inventory: tăng `inventory.reserved_quantity`
- Xóa cart items đã checkout
- Gửi email xác nhận đơn hàng + push notification

**Quy tắc nghiệp vụ:**
1. Double-check tồn kho (`available_quantity >= ordered_quantity`) ngay trước khi tạo đơn
2. Mỗi đơn chỉ áp dụng tối đa 1 coupon
3. Điểm thưởng sử dụng không được vượt quá `customers.total_points`
4. Quy đổi điểm: 1 điểm = 1.000 VNĐ (cấu hình trong `settings`)
5. `total_amount = subtotal - discount_amount - points_discount + shipping_fee + tax_amount`
6. Đơn PENDING hơn 30 phút không thanh toán → auto cancel, hoàn reserved inventory

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/orders` | Transaction: validate stock → create order → create order_items → reserve inventory → apply coupon → apply points → clear cart → trigger notification |
| `[BE]` | API `POST /api/v1/orders/preview` | Preview order: tính toán giá, áp coupon/points mà chưa tạo đơn (hiển thị cho user confirm) |
| `[BE]` | Cron Job: Cancel expired orders | Mỗi 5 phút, scan đơn `PENDING` > 30 phút → cancel, release reserved |
| `[FE-Web]` | Trang `/checkout` | Step 1: Địa chỉ → Step 2: Thanh toán → Step 3: Xác nhận. Input coupon code, slider điểm thưởng, order summary |
| `[FE-Web]` | Trang `/order-success/:orderNumber` | Cảm ơn + chi tiết đơn hàng |
| `[Mobile]` | Flow checkout | Multi-step form, saved addresses dropdown, payment method selector |

---

### FR-02.07 — Thêm vào Wishlist 🟡 P2

**Actor:** A02 (Customer)

**Mô tả:**  
Khách hàng lưu sản phẩm yêu thích để xem lại sau. Toggle trái tim trên thẻ sản phẩm.

**Đầu ra mong muốn:**
- Tạo/xóa bản ghi `wishlists` (toggle)
- Trang wishlist cá nhân hiển thị danh sách SP đã lưu
- Nút "Thêm vào giỏ" nhanh từ wishlist

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/wishlists/toggle` | Toggle: thêm nếu chưa có, xóa nếu đã có |
| `[BE]` | API `GET /api/v1/wishlists` | Danh sách SP trong wishlist (phân trang) |
| `[FE-Web]` | Icon trái tim trên product card | Filled/outlined toggle, login required |
| `[FE-Web]` | Trang `/account/wishlist` | Grid SP yêu thích, nút quick add-to-cart |
| `[Mobile]` | Tab Wishlist | Tương tự, swipe to remove |

---

### FR-02.08 — Đánh giá sản phẩm 🟡 P2

**Actor:** A02 (Customer)

**Mô tả:**  
Khách hàng đã mua sản phẩm có thể viết đánh giá (rating 1-5 sao + nội dung). Đánh giá cần kiểm duyệt trước khi hiển thị công khai. Admin có thể phản hồi.

**Đầu ra mong muốn:**
- Tạo bản ghi `reviews` với `is_verified_purchase = TRUE` (nếu tìm thấy order_item tương ứng)
- `is_approved = FALSE` mặc định → Admin duyệt
- Sau khi duyệt → cập nhật `products.avg_rating` và `products.total_reviews`

**Quy tắc nghiệp vụ:**
1. Mỗi customer chỉ đánh giá 1 lần cho mỗi product (UNIQUE customer_id + product_id)
2. Chỉ được đánh giá nếu đã mua (có order_item với `orders.status = 'COMPLETED'`)
3. Rating 1-5, title optional, content optional

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/reviews` | Validate purchase, create review |
| `[BE]` | API `GET /api/v1/products/:id/reviews` | Phân trang, filter by rating, sort by newest |
| `[BE]` | API `PUT /api/v1/admin/reviews/:id/approve` | Admin duyệt/từ chối, cập nhật avg_rating |
| `[BE]` | API `PUT /api/v1/admin/reviews/:id/reply` | Admin phản hồi review |
| `[FE-Web]` | Section đánh giá trong trang chi tiết SP | Hiển thị rating bars, danh sách reviews, nút "Viết đánh giá" |
| `[FE-Admin]` | Trang quản lý đánh giá | Bảng reviews chờ duyệt, nút approve/reject/reply |
| `[Mobile]` | Màn hình viết đánh giá | Star rating picker, text input, upload ảnh review (P3) |

---

## FR-03: Bán hàng POS

> **Actors:** A03 (Sales Staff)  
> **Bảng CSDL:** `pos_sessions`, `orders`, `order_items`, `payments`, `inventory`, `order_item_batches`

---

### FR-03.01 — Mở ca làm việc 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Nhân viên bán hàng mở ca trước khi bắt đầu bán. Nhập số tiền mặt đầu ca (opening_cash). Mỗi cửa hàng chỉ cho phép 1 ca OPEN tại 1 thời điểm.

**Đầu ra mong muốn:**
- Tạo bản ghi `pos_sessions` với `status = 'OPEN'`
- Lưu `cashier_id`, `store_id`, `opening_cash`
- Sinh `session_code` tự động (VD: `POS-CH01-20260919-01`)

**Quy tắc nghiệp vụ:**
1. Không mở ca mới nếu đã có ca `OPEN` tại cùng store
2. Yêu cầu quyền `PAYMENT_COLLECT` (bit 16)
3. `opening_cash` phải >= 0

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/pos/sessions/open` | Check no OPEN session for store, create session |
| `[FE-Admin]` | Modal mở ca | Input opening_cash (number), xác nhận bắt đầu ca |

---

### FR-03.02 — Tạo đơn hàng POS 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Nhân viên tìm/quét barcode sản phẩm, thêm vào đơn POS, áp dụng khuyến mãi/voucher/điểm khách hàng, tính tổng tiền. Tra cứu khách hàng bằng SĐT để tích điểm.

**Đầu ra mong muốn:**
- Tạo `orders` với `order_type = 'POS'`, `pos_session_id`, `sales_staff_id`
- Tạo `order_items` với snapshot giá vốn (`unit_cost`)
- Phân bổ tồn kho theo lô FEFO: tạo `order_item_batches`
- Trừ `inventory.quantity` và `batches.quantity` tức thì (POS = bán xong trừ luôn)
- Cập nhật `product_variants.stock_quantity` (cache)
- Tạo `commissions` cho nhân viên bán

**Quy tắc nghiệp vụ:**
1. Sản phẩm quét barcode → match `product_variants.barcode`
2. Tìm kiếm bằng tên/SKU nếu không có barcode
3. Tồn kho kiểm tra tại `inventory` WHERE `store_id` = cửa hàng đang bán
4. Áp dụng FEFO (lô sắp hết hạn xuất trước)
5. Tra cứu khách hàng: nhập SĐT → tìm trong `customers.phone`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/pos/products/scan?barcode=xxx` | Tìm biến thể theo barcode |
| `[BE]` | API `GET /api/v1/pos/products/search?q=xxx` | Tìm SP theo tên/SKU |
| `[BE]` | API `GET /api/v1/pos/customers/lookup?phone=xxx` | Tra cứu KH theo SĐT |
| `[BE]` | API `POST /api/v1/pos/orders` | Transaction: create order → allocate batches FEFO → deduct inventory → create commission |
| `[FE-Admin]` | Trang POS `/admin/pos` | **Giao diện POS full-screen**: thanh tìm/quét SP, danh sách items đang bán, panel tổng tiền, tra cứu KH, nút áp KM/voucher/điểm, nút thanh toán |
| `[FE-Admin]` | Quét barcode | Webcam barcode scanner (QuaggaJS/html5-qrcode) |

---

### FR-03.03 — Thu tiền 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Sau khi tạo đơn POS, nhân viên chọn phương thức thanh toán và hoàn tất thu tiền. Hỗ trợ split payment (chia thanh toán: một phần tiền mặt + một phần chuyển khoản).

**Đầu ra mong muốn:**
- Tạo 1 hoặc nhiều bản ghi `payments` cho đơn hàng
- `payment_method`: `CASH`, `CARD`, `TRANSFER`
- Cập nhật `orders.status = 'COMPLETED'` (POS = completed ngay)
- Tăng `pos_sessions.system_cash` nếu thanh toán bằng `CASH`
- Tích điểm cho khách hàng (nếu có)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/pos/orders/:id/pay` | Body: `payments: [{method, amount}]`. Validate total >= order total, create payment records |
| `[BE]` | Loyalty service | Tính điểm thưởng: `total_amount * point_rate * tier_multiplier`, tạo `loyalty_points_transactions` |
| `[FE-Admin]` | Modal thanh toán POS | Selector phương thức, input số tiền, tính tiền thừa (nếu CASH), nút xác nhận |

---

### FR-03.04 — In hóa đơn 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
In hóa đơn bán hàng ngay sau khi thu tiền (giấy nhiệt 80mm hoặc PDF). Thông tin hóa đơn bao gồm: tên cửa hàng, ngày giờ, danh sách SP, tổng tiền, phương thức TT, mã đơn hàng.

**Đầu ra mong muốn:**
- Sinh PDF hoặc ESC/POS command (máy in nhiệt)
- Nội dung: header cửa hàng, danh sách SP (tên, SL, đơn giá, thành tiền), subtotal, discount, total, payment method, change, QR tra cứu
- Tùy chọn gửi hóa đơn qua email/SMS cho khách

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/orders/:id/receipt` | Trả receipt data (JSON) hoặc PDF stream |
| `[BE]` | Service: generate receipt PDF | Template receipt, render PDF (pdfkit/puppeteer) |
| `[FE-Admin]` | In hóa đơn POS | `window.print()` hoặc Web Serial API cho máy in nhiệt, nút "Gửi email" |

---

### FR-03.05 — Xem tồn kho cửa hàng 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Nhân viên xem tồn kho tại cửa hàng mình (chỉ cửa hàng đang trực). Tìm kiếm nhanh theo tên/SKU/barcode.

**Đầu ra mong muốn:**
- Danh sách biến thể: tên SP, biến thể, SKU, tồn kho, trạng thái (đủ/sắp hết/hết)
- Không hiển thị dữ liệu cửa hàng khác (data_scope = STORE)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/pos/inventory?store_id=xxx&q=xxx` | Filter theo store_id của user, search, phân trang |
| `[FE-Admin]` | Tab tồn kho trong POS | Bảng tìm kiếm nhanh, hiển thị badge cảnh báo |

---

### FR-03.06 — Đóng ca làm việc 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Kết thúc ca bán hàng, nhập tiền mặt đếm được thực tế, hệ thống tính chênh lệch. Quản lý/Kế toán duyệt chốt ca.

**Đầu ra mong muốn:**
- Cập nhật `pos_sessions`: `counted_cash`, `difference` (= counted_cash - opening_cash - system_cash), `status = 'CLOSED'`
- Hiển thị tóm tắt ca: tổng đơn, tổng doanh thu, tiền mặt/thẻ/chuyển khoản, chênh lệch
- Sau khi Manager duyệt → `status = 'RECONCILED'`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/pos/sessions/:id/close` | Input: counted_cash. Calculate difference, update status |
| `[BE]` | API `POST /api/v1/pos/sessions/:id/reconcile` | Manager/Admin duyệt chốt ca (cần quyền `PAYMENT_RECONCILE`) |
| `[FE-Admin]` | Modal đóng ca | Tóm tắt doanh thu ca, input counted_cash, hiển thị chênh lệch, textarea ghi chú |
| `[FE-Admin]` | Trang danh sách ca `/admin/pos/sessions` | Bảng lịch sử ca, filter by store/date, action reconcile |

---

## FR-04: Quản lý Đơn hàng

> **Actors:** A02 (Customer), A03 (Sales), A05 (Manager), A07 (Admin)  
> **Bảng CSDL:** `orders`, `order_items`, `order_status_history`, `shipments`, `return_orders`, `return_order_items`, `refunds`

---

### FR-04.01 — Xem danh sách đơn hàng 🔴 P0

**Actor:** A02 (xem đơn của mình), A03~A07 (xem đơn theo phạm vi)

**Mô tả:**  
Hiển thị danh sách đơn hàng theo vai trò và phạm vi dữ liệu (`data_scope`). Customer chỉ thấy đơn của mình. Staff thấy đơn của cửa hàng. Admin thấy tất cả.

**Đầu ra mong muốn:**
- Danh sách: mã đơn, ngày tạo, tổng tiền, trạng thái, loại (ONLINE/POS), tên KH
- Filter: theo status, order_type, date range, store
- Sort: mới nhất, cũ nhất, giá trị cao nhất

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/orders` | Auto-filter by data_scope, phân trang |
| `[BE]` | API `GET /api/v1/customers/me/orders` | Customer xem đơn của mình |
| `[FE-Web]` | Trang `/account/orders` | Danh sách đơn, tab filter theo status |
| `[FE-Admin]` | Trang `/admin/orders` | Bảng đơn hàng, advanced filter, export Excel |
| `[Mobile]` | Tab "Đơn hàng" | Horizontal tab status filter, order cards |

---

### FR-04.02 — Xem chi tiết đơn hàng 🔴 P0

**Actor:** A02, A03~A07

**Mô tả:**  
Xem đầy đủ thông tin một đơn hàng: danh sách SP, địa chỉ GH, phương thức TT, timeline trạng thái, thông tin vận đơn.

**Đầu ra mong muốn:**
- Thông tin đơn: order_number, ngày tạo, trạng thái, loại
- Danh sách SP: ảnh, tên, biến thể, SL, đơn giá, thành tiền
- Tóm tắt giá: subtotal, discount, shipping_fee, tax, total
- Địa chỉ giao hàng (nếu ONLINE)
- Timeline trạng thái (từ `order_status_history`)
- Thông tin vận đơn: carrier, tracking code, link tracking (nếu có)
- Thông tin thanh toán: phương thức, trạng thái

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/orders/:id` | Full order detail: order + items + payments + shipments + status_history |
| `[FE-Web]` | Trang `/account/orders/:orderNumber` | Order detail page, timeline, tracking link |
| `[FE-Admin]` | Trang `/admin/orders/:id` | Chi tiết + action buttons (xác nhận, cập nhật, hủy) |
| `[Mobile]` | Màn hình chi tiết đơn | ScrollView, status stepper, call/chat CTA |

---

### FR-04.03 — Xác nhận đơn hàng 🔴 P0

**Actor:** A03 (Sales), A05 (Manager), A07 (Admin)

**Mô tả:**  
Xác nhận đơn hàng Online từ `PENDING` → `CONFIRMED`. Kiểm tra tồn kho thực tế trước khi xác nhận.

**Đầu ra mong muốn:**
- Cập nhật `orders.status = 'CONFIRMED'`
- Tạo bản ghi `order_status_history`
- Gửi notification + email cho khách hàng

**Quy tắc nghiệp vụ:**
1. Chỉ đơn `PENDING` mới xác nhận được
2. Kiểm tra `inventory.available_quantity >= order_items.quantity` tại `orders.store_id`
3. Yêu cầu quyền `ORDER_STATUS_UPDATE` (bit 14)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/admin/orders/:id/confirm` | Validate stock, update status, create history, send notification |
| `[FE-Admin]` | Nút "Xác nhận" trong chi tiết đơn | Confirmation modal, hiển thị warning nếu tồn kho thấp |

---

### FR-04.04 — Cập nhật trạng thái đơn hàng 🔴 P0

**Actor:** A03, A05, A07

**Mô tả:**  
Cập nhật tiến trình đơn hàng: `CONFIRMED` → `PROCESSING` → `SHIPPING` → `DELIVERED` → `COMPLETED`. Mỗi lần cập nhật ghi lịch sử và gửi thông báo cho khách.

**Đầu ra mong muốn:**
- Cập nhật `orders.status`
- Tạo `order_status_history` (ghi user, note, timestamp)
- Gửi notification & push notification cho khách
- Khi `DELIVERED`: nhân viên giao hàng xác nhận
- Khi `COMPLETED`: tích điểm loyalty cho khách

**Quy tắc nghiệp vụ:**
1. Trạng thái chỉ chuyển theo thứ tự hợp lệ (state machine)
2. Không được quay lại trạng thái trước
3. `COMPLETED` trigger: tích điểm + tạo commission + cập nhật `customers.total_spent/total_orders`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/admin/orders/:id/status` | State machine validation, side effects per status |
| `[BE]` | Event: order.completed | Trigger loyalty points, commission calculation |
| `[FE-Admin]` | Dropdown trạng thái trong chi tiết đơn | Chỉ hiển thị trạng thái hợp lệ kế tiếp |

---

### FR-04.05 — Hủy đơn hàng 🔴 P0

**Actor:** A02 (Customer — chỉ khi PENDING), A05 (Manager), A07 (Admin)

**Mô tả:**  
Hủy đơn hàng. Customer chỉ hủy được đơn `PENDING`. Manager/Admin hủy được đơn ở trạng thái cao hơn (kèm lý do).

**Đầu ra mong muốn:**
- Cập nhật `orders.status = 'CANCELLED'`
- Hoàn lại `inventory.reserved_quantity` (nếu đơn Online)
- Hoàn lại `customers.total_points` (nếu đã dùng điểm)
- Hoàn lại coupon usage (`coupons.used_count -= 1`)
- Tạo `refunds` nếu đã thanh toán
- Ghi `order_status_history` với lý do hủy

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/orders/:id/cancel` | Validate cancellation rules, release resources, create refund if needed |
| `[FE-Web]` | Nút "Hủy đơn" trong chi tiết đơn | Chỉ hiển thị khi PENDING, modal nhập lý do |
| `[FE-Admin]` | Nút "Hủy đơn" | Hiển thị cho Manager/Admin ở nhiều trạng thái hơn |
| `[Mobile]` | Nút hủy đơn | Bottom sheet xác nhận, textarea lý do |

---

### FR-04.06 — Xử lý hoàn trả (RMA) 🟠 P1

**Actor:** A02 (yêu cầu), A05 (duyệt & xử lý), A07 (Admin)

**Mô tả:**  
Khách hàng yêu cầu đổi/trả hàng. Nhân viên tiếp nhận, thẩm định chất lượng, quyết định chấp nhận/từ chối. Hàng `RESALEABLE` nhập lại kho, hàng `DAMAGED` ghi nhận hủy.

**Đầu ra mong muốn:**
- Tạo `return_orders` với flow: `REQUESTED → APPROVED → RECEIVED → INSPECTED → COMPLETED/REJECTED`
- Tạo `return_order_items` với `condition` (RESALEABLE / DAMAGED)
- Nếu RESALEABLE: nhập lại `inventory`, `batches`
- Tạo `refunds` nếu `return_type = 'REFUND'`
- Tạo `inventory_transactions` type `RETURN`

**Quy tắc nghiệp vụ:**
1. Chỉ đổi trả đơn `COMPLETED` trong vòng 7 ngày
2. Lý do hợp lệ: `WRONG_ITEM`, `DEFECTIVE`, `EXPIRED`, `ALLERGIC`, `CUSTOMER_CHANGE_MIND`
3. Mỹ phẩm đã khui nắp → condition = DAMAGED (không nhập lại bán)
4. Hoàn tiền tối đa = giá trị dòng hàng đó trong đơn gốc

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/returns` | Customer tạo yêu cầu đổi trả |
| `[BE]` | API `PUT /api/v1/admin/returns/:id/approve` | Manager duyệt |
| `[BE]` | API `PUT /api/v1/admin/returns/:id/inspect` | Thẩm định + phân loại condition + nhập kho nếu resaleable |
| `[BE]` | API `PUT /api/v1/admin/returns/:id/complete` | Hoàn tất + tạo refund |
| `[FE-Web]` | Trang yêu cầu đổi trả | Chọn SP cần trả, lý do, upload ảnh |
| `[FE-Admin]` | Trang quản lý RMA `/admin/returns` | Bảng danh sách, flow xử lý từng bước |
| `[Mobile]` | Màn hình yêu cầu đổi trả | Tương tự FE-Web |

---

### FR-04.07 — Tạo vận đơn giao hàng 🟠 P1

**Actor:** A03 (Sales), A05 (Manager)

**Mô tả:**  
Tạo vận đơn cho đơn hàng Online, tích hợp API hãng vận chuyển (GHN, GHTK, Viettel Post). In phiếu giao hàng.

**Đầu ra mong muốn:**
- Tạo bản ghi `shipments` với `carrier_code`, `tracking_code`
- Gọi API 3PL để tạo vận đơn, nhận tracking code
- Lưu `shipping_label_url` (PDF in dán lên kiện)
- Cập nhật `orders.status = 'SHIPPING'`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/orders/:id/shipments` | Gọi GHN/GHTK API, tạo shipment record |
| `[BE]` | 3PL Integration Service | Abstract adapter cho từng hãng vận chuyển |
| `[BE]` | Webhook endpoint `/api/v1/webhooks/shipments` | Nhận cập nhật trạng thái từ hãng vận chuyển |
| `[FE-Admin]` | Modal tạo vận đơn | Chọn hãng VC, xem cước phí, xác nhận, in phiếu |

---

### FR-04.08 — Theo dõi giao hàng 🟠 P1

**Actor:** A02 (Customer)

**Mô tả:**  
Khách hàng theo dõi trạng thái giao hàng realtime.

**Đầu ra mong muốn:**
- Hiển thị trạng thái shipment: timeline các mốc (Đã giao cho shipper → Đang giao → Giao thành công)
- Link tracking sang trang web hãng vận chuyển
- Push notification khi trạng thái thay đổi

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/orders/:id/tracking` | Trả shipment info + status history |
| `[FE-Web]` | Section tracking trong chi tiết đơn | Timeline + link tracking ngoài |
| `[Mobile]` | Push notification | Firebase Cloud Messaging khi shipment status change |

---

## FR-05: Quản lý Kho hàng

> **Actors:** A04 (Warehouse), A05 (Manager), A07 (Admin)  
> **Bảng CSDL:** `stores`, `inventory`, `inventory_transactions`, `batches`, `inventory_transfers`, `inventory_transfer_items`, `stocktakes`, `stocktake_items`

---

### FR-05.01 — Nhập kho từ NCC 🔴 P0

**Actor:** A04, A07

**Mô tả:**  
Nhập hàng hóa vào kho từ nhà cung cấp (dựa trên Purchase Order). Ghi nhận lô hàng, hạn sử dụng, kiểm tra chất lượng.

**Đầu ra mong muốn:**
- Cập nhật `purchase_order_items.quantity_received`
- Tạo/cập nhật `batches` (batch_number, expiry_date, supplier_id)
- Tăng `inventory.quantity`
- Cập nhật `product_variants.cost_price` (bình quân gia quyền)
- Tạo `inventory_transactions` type `IN`
- Cập nhật `product_variants.stock_quantity` (cache)

**Quy tắc nghiệp vụ:**
1. `quantity_received <= quantity_ordered`
2. Nếu nhận đủ → PO status = `RECEIVED`, nhận 1 phần → `PARTIALLY_RECEIVED`
3. Cost price tính: `(tồn * giá cũ + nhập * giá nhập) / (tồn + nhập)`
4. `inventory.quantity` phải bằng tổng `batches.quantity` (invariant)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/inventory/receive` | Transaction: update PO → create/update batches → update inventory → update cost_price → create transactions |
| `[FE-Admin]` | Trang nhập kho `/admin/inventory/receive` | Chọn PO, nhập SL thực nhận từng item, nhập batch_number + expiry_date, notes chất lượng |

---

### FR-05.02 — Xuất kho 🔴 P0

**Actor:** A04, A07

**Mô tả:**  
Xuất hàng khỏi kho (cho đơn hàng online, hủy hàng hết hạn, mất mát). Tự động khi đơn POS completed hoặc thủ công bởi NV kho.

**Đầu ra mong muốn:**
- Giảm `inventory.quantity` và `batches.quantity`
- Tạo `inventory_transactions` type `OUT`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | Service inventory deduction | Tự động khi order completed (POS) hoặc shipment packed (Online) |
| `[BE]` | API `POST /api/v1/admin/inventory/adjust` | Xuất thủ công với lý do |
| `[FE-Admin]` | Form xuất kho thủ công | Chọn SP, SL, lô, lý do |

---

### FR-05.03 — Xem tồn kho 🔴 P0

**Actor:** A04, A05, A07

**Mô tả:**  
Xem tồn kho theo cửa hàng, theo biến thể. Hỗ trợ tìm kiếm, lọc, export.

**Đầu ra mong muốn:**
- Bảng: SP, biến thể, SKU, tồn (quantity), đã giữ chỗ (reserved), khả dụng (available), min threshold, trạng thái
- Filter: theo store, category, brand, stock status (low/out/normal)
- Export Excel

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/inventory` | Filter by store (auto by data_scope), phân trang, search |
| `[FE-Admin]` | Trang `/admin/inventory` | Table sortable, badge cảnh báo, export button |

---

### FR-05.04 — Chuyển kho giữa các cửa hàng 🟠 P1

**Actor:** A04, A05, A07

**Mô tả:**  
Điều chuyển hàng hóa giữa các chi nhánh. Flow: `DRAFT → REQUESTED → APPROVED → SHIPPED → RECEIVED`.

**Đầu ra mong muốn:**
- Tạo `inventory_transfers` và `inventory_transfer_items`
- Khi SHIPPED: trừ `inventory` + `batches` tại kho xuất
- Khi RECEIVED: cộng `inventory` + `batches` tại kho nhận, ghi nhận chênh lệch

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/transfers` | Create, approve, ship, receive, cancel |
| `[FE-Admin]` | Trang quản lý chuyển kho | Tạo phiếu, chọn SP + SL, flow duyệt, nhận hàng + ghi chênh lệch |

---

### FR-05.05 — Kiểm kê tồn kho 🟠 P1

**Actor:** A04, A05, A07

**Mô tả:**  
Kiểm kê (stocktake) định kỳ: đếm thực tế, so sánh với hệ thống, điều chỉnh tồn kho.

**Đầu ra mong muốn:**
- Tạo `stocktakes` và `stocktake_items`
- Tính `variance_quantity` = actual - system
- Khi COMPLETED: điều chỉnh `inventory.quantity` và `batches.quantity`, tạo `inventory_transactions` type `ADJUST`
- Tính `total_variance_value` = Σ(variance * unit_cost)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/stocktakes` | Create, add items, complete (adjust inventory) |
| `[FE-Admin]` | Trang kiểm kê `/admin/stocktakes` | Tạo phiếu, nhập SL thực tế, highlight chênh lệch, nút chốt cân bằng |

---

### FR-05.06 — Quản lý lô hàng & Hạn sử dụng 🟠 P1

**Actor:** A04, A07

**Mô tả:**  
Xem danh sách lô hàng, theo dõi hạn sử dụng (HSD). Cảnh báo sản phẩm sắp hết hạn.

**Đầu ra mong muốn:**
- Danh sách batches: batch_number, SP, SL, HSD, supplier, store
- Filter: sắp hết hạn (< 30/60/90 ngày), đã hết hạn, theo store
- Khóa lô (`is_active = FALSE`) nếu phát hiện lỗi chất lượng

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/batches` | Filter, phân trang |
| `[BE]` | Cron: expiry alert | Daily scan batches sắp hết hạn → gửi notification |
| `[FE-Admin]` | Trang lô hàng `/admin/batches` | Table, highlight hàng sắp/đã hết hạn, nút khóa lô |

---

### FR-05.07 — Cảnh báo tồn kho thấp 🟠 P1

**Actor:** A04, A05, A07

**Mô tả:**  
Tự động cảnh báo khi tồn kho dưới ngưỡng `min_quantity`. Gửi notification cho NV kho và Manager.

**Đầu ra mong muốn:**
- Dashboard cảnh báo: danh sách SP dưới ngưỡng
- Push notification / in-app notification cho vai trò liên quan
- Gợi ý tạo PO nhập hàng bổ sung

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | Cron/Event: low stock alert | Khi inventory.quantity < min_quantity → create notification |
| `[FE-Admin]` | Widget cảnh báo trên Dashboard | Badge đỏ, danh sách SP cần nhập |

---

## FR-06: Quản lý Sản phẩm & Danh mục

> **Actors:** A07 (Admin)  
> **Bảng CSDL:** `products`, `product_variants`, `product_images`, `product_ingredients`, `product_tags`, `categories`, `brands`

---

### FR-06.01 — CRUD Sản phẩm 🔴 P0

**Actor:** A07

**Mô tả:**  
Tạo, sửa, xem, xóa mềm (ẩn) sản phẩm. Bao gồm thông tin cơ bản, mô tả, hình ảnh, SEO metadata.

**Đầu ra mong muốn:**
- CRUD đầy đủ trên bảng `products`
- Upload multiple images → `product_images`
- Soft delete: `is_active = FALSE`
- Slug tự sinh từ tên (Vietnamese slug)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/products` | Create, Read (list + detail), Update, Soft-delete |
| `[BE]` | Image upload service | Multi-file upload S3, resize, generate thumbnail |
| `[FE-Admin]` | Trang `/admin/products` | Table danh sách, search, filter, bulk actions |
| `[FE-Admin]` | Form tạo/sửa SP | Rich text editor (description), image dropzone, category/brand select, SEO fields |

---

### FR-06.02 — Quản lý Biến thể sản phẩm 🔴 P0

**Actor:** A07

**Mô tả:**  
Tạo và quản lý biến thể (variants) cho sản phẩm. Mỗi SP có tối đa 3 thuộc tính tùy chỉnh (VD: Dung tích, Màu sắc, Quy cách). Mỗi biến thể có SKU, giá, barcode riêng.

**Đầu ra mong muốn:**
- Thiết lập `option1_name`, `option2_name`, `option3_name` tại `products`
- Tạo các `product_variants` với `option1_value`, `option2_value`, `option3_value`
- Mỗi variant có `sku` (UNIQUE), `price`, `cost_price`, `barcode`, `weight`, `unit`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/products/:id/variants` | Tạo variant, validate unique combo |
| `[BE]` | API `PUT /api/v1/admin/variants/:id` | Cập nhật giá, SKU, barcode |
| `[FE-Admin]` | Variant manager trong form SP | Dynamic form: thêm option names → generate variant matrix → edit giá/SKU từng biến thể |

---

### FR-06.03 — Quản lý Danh mục sản phẩm 🔴 P0

**Actor:** A07

**Mô tả:**  
CRUD danh mục sản phẩm. Hỗ trợ phân cấp cha-con (VD: Chăm sóc da → Kem chống nắng).

**Đầu ra mong muốn:**
- CRUD `categories` với `parent_id` (tree structure)
- Hiển thị dạng cây
- Sắp xếp thứ tự (`sort_order`)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/categories` | Support parent_id, tree query |
| `[BE]` | API `GET /api/v1/categories/tree` | Public API trả tree structure cho frontend |
| `[FE-Admin]` | Trang `/admin/categories` | Tree view drag-and-drop, inline edit |

---

### FR-06.04 — Quản lý Thương hiệu 🔴 P0

**Actor:** A07

**Mô tả:**  
CRUD thương hiệu mỹ phẩm (L'Oréal, Innisfree, MAC, ...). Bao gồm logo, banner, quốc gia xuất xứ.

**Đầu ra mong muốn:**
- CRUD `brands`
- Upload logo + banner
- Trang thương hiệu hiển thị trên website

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/brands` | Full CRUD |
| `[FE-Admin]` | Trang `/admin/brands` | Table + form modal, image upload |
| `[FE-Web]` | Trang `/brand/:slug` | Landing page thương hiệu, danh sách SP của brand |

---

### FR-06.05 — Quản lý Tags & Labels 🟡 P2

**Actor:** A07

**Mô tả:**  
Gắn tags cho sản phẩm: `bestseller`, `new`, `organic`, `cruelty-free`, `hot-deal`.

**Đầu ra mong muốn:**
- CRUD `product_tags`
- Hiển thị badge trên product card (FE-Web + Mobile)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API tag management trong product CRUD | Thêm/xóa tags khi tạo/sửa SP |
| `[FE-Admin]` | Tag input (autocomplete) trong form SP | Multi-tag input |

---

### FR-06.06 — Import sản phẩm hàng loạt 🟡 P2

**Actor:** A07

**Mô tả:**  
Import danh sách sản phẩm từ file Excel/CSV. Validate dữ liệu trước khi import.

**Đầu ra mong muốn:**
- Upload file → parse & validate → preview → confirm import
- Báo lỗi chi tiết từng dòng (dòng nào lỗi, lỗi gì)
- Import thành công: tạo products + variants

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/products/import` | Parse Excel (xlsx), validate, bulk upsert |
| `[BE]` | API `GET /api/v1/admin/products/import-template` | Download file template Excel mẫu |
| `[FE-Admin]` | Trang import | Upload dropzone, preview table, error highlighting, confirm button |

---

### FR-06.07 — Quản lý SEO Metadata 🟡 P2

**Actor:** A07

**Mô tả:**  
Thiết lập meta_title, meta_description, meta_keywords cho sản phẩm, danh mục, thương hiệu, blog.

**Đầu ra mong muốn:**
- Các trường SEO được lưu trong bảng tương ứng
- Preview SEO snippet (Google search result preview)
- Auto-generate SEO nếu để trống

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[FE-Admin]` | SEO section trong form tạo/sửa | Input meta_title (max 60 chars), textarea meta_description (max 160 chars), SEO preview component |
| `[FE-Web]` | Next.js Head component | Render `<meta>` tags, JSON-LD structured data |

---

## FR-07: Thanh toán

> **Actors:** A02 (Customer), A03 (Sales), A06 (Accountant)  
> **Bảng CSDL:** `payments`, `refunds`, `pos_sessions`

---

### FR-07.01 — Thanh toán Online 🔴 P0

**Actor:** A02 (Customer)

**Mô tả:**  
Thanh toán đơn hàng Online qua các cổng: VNPay (thẻ ATM/Visa/Master), MoMo, ZaloPay.

**Đầu ra mong muốn:**
- Redirect sang trang thanh toán cổng → callback xác nhận → cập nhật `payments.status`
- Lưu `transaction_id` và `gateway_response` (JSONB)
- Khi thanh toán thành công → `orders.status = 'CONFIRMED'`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/payments/vnpay/create` | Tạo payment URL VNPay |
| `[BE]` | API `GET /api/v1/payments/vnpay/callback` | Verify VNPay signature, update payment status |
| `[BE]` | API `POST /api/v1/payments/vnpay/ipn` | IPN (Instant Payment Notification) từ VNPay |
| `[BE]` | Tương tự cho MoMo, ZaloPay | Mỗi gateway 1 adapter |
| `[FE-Web]` | Trang chọn phương thức TT | Radio buttons, redirect handler, return page |
| `[Mobile]` | In-app payment flow | WebView hoặc deeplink sang app MoMo/ZaloPay |

---

### FR-07.02 — Thanh toán COD 🔴 P0

**Actor:** A02 (Customer)

**Mô tả:**  
Khách chọn thanh toán khi nhận hàng (Cash On Delivery).

**Đầu ra mong muốn:**
- Tạo `payments` với `payment_method = 'COD'`, `status = 'PENDING'`
- Khi shipper xác nhận giao thành công → `payments.status = 'COMPLETED'`
- Lưu `shipments.cod_amount` = số tiền shipper cần thu

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | COD payment logic trong order creation | Tạo payment record, set cod_amount trên shipment |
| `[FE-Web]` | Option COD trong checkout | Hiển thị phí COD (nếu có) |

---

### FR-07.03 — Thanh toán tại quầy 🔴 P0

**Actor:** A03 (Sales Staff)

**Mô tả:**  
Thanh toán trực tiếp tại cửa hàng: tiền mặt, thẻ (POS machine), chuyển khoản (QR code).

> Đã mô tả chi tiết tại FR-03.03

---

### FR-07.04 — Xem lịch sử giao dịch 🟠 P1

**Actor:** A02, A03, A06, A07

**Mô tả:**  
Xem danh sách các giao dịch thanh toán.

**Đầu ra mong muốn:**
- Danh sách payments: mã đơn, ngày, số tiền, phương thức, trạng thái
- Filter: theo method, status, date range, store

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/payments` | Data-scoped query |
| `[FE-Admin]` | Trang `/admin/payments` | Bảng lịch sử GD, export |

---

### FR-07.05 — Đối soát thanh toán 🟠 P1

**Actor:** A06 (Accountant), A07 (Admin)

**Mô tả:**  
Đối soát doanh thu ca POS và đối soát với cổng thanh toán Online.

**Đầu ra mong muốn:**
- Báo cáo đối soát: tổng doanh thu theo phương thức, chênh lệch
- Đánh dấu `payments.reconciled_at` khi đã đối soát

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reconciliation` | Aggregation query by method, date, store |
| `[FE-Admin]` | Trang đối soát `/admin/reconciliation` | Bảng tổng hợp, nút mark as reconciled |

---

### FR-07.06 — Xử lý hoàn tiền 🟠 P1

**Actor:** A06 (Accountant), A07 (Admin)

**Mô tả:**  
Hoàn tiền khi hủy đơn hoặc đổi trả. Hoàn qua cùng phương thức thanh toán gốc.

**Đầu ra mong muốn:**
- Tạo `refunds`, gọi API gateway hoàn tiền (nếu Online payment)
- Cập nhật `refunds.status` và `refund_transaction_id`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/refunds` | Create refund, call gateway refund API |
| `[BE]` | Refund adapters cho VNPay/MoMo/ZaloPay | Gọi API hoàn tiền từng cổng |
| `[FE-Admin]` | Form hoàn tiền trong chi tiết đơn | Hiển thị số tiền tối đa, phương thức gốc, nút xác nhận |

---

## FR-08: Quản lý Khách hàng & CRM

> **Actors:** A02 (Customer), A05 (Manager), A07 (Admin)  
> **Bảng CSDL:** `customers`, `customer_addresses`, `loyalty_tiers`, `loyalty_points_transactions`, `wishlists`, `reviews`

---

### FR-08.01 — Xem hồ sơ khách hàng 🔴 P0

**Actor:** A02 (xem hồ sơ mình), A05/A07 (xem hồ sơ KH)

**Mô tả:**  
Xem thông tin khách hàng: tên, SĐT, email, hạng thành viên, tổng điểm, tổng chi tiêu, số đơn hàng.

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/customers/me` | Customer xem hồ sơ mình |
| `[BE]` | API `GET /api/v1/admin/customers/:id` | Admin/Manager xem KH |
| `[BE]` | API `GET /api/v1/admin/customers` | Danh sách KH, phân trang, filter |
| `[FE-Web]` | Trang `/account` | Dashboard KH: hạng TV, điểm, đơn gần đây |
| `[FE-Admin]` | Trang `/admin/customers` | Bảng danh sách KH, click vào xem chi tiết |
| `[Mobile]` | Tab Profile | Thông tin KH, shortcut đến đơn hàng, điểm, wishlist |

---

### FR-08.02 — Quản lý địa chỉ giao hàng 🔴 P0

**Actor:** A02

**Mô tả:**  
CRUD địa chỉ nhận hàng. Hỗ trợ nhiều địa chỉ, đánh dấu mặc định.

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/customers/me/addresses` | Max 10 địa chỉ, 1 default |
| `[FE-Web]` | Trang `/account/addresses` | List + form thêm/sửa, set default |
| `[Mobile]` | Màn hình địa chỉ | Tương tự, cascade picker tỉnh/huyện/xã |

---

### FR-08.03 — Xem lịch sử mua hàng 🔴 P0

**Actor:** A02, A05, A07

> Đã mô tả tại FR-04.01 (xem danh sách đơn của khách)

---

### FR-08.04 — Chương trình Khách hàng thân thiết (Loyalty) 🟠 P1

**Actor:** A02, A07

**Mô tả:**  
Hệ thống tích điểm tự động khi mua hàng. Hạng thành viên: Bronze → Silver → Gold → Diamond. Mỗi hạng có % giảm giá tự động và hệ số nhân điểm.

**Đầu ra mong muốn:**
- Tích điểm khi đơn `COMPLETED`: `points = total_amount * point_rate * tier.point_multiplier`
- Tự động nâng/hạ hạng dựa trên `total_points` so với `loyalty_tiers.min_points`
- Hiển thị hạng + quyền lợi cho KH

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | Service: calculate & award points | Trigger after order.completed |
| `[BE]` | Service: tier evaluation | Recalculate tier monthly hoặc after points change |
| `[BE]` | API `GET /api/v1/customers/me/loyalty` | Thông tin hạng, điểm, lịch sử |
| `[FE-Web]` | Trang `/account/loyalty` | Hạng hiện tại, progress bar, quyền lợi, lịch sử điểm |
| `[FE-Admin]` | Trang cấu hình Loyalty `/admin/loyalty/tiers` | CRUD loyalty_tiers, cấu hình point_rate |
| `[Mobile]` | Màn hình Loyalty | Membership card UI, tier benefits |

---

### FR-08.05 — Đổi điểm thưởng 🟠 P1

**Actor:** A02

**Mô tả:**  
Khách hàng đổi điểm tích lũy lấy voucher giảm giá hoặc cấn trừ tiền đơn hàng.

**Đầu ra mong muốn:**
- Trừ `customers.total_points`, tạo `loyalty_points_transactions` type `REDEEM`
- Tạo `coupons` với `customer_id` (voucher riêng) nếu đổi voucher
- Hoặc cấn trừ trực tiếp tại checkout (xem FR-02.06)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/customers/me/loyalty/redeem` | Validate available points, create coupon or apply discount |
| `[FE-Web]` | Trang đổi điểm | Danh sách phần thưởng, nút đổi, xác nhận |
| `[Mobile]` | Màn hình đổi điểm | Tương tự |

---

### FR-08.06 — Phân nhóm khách hàng 🟠 P1

**Actor:** A05, A07

**Mô tả:**  
Phân nhóm (segment) khách hàng để phục vụ marketing: VIP, thường xuyên, mới, không hoạt động.

**Đầu ra mong muốn:**
- Segment tự động dựa trên RFM (Recency, Frequency, Monetary)
- Segment thủ công bằng tags

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/customers/segments` | RFM calculation, auto-segment |
| `[FE-Admin]` | Trang phân nhóm KH | Biểu đồ RFM, danh sách KH theo nhóm |

---

### FR-08.07 — Quản lý Wishlist 🟠 P1

> Đã mô tả tại FR-02.07

---

## FR-09: Phân tích Kinh doanh & Dashboard

> **Actors:** A05 (Manager), A06 (Accountant), A07 (Admin)  
> **Bảng CSDL:** Aggregation queries trên `orders`, `order_items`, `payments`, `customers`, `inventory`, `commissions`

---

### FR-09.01 — Dashboard tổng quan 🟡 P2

**Actor:** A05, A06, A07

**Mô tả:**  
Trang Dashboard hiển thị KPI cards và biểu đồ tổng quan.

**Đầu ra mong muốn:**
- KPI Cards: Doanh thu hôm nay, Số đơn hàng, Giá trị đơn TB (AOV), Khách hàng mới
- Biểu đồ doanh thu 7 ngày gần nhất (Line chart)
- Top 5 SP bán chạy (Bar chart)
- Tỷ lệ đơn Online vs POS (Pie chart)
- Cảnh báo: tồn kho thấp, đơn chờ xác nhận

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/dashboard` | Aggregation queries, auto data_scope |
| `[BE]` | GraphQL endpoint (optional) | Flexible dashboard queries |
| `[FE-Admin]` | Trang `/admin/dashboard` | Ant Design KPI cards, Recharts/Chart.js biểu đồ, responsive grid layout |

---

### FR-09.02 — Báo cáo doanh thu 🟡 P2

**Actor:** A05, A06, A07

**Mô tả:**  
Báo cáo doanh thu chi tiết: theo thời gian, theo cửa hàng, theo nhân viên, theo danh mục SP.

**Đầu ra mong muốn:**
- Biểu đồ doanh thu theo ngày/tuần/tháng/quý/năm
- Bảng chi tiết: doanh thu, số đơn, AOV, tỷ lệ hủy
- So sánh giai đoạn (period comparison)
- Filter: date range, store, staff

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/revenue` | Query params: period, start_date, end_date, store_id, staff_id |
| `[FE-Admin]` | Trang `/admin/reports/revenue` | Date range picker, store selector, line/bar charts, data table |

---

### FR-09.03 — Phân tích sản phẩm bán chạy / ế 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/products` | Top selling, slow-moving, by category |
| `[FE-Admin]` | Trang `/admin/reports/products` | Leaderboard, bar charts |

---

### FR-09.04 — Phân tích khách hàng RFM 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/rfm` | Tính R-F-M scores cho từng KH, segment |
| `[FE-Admin]` | Trang `/admin/reports/customers` | RFM matrix, scatter plot, segment breakdown |

---

### FR-09.05 — Phân tích xu hướng mua hàng 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/trends` | Time-series analysis, category trends |
| `[FE-Admin]` | Trang trends | Multi-line chart, heatmap theo giờ/ngày |

---

### FR-09.06 — Dự báo doanh thu 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/forecast` | Simple moving average / linear regression |
| `[FE-Admin]` | Trang dự báo | Biểu đồ thực tế vs dự báo, confidence interval |

---

### FR-09.07 — Xem KPI nhân viên 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/staff-kpi` | Doanh số, số đơn, AOV, hoa hồng theo NV |
| `[FE-Admin]` | Trang KPI NV | Leaderboard, bar chart, filter by store/period |

---

### FR-09.08 — Export báo cáo 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/export` | Generate PDF (puppeteer) hoặc Excel (exceljs) |
| `[FE-Admin]` | Nút Export trên mỗi trang báo cáo | Dropdown: PDF, Excel |

---

## FR-10: Quản lý Khuyến mãi & Marketing

> **Actors:** A07 (Admin)  
> **Bảng CSDL:** `promotions`, `coupons`, `coupon_usage`, `banners`, `notifications`

---

### FR-10.01 — Tạo chương trình khuyến mãi 🟡 P2

**Actor:** A07

**Mô tả:**  
Tạo chương trình KM: giảm %, giảm cứng, free shipping. Áp dụng cho toàn bộ hoặc SP/danh mục cụ thể. Hỗ trợ Flash Sale (giới hạn thời gian + số lượng).

**Đầu ra mong muốn:**
- CRUD `promotions`
- Thiết lập conditions: min_order_amount, max_discount, usage_limit
- Áp dụng tự động trên product listing (hiển thị giá KM)
- Flash Sale: countdown timer trên FE

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/promotions` | Full CRUD, validate date range, auto apply logic |
| `[FE-Admin]` | Trang `/admin/promotions` | Form tạo KM, SP picker, date-time picker |
| `[FE-Web]` | Hiển thị giá KM trên product card | Badge "SALE -20%", crossed original price |
| `[FE-Web]` | Trang Flash Sale | Countdown timer, limited stock indicator |
| `[Mobile]` | Banner Flash Sale | Tương tự |

---

### FR-10.02 — Quản lý Voucher/Coupon 🟡 P2

**Actor:** A07

**Mô tả:**  
CRUD mã giảm giá (voucher code). Hỗ trợ mã chung (public) và mã riêng cho từng KH (từ đổi điểm).

**Đầu ra mong muốn:**
- CRUD `coupons`
- Validate coupon khi checkout: hạn dùng, usage limit, min_order, per-customer limit
- Tracking usage trong `coupon_usage`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/coupons` | Full CRUD |
| `[BE]` | API `POST /api/v1/coupons/validate` | Validate coupon code trước khi checkout |
| `[FE-Admin]` | Trang `/admin/coupons` | Table, form tạo voucher, bulk generate |
| `[FE-Web]` | Input mã giảm giá trong checkout | Validate + hiển thị số tiền giảm |

---

### FR-10.03 — Quản lý Banner quảng cáo 🟡 P2

**Actor:** A07

**Mô tả:**  
CRUD banner/slider quảng cáo trên website và app. Hỗ trợ nhiều vị trí: Hero banner trang chủ, sub-banner, category banner, popup.

**Đầu ra mong muốn:**
- CRUD `banners`
- Schedule hiển thị (start_date, end_date)
- Drag-and-drop sắp xếp thứ tự

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/banners` | Full CRUD, filter by position |
| `[BE]` | API `GET /api/v1/banners?position=HOME_HERO` | Public API cho FE |
| `[FE-Admin]` | Trang `/admin/banners` | Image upload, link input, position selector, date range |
| `[FE-Web]` | Hero carousel trang chủ | Auto-slide, responsive, lazy load images |
| `[Mobile]` | Banner slider | Horizontal scroll, deep-link navigation |

---

### FR-10.04 — Gửi Email Marketing 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | Email service (SendGrid/SES) | Template-based email, bulk send, tracking open/click |
| `[FE-Admin]` | Trang email marketing | Template editor, audience selector (segments), send/schedule |

---

### FR-10.05 — Gửi Push Notification 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | FCM integration | Send to devices via `user_devices`, topic-based broadcast |
| `[BE]` | API `POST /api/v1/admin/notifications/push` | Target: all, segment, individual |
| `[FE-Admin]` | Trang push notification | Title, message, target audience, schedule, send |
| `[Mobile]` | Receive push | FCM setup, notification handler, deep-link |

---

### FR-10.06 — Xem thống kê chiến dịch 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/promotions/:id/stats` | Số lần sử dụng, doanh thu phát sinh, ROI |
| `[FE-Admin]` | Dashboard thống kê KM | Charts, KPI cards |

---

## FR-11: Quản lý Nhân sự

> **Actors:** A05 (Manager), A07 (Admin)  
> **Bảng CSDL:** `employees`, `departments`, `shifts`, `attendance`, `commissions`

---

### FR-11.01 — Thêm nhân viên mới 🟠 P1

**Actor:** A07

**Mô tả:**  
Thêm nhân viên mới: tạo hồ sơ `employees`, tạo tài khoản `users` đăng nhập (gán role phù hợp), phân công cửa hàng.

**Đầu ra mong muốn:**
- Tạo `users` (email, password tạm, role)
- Tạo `employees` (employee_code, position, department, store, hire_date, salary, commission_rate)
- Tạo `user_stores` nếu vai trò là Manager
- Gửi email chào mừng với link đặt mật khẩu

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/employees` | Transaction: create user → create employee → assign store |
| `[FE-Admin]` | Form thêm NV `/admin/employees/new` | Thông tin cá nhân, chọn department, store, role, commission_rate |

---

### FR-11.02 — Sửa thông tin nhân viên 🟠 P1

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/admin/employees/:id` | Update employee + user info |
| `[FE-Admin]` | Form sửa NV | Tương tự form thêm, pre-filled |

---

### FR-11.03 — Quản lý phòng ban 🟠 P1

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/departments` | Simple CRUD |
| `[FE-Admin]` | Trang `/admin/departments` | Table + modal CRUD |

---

### FR-11.04 — Quản lý ca làm việc 🟠 P1

**Actor:** A05, A07

**Mô tả:**  
CRUD ca làm việc (`shifts`) cho mỗi cửa hàng. Phân ca cho nhân viên.

**Đầu ra mong muốn:**
- CRUD `shifts`: tên ca, giờ bắt đầu, giờ kết thúc, cửa hàng
- Lịch phân ca: drag-and-drop NV vào ca (P3)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/shifts` | CRUD, filter by store |
| `[FE-Admin]` | Trang `/admin/shifts` | Table ca làm việc, calendar view phân ca |

---

### FR-11.05 — Chấm công 🟠 P1

**Actor:** A05, A07

**Mô tả:**  
Ghi nhận chấm công nhân viên: giờ vào/ra, trạng thái (đúng giờ/trễ/vắng).

**Đầu ra mong muốn:**
- CRUD `attendance`: employee_id, shift_id, date, check_in/out, status
- Tự động tính `status`: PRESENT (đúng giờ), LATE (trễ > 15 phút), ABSENT (không check-in)

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `POST /api/v1/admin/attendance/check-in` | Ghi nhận giờ vào, auto compute status |
| `[BE]` | API `POST /api/v1/admin/attendance/check-out` | Ghi nhận giờ ra |
| `[BE]` | API `GET /api/v1/admin/attendance` | Bảng chấm công theo tháng, filter by store/employee |
| `[FE-Admin]` | Trang chấm công `/admin/attendance` | Calendar view, color-coded status, monthly summary |

---

### FR-11.06 — Tính hoa hồng bán hàng 🟠 P1

**Actor:** A05, A07

**Mô tả:**  
Tính hoa hồng cho NV Sales dựa trên doanh số bán hàng. Rate lấy từ `employees.commission_rate`.

**Đầu ra mong muốn:**
- Tự động tạo `commissions` khi đơn hàng `COMPLETED` (có `sales_staff_id`)
- `amount = order.total_amount * employee.commission_rate / 100`
- Chốt hoa hồng cuối tháng: `status = 'PAID'`
- Nếu đơn bị hoàn trả → `commissions.status = 'CANCELLED'`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | Commission calculation service | Auto-trigger after order.completed |
| `[BE]` | API `GET /api/v1/admin/commissions` | Bảng hoa hồng, filter by period/employee |
| `[BE]` | API `PUT /api/v1/admin/commissions/finalize` | Chốt hoa hồng tháng |
| `[FE-Admin]` | Trang hoa hồng `/admin/commissions` | Bảng hoa hồng, tổng hợp theo NV, nút chốt tháng |

---

### FR-11.07 — Xem báo cáo nhân sự 🟠 P1

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/reports/hr` | Thống kê: tổng NV, theo phòng ban, tỷ lệ nghỉ, doanh số NV |
| `[FE-Admin]` | Trang báo cáo NV | KPI cards, charts |

---

## FR-12: Quản lý Nhà cung cấp & Nhập hàng

> **Actors:** A04 (Warehouse), A07 (Admin)  
> **Bảng CSDL:** `suppliers`, `purchase_orders`, `purchase_order_items`, `supplier_payments`

---

### FR-12.01 — Thêm nhà cung cấp 🟠 P1

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/suppliers` | Full CRUD |
| `[FE-Admin]` | Trang `/admin/suppliers` | Table + form modal |

---

### FR-12.02 — Sửa thông tin NCC 🟠 P1

> Nằm trong CRUD NCC ở trên.

---

### FR-12.03 — Tạo đơn đặt hàng NCC (Purchase Order) 🟠 P1

**Actor:** A04, A07

**Mô tả:**  
Lập đơn đặt hàng từ nhà cung cấp. Chọn sản phẩm cần nhập, số lượng, đơn giá nhập, chọn kho nhận.

**Đầu ra mong muốn:**
- Tạo `purchase_orders` (po_number, supplier_id, store_id, total_amount)
- Tạo `purchase_order_items` (product_variant_id, quantity_ordered, unit_cost)
- Flow: `DRAFT → SENT → CONFIRMED → RECEIVED`
- Sinh `po_number` tự động

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/purchase-orders` | Create, update, send, receive |
| `[FE-Admin]` | Trang PO `/admin/purchase-orders` | Tạo PO: chọn NCC, thêm SP (search/scan), nhập SL + giá, tổng hợp |

---

### FR-12.04 — Nhận hàng từ NCC 🟠 P1

> Đã mô tả chi tiết tại FR-05.01

---

### FR-12.05 — Quản lý công nợ NCC 🟠 P1

**Actor:** A06, A07

**Mô tả:**  
Theo dõi và thanh toán công nợ cho nhà cung cấp.

**Đầu ra mong muốn:**
- Tạo `supplier_payments` (amount, payment_method, payment_date, status)
- Tổng nợ = Σ PO.total_amount - Σ supplier_payments.amount (COMPLETED)
- Danh sách công nợ theo NCC

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/admin/suppliers/:id/balance` | Tính tổng nợ |
| `[BE]` | API `POST /api/v1/admin/supplier-payments` | Ghi nhận thanh toán |
| `[FE-Admin]` | Trang công nợ NCC `/admin/supplier-payments` | Bảng NCC + nợ, form thanh toán |

---

### FR-12.06 — Đánh giá NCC 🟠 P1

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `PUT /api/v1/admin/suppliers/:id/rating` | Cập nhật `suppliers.rating` |
| `[FE-Admin]` | Rating trong chi tiết NCC | Star rating + notes |

---

## FR-13: Quản lý Nội dung (CMS & SEO)

> **Actors:** A07 (Admin)  
> **Bảng CSDL:** `pages`, `blog_posts`, `blog_categories`, `banners`, `faqs`

---

### FR-13.01 — Quản lý trang tĩnh 🟡 P2

**Mô tả:**  
CRUD các trang: Giới thiệu, Chính sách, Liên hệ. Rich text editor.

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/pages` | Full CRUD |
| `[BE]` | API `GET /api/v1/pages/:slug` | Public API cho FE |
| `[FE-Admin]` | Trang `/admin/pages` | WYSIWYG editor (TinyMCE/CKEditor), SEO fields |
| `[FE-Web]` | Trang `/:slug` (catch-all) | Render HTML content, SSR cho SEO |

---

### FR-13.02 — Quản lý bài viết Blog 🟡 P2

**Mô tả:**  
CRUD blog posts: beauty tips, product reviews, skincare routines. Hỗ trợ lên lịch đăng bài, danh mục blog.

**Đầu ra mong muốn:**
- CRUD `blog_posts` với status: `DRAFT → SCHEDULED → PUBLISHED → ARCHIVED`
- Scheduled publish: `published_at` trong tương lai → Cron job tự publish
- Rich text + hình ảnh + SEO metadata
- CRUD `blog_categories`

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/blog/posts` | Full CRUD, schedule publish |
| `[BE]` | CRUD APIs `/api/v1/admin/blog/categories` | Full CRUD |
| `[BE]` | Cron: publish scheduled posts | Daily scan `SCHEDULED` posts where `published_at <= NOW()` |
| `[FE-Admin]` | Trang `/admin/blog` | Post list, editor, category manager, schedule picker |
| `[FE-Web]` | Trang `/blog`, `/blog/:slug` | Blog listing (ISR), blog detail (SSR), related posts, social share |
| `[Mobile]` | Mục Blog/Beauty Tips | Blog feed, reading view |

---

### FR-13.03 — Quản lý Banner/Slider 🟡 P2

> Đã mô tả tại FR-10.03

---

### FR-13.04 — Quản lý FAQ 🟡 P2

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | CRUD APIs `/api/v1/admin/faqs` | Full CRUD, sort_order |
| `[BE]` | API `GET /api/v1/faqs` | Public API, group by category |
| `[FE-Admin]` | Trang `/admin/faqs` | Table + form, drag-and-drop sort |
| `[FE-Web]` | Trang `/faq` | Accordion FAQ, search FAQ (P3) |

---

### FR-13.05 — Quản lý SEO toàn trang 🟡 P2

**Mô tả:**  
Cấu hình SEO chung cho toàn website: sitemap.xml, robots.txt, canonical URLs, Open Graph defaults, JSON-LD structured data.

**Phân công chi tiết:**

| Platform | Công việc | Chi tiết |
|----------|-----------|----------|
| `[BE]` | API `GET /api/v1/sitemap.xml` | Auto-generate sitemap từ products, categories, blog posts |
| `[FE-Web]` | Next.js SEO setup | Default meta tags, dynamic per-page, structured data |
| `[FE-Admin]` | SEO settings page | Cấu hình defaults: OG image, site description |

---

## 📎 Phụ lục: Ma trận Role × Module

> Tổng hợp vai trò nào truy cập module nào (✅ có quyền, ⬜ không)

| Module | Guest | Customer | Sales | Warehouse | Manager | Accountant | Admin |
|--------|:-----:|:--------:|:-----:|:---------:|:-------:|:----------:|:-----:|
| Auth (đăng ký/nhập) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mua hàng Online | ✅ (xem) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| POS | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Đơn hàng | ⬜ | ✅ (đơn mình) | ✅ | ⬜ | ✅ | ⬜ | ✅ |
| Kho hàng | ⬜ | ⬜ | ⬜ | ✅ | ✅ | ⬜ | ✅ |
| Sản phẩm & DM | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Thanh toán | ⬜ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ |
| KH & CRM | ⬜ | ✅ (mình) | ⬜ | ⬜ | ✅ | ⬜ | ✅ |
| Analytics | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ✅ | ✅ |
| Khuyến mãi | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |
| Nhân sự | ⬜ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ✅ |
| NCC & Nhập hàng | ⬜ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ | ✅ |
| CMS & SEO | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |

---

> **Ghi chú cuối:**  
> Tài liệu này là bản v1.0, sẽ được cập nhật liên tục qua các sprint.  
> Mọi thắc mắc về nghiệp vụ liên hệ Product Owner.  
> Mọi thắc mắc về kỹ thuật liên hệ Tech Lead.
