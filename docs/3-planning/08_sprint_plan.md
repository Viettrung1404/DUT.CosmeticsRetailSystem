# 📅 Sprint Plan — Hệ thống GlowUp

**Dự án:** GlowUp — Hệ thống quản lý bán hàng và phân tích kinh doanh chuỗi cửa hàng bán lẻ mỹ phẩm  
**Tổng thời gian:** 6 tuần (6 Sprint × 1 tuần/sprint)  
**Tham chiếu:** [07 — Functional Requirements](file:///c:/Users/ACER/.gemini/antigravity/scratch/cosmetics-retail-system/docs/07_functional_requirements.md)  
**Ngày lập:** 2026-09-20  
**Phiên bản:** 1.0

---

## 1. Đội ngũ & Phân vai

| Thành viên | Vai trò | Phạm vi phụ trách |
|-----------|---------|-------------------|
| **Việt Trung** | BE End-user | API phía người dùng cuối: Auth customer, Product public, Cart, Checkout, Payment gateway, Customer profile, Loyalty, Notification — Tất cả API mà FE-Web (Next.js) & Mobile gọi tới |
| **Thành Lập** | BE Admin | API quản trị: Product CRUD admin, Inventory, POS, Order management, HR, Supplier, Promotion, CMS, Analytics, User management — Tất cả API mà FE-Admin (React) gọi tới |
| **Tuấn Anh** | FE End-user (Web) | Website Next.js cho khách hàng: trang chủ, catalog, chi tiết SP, giỏ hàng, checkout, tài khoản, đơn hàng, blog |
| **Văn Tân** | FE Admin (Web) | Dashboard Admin React: quản lý SP, đơn hàng, kho, POS, nhân sự, NCC, marketing, analytics |
| **Văn Kim** | Mobile | App React Native (Expo): trải nghiệm mua sắm, đơn hàng, tài khoản, push notification, loyalty |

---

## 2. Nguyên tắc lập kế hoạch

1. **BE đi trước FE 1–2 ngày** — Backend commit API + Swagger docs trước, Frontend integrate sau.
2. **P0 → P1 → P2 → P3** — Ưu tiên tuyệt đối theo thứ tự, không nhảy cóc.
3. **Vertical slice** — Mỗi sprint deliver 1 luồng hoàn chỉnh end-to-end (BE + FE + Mobile), không để tồn API mà không có UI.
4. **Sprint Review cuối mỗi tuần** — Demo chức năng hoàn thành, review code, retrospective.
5. **Definition of Done (DoD):**
   - API hoạt động đúng, có unit test cho business logic chính
   - FE/Mobile tích hợp API thành công, UI responsive
   - Code review & merge vào `develop`
   - Swagger/Postman collection cập nhật

---

## 3. Tổng quan Roadmap 6 Sprint

```
Sprint 1 ──── Sprint 2 ──── Sprint 3 ──── Sprint 4 ──── Sprint 5 ──── Sprint 6
  │              │              │              │              │              │
  │  🔴 P0       │  🔴 P0       │  🔴P0+🟠P1   │  🟠 P1       │  🟡 P2       │  🟡P2+🟢P3
  │  Foundation  │  Commerce    │  Operations  │  Advanced    │  Analytics   │  Polish
  │              │              │              │              │  & Marketing │  & Extras
  ▼              ▼              ▼              ▼              ▼              ▼
 Auth           Cart           POS            RMA            Dashboard     CMS
 Product        Checkout       Payment GW     Loyalty        Promotions    SEO
 Category       Order CRUD     Inventory      HR             Reports       OAuth
 Brand          Đơn hàng cơ    Kho nâng cao   NCC & PO       Voucher       AI Forecast
                bản                           Phân quyền     Blog/Banner   Bug-fix
```

---

## 4. Chi tiết từng Sprint

---

### 🏁 SPRINT 1 — Nền tảng (Foundation)

**Thời gian:** Tuần 1  
**Mục tiêu:** Dựng xong Auth end-to-end, CRUD Sản phẩm/Danh mục/Thương hiệu admin, hiển thị catalog sản phẩm cho end-user. Setup project, CI/CD, DB migration.  
**Milestone:** Người dùng đăng ký/đăng nhập được. Admin tạo sản phẩm. Khách xem được danh sách & chi tiết sản phẩm.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-01.01 | Đăng ký tài khoản | 🔴 P0 |
| FR-01.02 | Đăng nhập (JWT) | 🔴 P0 |
| FR-01.03 | Đăng xuất | 🔴 P0 |
| FR-01.04 | Quên mật khẩu | 🔴 P0 |
| FR-06.01 | CRUD Sản phẩm | 🔴 P0 |
| FR-06.02 | Quản lý Biến thể | 🔴 P0 |
| FR-06.03 | Quản lý Danh mục | 🔴 P0 |
| FR-06.04 | Quản lý Thương hiệu | 🔴 P0 |
| FR-02.01 | Xem danh sách sản phẩm | 🔴 P0 |
| FR-02.02 | Tìm kiếm sản phẩm | 🔴 P0 |
| FR-02.03 | Xem chi tiết sản phẩm | 🔴 P0 |

#### Phân công Sprint 1

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="7"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>🏗️ <strong>Setup project:</strong> Init repo, NestJS + TypeScript boilerplate, cấu hình PostgreSQL + Prisma/TypeORM, Docker Compose, cấu trúc thư mục (Clean Architecture)</td><td>T2</td></tr>
<tr><td>🏗️ <strong>Setup Auth foundation:</strong> JWT service (access token 15min + refresh token 7d), bcrypt hashing, middleware <code>authGuard</code>, <code>permissionGuard</code></td><td>T2</td></tr>
<tr><td>📌 <code>POST /api/v1/auth/register</code> — Đăng ký, tạo user + customer, hash password, gửi email verify (Nodemailer/SendGrid)</td><td>T3</td></tr>
<tr><td>📌 <code>POST /api/v1/auth/verify-email</code>, <code>POST /api/v1/auth/resend-otp</code> — Xác thực email, rate limiting 3 lần/giờ</td><td>T3</td></tr>
<tr><td>📌 <code>POST /api/v1/auth/login</code>, <code>POST /api/v1/auth/refresh-token</code>, <code>POST /api/v1/auth/logout</code> — Đăng nhập/xuất, blacklist token Redis</td><td>T4</td></tr>
<tr><td>📌 <code>POST /api/v1/auth/forgot-password</code>, <code>POST /api/v1/auth/reset-password</code> — Quên/đặt lại MK</td><td>T4</td></tr>
<tr><td>📌 <code>GET /api/v1/products</code> (public, filter/sort/paginate), <code>GET /api/v1/products/:slug</code> (chi tiết + variants + images), <code>GET /api/v1/products/search</code>, <code>GET /api/v1/products/suggest</code>, <code>GET /api/v1/categories/tree</code></td><td>T5–T6</td></tr>

<tr><td rowspan="5"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>🏗️ <strong>DB Migration:</strong> Tạo tất cả bảng Auth (users, roles, permissions, user_stores, user_oauth_accounts, verification_tokens) + Product (categories, brands, products, product_variants, product_images, product_ingredients, product_tags) + stores + inventory. Seed roles & permissions (53 bits)</td><td>T2–T3</td></tr>
<tr><td>📌 Service <code>getUserEffectivePermissions(userId)</code> — hàm DUY NHẤT xử lý bitmask, trả mảng permission_code[]</td><td>T3</td></tr>
<tr><td>📌 CRUD <code>/api/v1/admin/categories</code> — Create, Read (tree + flat), Update, Soft-delete. CRUD <code>/api/v1/admin/brands</code></td><td>T4</td></tr>
<tr><td>📌 CRUD <code>/api/v1/admin/products</code> — Create (+ variants + images), Read (list + detail), Update, Soft-delete. Upload images → S3/MinIO</td><td>T4–T5</td></tr>
<tr><td>📌 CRUD <code>/api/v1/admin/products/:id/variants</code> — Create variant, Update price/SKU/barcode, validate unique combo</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>🏗️ <strong>Setup project:</strong> Init Next.js + TypeScript, Tailwind CSS, project structure, layout components (Header, Footer, Sidebar), Auth context/store (Zustand/Redux)</td><td>T2–T3</td></tr>
<tr><td>📌 Trang <code>/register</code>, <code>/login</code>, <code>/forgot-password</code>, <code>/reset-password</code> — Form UI, validation (react-hook-form + zod), integrate Auth APIs, step xác thực OTP/email</td><td>T3–T4</td></tr>
<tr><td>📌 Trang <code>/products</code>, <code>/category/:slug</code> — Product grid responsive (4→2 col), sidebar filters (category, brand, price range, rating), sort dropdown, pagination. SSR/ISR cho SEO</td><td>T5</td></tr>
<tr><td>📌 Trang <code>/product/:slug</code> — Gallery ảnh (swipe + zoom), variant selector (option1/2/3), giá theo variant, tồn kho, tabs (mô tả / thành phần / đánh giá), SP liên quan. JSON-LD structured data</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>🏗️ <strong>Setup project:</strong> Init React + TypeScript, Ant Design + Bootstrap 5, project structure, layout (Sidebar, Header, Breadcrumb), Auth context, Axios interceptor (auto refresh token), route guard</td><td>T2–T3</td></tr>
<tr><td>📌 Trang <code>/admin/login</code> — Form đăng nhập Admin portal</td><td>T3</td></tr>
<tr><td>📌 Trang <code>/admin/categories</code> — Tree view danh mục (Ant Tree), inline edit, drag-and-drop sort. Trang <code>/admin/brands</code> — Table + modal CRUD, upload logo</td><td>T4–T5</td></tr>
<tr><td>📌 Trang <code>/admin/products</code> — Table danh sách SP (search, filter, bulk actions). Form tạo/sửa SP: rich text editor (description), image dropzone multi-file, category/brand select, SEO fields. Variant manager: dynamic option names → generate variant matrix → edit price/SKU/barcode từng variant</td><td>T5–T6</td></tr>

<tr><td rowspan="4"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>🏗️ <strong>Setup project:</strong> Init React Native (Expo), navigation (React Navigation), project structure, theme/design system, SecureStorage for tokens, Axios instance</td><td>T2–T3</td></tr>
<tr><td>📌 Màn hình đăng ký, đăng nhập, quên MK — Form UI, auto-fill OTP SMS (Android), nhập OTP (iOS), biometric login skeleton</td><td>T3–T4</td></tr>
<tr><td>📌 Màn hình danh sách SP — FlatList/FlashList infinite scroll, pull-to-refresh, filter bottom sheet (category, brand, price)</td><td>T5</td></tr>
<tr><td>📌 Màn hình chi tiết SP — Image carousel, variant picker, tồn kho, sticky bottom CTA bar ("Thêm vào giỏ")</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 1:** Auth hoạt động E2E. Admin tạo được danh mục, thương hiệu, sản phẩm + biến thể. Khách xem được catalog, tìm kiếm, xem chi tiết sản phẩm trên Web + Mobile.

---

### 🛒 SPRINT 2 — Thương mại cốt lõi (Core Commerce)

**Thời gian:** Tuần 2  
**Mục tiêu:** Hoàn thành luồng mua hàng E2E: Giỏ hàng → Checkout → Đơn hàng. Quản lý đơn hàng admin cơ bản. Hồ sơ khách hàng.  
**Milestone:** Khách hàng mua được hàng online (COD), Admin xem và xử lý đơn hàng.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-02.04 | Thêm vào giỏ hàng | 🔴 P0 |
| FR-02.05 | Quản lý giỏ hàng | 🔴 P0 |
| FR-02.06 | Đặt hàng (Checkout) | 🔴 P0 |
| FR-07.02 | Thanh toán COD | 🔴 P0 |
| FR-04.01 | Xem danh sách đơn hàng | 🔴 P0 |
| FR-04.02 | Xem chi tiết đơn hàng | 🔴 P0 |
| FR-04.03 | Xác nhận đơn hàng | 🔴 P0 |
| FR-04.04 | Cập nhật trạng thái đơn hàng | 🔴 P0 |
| FR-04.05 | Hủy đơn hàng | 🔴 P0 |
| FR-08.01 | Xem hồ sơ khách hàng | 🔴 P0 |
| FR-08.02 | Quản lý địa chỉ giao hàng | 🔴 P0 |
| FR-08.03 | Xem lịch sử mua hàng | 🔴 P0 |

#### Phân công Sprint 2

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="6"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>📌 Cart APIs: <code>POST /api/v1/cart/items</code> (add, validate stock), <code>GET /api/v1/cart</code>, <code>PUT /api/v1/cart/items/:id</code> (update qty), <code>DELETE /api/v1/cart/items/:id</code>, <code>POST /api/v1/cart/merge</code> (guest → customer)</td><td>T2</td></tr>
<tr><td>📌 Checkout: <code>POST /api/v1/orders/preview</code> — tính toán giá + áp coupon/points (preview, chưa tạo đơn)</td><td>T3</td></tr>
<tr><td>📌 Checkout: <code>POST /api/v1/orders</code> — 🔥 Transaction lớn: validate stock → create order + order_items (snapshot price/cost) → reserve inventory → apply coupon → apply points → clear cart → send notification. COD payment creation</td><td>T3–T4</td></tr>
<tr><td>📌 Customer profile: <code>GET /api/v1/customers/me</code>, <code>GET /api/v1/customers/me/orders</code> (lịch sử mua), CRUD <code>/api/v1/customers/me/addresses</code> (max 10, 1 default)</td><td>T4–T5</td></tr>
<tr><td>📌 Order detail cho customer: <code>GET /api/v1/orders/:id</code> (order + items + payments + status_history)</td><td>T5</td></tr>
<tr><td>📌 Hủy đơn customer: <code>PUT /api/v1/orders/:id/cancel</code> (chỉ PENDING, release reserved, refund points/coupon). Cron job: cancel expired PENDING orders > 30 phút</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>📌 DB Migration bổ sung: bảng carts, cart_items, orders, order_items, order_item_batches, order_status_history, payments, refunds, customers, customer_addresses, loyalty_tiers, loyalty_points_transactions</td><td>T2</td></tr>
<tr><td>📌 Admin Order list: <code>GET /api/v1/admin/orders</code> — auto filter by data_scope (SELF/STORE/ALL), phân trang, filter status/type/date/store</td><td>T3</td></tr>
<tr><td>📌 Admin Order detail: <code>GET /api/v1/admin/orders/:id</code> — full detail. Xác nhận đơn: <code>PUT /api/v1/admin/orders/:id/confirm</code> (validate stock, update status, create history, send notification)</td><td>T4</td></tr>
<tr><td>📌 Cập nhật trạng thái: <code>PUT /api/v1/admin/orders/:id/status</code> — State machine validation (PENDING→CONFIRMED→PROCESSING→SHIPPING→DELIVERED→COMPLETED), side effects per status (tích điểm, commission khi COMPLETED)</td><td>T5</td></tr>
<tr><td>📌 Hủy đơn admin: <code>PUT /api/v1/admin/orders/:id/cancel</code> — Manager/Admin hủy ở nhiều trạng thái, release inventory, create refund nếu đã TT. Admin Customer list: <code>GET /api/v1/admin/customers</code></td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>📌 Nút "Thêm vào giỏ" trên product card & detail — variant phải được chọn, quantity input, toast notification. Mini cart dropdown trong header (badge count)</td><td>T2–T3</td></tr>
<tr><td>📌 Trang <code>/cart</code> — Bảng danh sách SP, stepper quantity (+/-), nút xóa, summary sidebar (subtotal), nút "Tiến hành thanh toán"</td><td>T3</td></tr>
<tr><td>📌 Trang <code>/checkout</code> — Step 1: Chọn/thêm địa chỉ → Step 2: Chọn thanh toán (COD) → Step 3: Nhập coupon + điểm → Xác nhận. Trang <code>/order-success/:orderNumber</code></td><td>T4–T5</td></tr>
<tr><td>📌 Trang <code>/account</code> — Dashboard KH (hạng TV, điểm, đơn gần đây). Trang <code>/account/addresses</code> — List + form CRUD, set default</td><td>T5</td></tr>
<tr><td>📌 Trang <code>/account/orders</code> — Danh sách đơn, tab filter theo status. Trang <code>/account/orders/:orderNumber</code> — Chi tiết + timeline + nút hủy (khi PENDING)</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>📌 Trang <code>/admin/orders</code> — Bảng đơn hàng (Ant Table), advanced filter (status, type, date range, store), search by order_number, export Excel</td><td>T2–T3</td></tr>
<tr><td>📌 Trang <code>/admin/orders/:id</code> — Chi tiết đơn: thông tin KH, danh sách SP, tóm tắt giá, timeline status history, thông tin thanh toán</td><td>T4</td></tr>
<tr><td>📌 Action buttons trong chi tiết đơn: nút "Xác nhận" (modal confirm), dropdown trạng thái (chỉ hiện trạng thái hợp lệ kế tiếp), nút "Hủy đơn" (modal nhập lý do)</td><td>T5</td></tr>
<tr><td>📌 Trang <code>/admin/customers</code> — Bảng danh sách KH, filter by tier/store, click vào xem chi tiết (profile + lịch sử đơn)</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>📌 Nút "Thêm vào giỏ" — haptic feedback, badge animation. Màn hình Giỏ hàng — SwipeToDelete, inline quantity stepper, tổng tiền, nút checkout</td><td>T2–T3</td></tr>
<tr><td>📌 Flow Checkout mobile — Multi-step form: saved addresses dropdown (cascade picker tỉnh/huyện/xã), payment method selector (COD), order summary, nút đặt hàng</td><td>T3–T4</td></tr>
<tr><td>📌 Tab Profile — Thông tin KH, shortcut đến đơn hàng/điểm/wishlist. Màn hình quản lý địa chỉ</td><td>T5</td></tr>
<tr><td>📌 Tab "Đơn hàng" — Horizontal tab status filter, order cards. Chi tiết đơn: status stepper, danh sách SP, nút hủy (bottom sheet), call CTA</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 2:** Luồng mua hàng Online hoàn chỉnh (COD). Admin xác nhận, cập nhật, hủy đơn. Khách xem lịch sử, quản lý địa chỉ. ✅ **MVP Buyable**

---

### 🏪 SPRINT 3 — Vận hành (Operations)

**Thời gian:** Tuần 3  
**Mục tiêu:** POS bán hàng tại quầy. Tích hợp thanh toán Online (VNPay). Kho hàng cơ bản (nhập/xuất/xem tồn). Profile nâng cao.  
**Milestone:** Nhân viên bán hàng POS được. Khách thanh toán VNPay được. Kho nhập/xuất hàng.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-03.01 | Mở ca làm việc | 🔴 P0 |
| FR-03.02 | Tạo đơn hàng POS | 🔴 P0 |
| FR-03.03 | Thu tiền | 🔴 P0 |
| FR-03.04 | In hóa đơn | 🔴 P0 |
| FR-03.05 | Xem tồn kho cửa hàng (POS) | 🔴 P0 |
| FR-03.06 | Đóng ca làm việc | 🔴 P0 |
| FR-07.01 | Thanh toán Online (VNPay/MoMo/ZaloPay) | 🔴 P0 |
| FR-05.01 | Nhập kho từ NCC | 🔴 P0 |
| FR-05.02 | Xuất kho | 🔴 P0 |
| FR-05.03 | Xem tồn kho | 🔴 P0 |
| FR-01.05 | Đổi mật khẩu | 🟠 P1 |
| FR-01.06 | Quản lý Hồ sơ cá nhân | 🟠 P1 |

#### Phân công Sprint 3

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="5"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>📌 VNPay integration: <code>POST /api/v1/payments/vnpay/create</code> (tạo payment URL), <code>GET /api/v1/payments/vnpay/callback</code> (verify signature, update payment), <code>POST /api/v1/payments/vnpay/ipn</code> (IPN endpoint). Khi TT thành công → orders.status = CONFIRMED</td><td>T2–T3</td></tr>
<tr><td>📌 MoMo integration: <code>POST /api/v1/payments/momo/create</code>, callback, IPN — adapter pattern tương tự VNPay</td><td>T4</td></tr>
<tr><td>📌 ZaloPay integration: tương tự adapter pattern</td><td>T4</td></tr>
<tr><td>📌 <code>PUT /api/v1/auth/change-password</code> (verify old → update hash → invalidate other sessions → email notify). <code>GET /api/v1/users/me</code>, <code>PUT /api/v1/users/me</code>, <code>POST /api/v1/upload/avatar</code> (resize → S3)</td><td>T5</td></tr>
<tr><td>📌 Notification service: tạo bản ghi <code>notifications</code> cho các event đơn hàng (confirm, shipping, delivered, cancel). <code>GET /api/v1/notifications</code>, <code>PUT /api/v1/notifications/:id/read</code></td><td>T6</td></tr>

<tr><td rowspan="6"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>📌 DB Migration bổ sung: pos_sessions, shipments, return_orders, return_order_items. Seed stores mẫu</td><td>T2</td></tr>
<tr><td>📌 POS Session: <code>POST /api/v1/pos/sessions/open</code> (check no OPEN ca at same store), <code>POST /api/v1/pos/sessions/:id/close</code> (calculate difference)</td><td>T2</td></tr>
<tr><td>📌 POS Order: <code>GET /api/v1/pos/products/scan?barcode=</code>, <code>GET /api/v1/pos/products/search</code>, <code>GET /api/v1/pos/customers/lookup?phone=</code>. <code>POST /api/v1/pos/orders</code> — 🔥 Transaction: create order (type=POS) → allocate batches FEFO → deduct inventory instantly → create commission</td><td>T3–T4</td></tr>
<tr><td>📌 POS Payment: <code>POST /api/v1/pos/orders/:id/pay</code> (split payment: CASH/CARD/TRANSFER, update pos_sessions.system_cash), Loyalty tích điểm. Receipt: <code>GET /api/v1/orders/:id/receipt</code> (PDF generation)</td><td>T4</td></tr>
<tr><td>📌 Inventory: <code>GET /api/v1/admin/inventory</code> (filter by store, data_scope), <code>GET /api/v1/pos/inventory</code> (tồn kho tại cửa hàng mình). <code>POST /api/v1/admin/inventory/receive</code> — Transaction: update PO → create/update batches → update inventory → update cost_price → create inventory_transactions</td><td>T5</td></tr>
<tr><td>📌 <code>POST /api/v1/admin/inventory/adjust</code> (xuất thủ công + lý do). POS Session reconcile: <code>POST /api/v1/pos/sessions/:id/reconcile</code> (Manager duyệt). Danh sách ca: <code>GET /api/v1/admin/pos/sessions</code></td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>📌 Tích hợp thanh toán trong Checkout: radio buttons VNPay/MoMo/ZaloPay/COD, redirect handler, trang <code>/payment/return</code> (callback xử lý kết quả)</td><td>T2–T3</td></tr>
<tr><td>📌 Search bar header: autocomplete dropdown (debounce 300ms), search history (localStorage), trang kết quả <code>/search?q=</code>, highlight keyword</td><td>T4</td></tr>
<tr><td>📌 Trang <code>/account/profile</code> — Form chỉnh sửa hồ sơ (full_name, phone, DOB, gender), upload avatar preview. Trang đổi MK trong Settings</td><td>T5</td></tr>
<tr><td>📌 Notification bell icon header — dropdown danh sách notification, badge unread count, mark as read</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>📌 Trang POS <code>/admin/pos</code> — 🔥 **Giao diện POS full-screen:** thanh tìm/quét SP (Webcam barcode scanner html5-qrcode), danh sách items đang bán, panel tổng tiền</td><td>T2–T3</td></tr>
<tr><td>📌 POS tiếp: tra cứu KH (input SĐT), nút áp KM/voucher/điểm, modal thanh toán (selector PT, input số tiền, tính tiền thừa CASH), nút xác nhận → in hóa đơn (<code>window.print()</code>)</td><td>T3–T4</td></tr>
<tr><td>📌 Modal mở ca (input opening_cash), modal đóng ca (tóm tắt doanh thu ca, input counted_cash, hiển thị chênh lệch, ghi chú). Trang <code>/admin/pos/sessions</code> — bảng lịch sử ca, action reconcile</td><td>T5</td></tr>
<tr><td>📌 Trang <code>/admin/inventory</code> — Table tồn kho sortable (SP, variant, SKU, quantity, reserved, available, min), badge cảnh báo, filter by store/category, search, export button</td><td>T5–T6</td></tr>
<tr><td>📌 Trang nhập kho <code>/admin/inventory/receive</code> — Chọn PO, nhập SL thực nhận từng item, nhập batch_number + expiry_date, notes chất lượng. Form xuất kho thủ công</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>📌 Tích hợp thanh toán mobile: Payment method selector (COD + VNPay/MoMo/ZaloPay), WebView hoặc deeplink sang app thanh toán</td><td>T2–T3</td></tr>
<tr><td>📌 Search screen — Search bar, voice search skeleton (P3), recent searches, trending searches</td><td>T4</td></tr>
<tr><td>📌 Tab Profile nâng cao — Form chỉnh sửa hồ sơ (native image picker), đổi mật khẩu</td><td>T5</td></tr>
<tr><td>📌 Notification: FCM setup (Expo Notifications), nhận push khi đơn hàng thay đổi trạng thái. In-app notification list, badge</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 3:** POS bán hàng hoàn chỉnh. Thanh toán VNPay/MoMo/ZaloPay. Nhập/xuất kho. ✅ **MVP Complete — Hệ thống vận hành được cả Online lẫn Offline**

---

### ⚙️ SPRINT 4 — Nâng cao (Advanced Operations)

**Thời gian:** Tuần 4  
**Mục tiêu:** Hoàn trả RMA, Phân quyền admin, Kho nâng cao (chuyển kho, kiểm kê, lô hàng), Thanh toán nâng cao (đối soát, hoàn tiền), Nhân sự cơ bản, Nhà cung cấp & PO.  
**Milestone:** Toàn bộ P1 hoàn thành. Hệ thống sẵn sàng vận hành chuyên nghiệp.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-01.07 | Quản lý Người dùng & Phân quyền | 🟠 P1 |
| FR-04.06 | Xử lý hoàn trả (RMA) | 🟠 P1 |
| FR-04.07 | Tạo vận đơn giao hàng | 🟠 P1 |
| FR-04.08 | Theo dõi giao hàng | 🟠 P1 |
| FR-05.04 | Chuyển kho | 🟠 P1 |
| FR-05.05 | Kiểm kê tồn kho | 🟠 P1 |
| FR-05.06 | Lô hàng & HSD | 🟠 P1 |
| FR-05.07 | Cảnh báo tồn kho thấp | 🟠 P1 |
| FR-07.04 | Lịch sử giao dịch | 🟠 P1 |
| FR-07.05 | Đối soát thanh toán | 🟠 P1 |
| FR-07.06 | Xử lý hoàn tiền | 🟠 P1 |
| FR-11.01 ~ 11.07 | Nhân sự (CRUD NV, phòng ban, ca, chấm công, hoa hồng) | 🟠 P1 |
| FR-12.01 ~ 12.06 | NCC & Nhập hàng (CRUD NCC, PO, công nợ, đánh giá) | 🟠 P1 |

#### Phân công Sprint 4

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="5"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>📌 Return request (customer): <code>POST /api/v1/returns</code> — Tạo yêu cầu đổi trả (chọn SP, lý do, upload ảnh). Validate: chỉ đơn COMPLETED trong 7 ngày</td><td>T2</td></tr>
<tr><td>📌 Tracking cho customer: <code>GET /api/v1/orders/:id/tracking</code> (shipment info + status history + carrier tracking link)</td><td>T3</td></tr>
<tr><td>📌 Loyalty nâng cao: <code>GET /api/v1/customers/me/loyalty</code> (hạng, điểm, lịch sử). Đổi điểm: <code>POST /api/v1/customers/me/loyalty/redeem</code> (validate points, tạo coupon riêng)</td><td>T4</td></tr>
<tr><td>📌 Wishlist: <code>POST /api/v1/wishlists/toggle</code>, <code>GET /api/v1/wishlists</code>. Trả flag <code>is_wishlisted</code> trong product list/detail API cho logged-in user</td><td>T5</td></tr>
<tr><td>📌 Refund notification cho customer khi hoàn tiền thành công. Hoàn thiện notification cho tất cả event (return status, loyalty points earned)</td><td>T6</td></tr>

<tr><td rowspan="7"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>📌 User Management: <code>GET /api/v1/admin/users</code> (list, filter), <code>POST /api/v1/admin/users</code> (tạo staff, gửi email kích hoạt), <code>PUT /api/v1/admin/users/:id</code> (update role, status), <code>PUT /api/v1/admin/users/:id/permissions</code> (extra/revoked bitmask), <code>PUT /api/v1/admin/users/:id/stores</code> (assign stores). <code>GET /api/v1/admin/roles</code>, <code>GET /api/v1/admin/permissions</code></td><td>T2</td></tr>
<tr><td>📌 RMA Admin: <code>PUT /api/v1/admin/returns/:id/approve</code>, <code>/inspect</code> (phân loại condition + restock nếu RESALEABLE), <code>/complete</code> (tạo refund). Refund: <code>POST /api/v1/admin/refunds</code> (gọi gateway refund API). Lịch sử GD: <code>GET /api/v1/admin/payments</code></td><td>T3</td></tr>
<tr><td>📌 Shipment: <code>POST /api/v1/admin/orders/:id/shipments</code> (tích hợp GHN API adapter), Webhook <code>/api/v1/webhooks/shipments</code>. Đối soát: <code>GET /api/v1/admin/reconciliation</code></td><td>T4</td></tr>
<tr><td>📌 Inventory nâng cao: CRUD <code>/api/v1/admin/transfers</code> (create, approve, ship, receive, cancel — 2 bên cập nhật inventory + batches). CRUD <code>/api/v1/admin/stocktakes</code> (create, add items, complete → adjust inventory)</td><td>T4–T5</td></tr>
<tr><td>📌 Batches: <code>GET /api/v1/admin/batches</code> (filter sắp hết hạn, đã hết hạn, theo store). Cron expiry alert + low stock alert → tạo notifications</td><td>T5</td></tr>
<tr><td>📌 HR: <code>POST /api/v1/admin/employees</code> (tạo user + employee + assign store), <code>PUT /api/v1/admin/employees/:id</code>. CRUD <code>/api/v1/admin/departments</code>, CRUD <code>/api/v1/admin/shifts</code>. Attendance: <code>POST check-in/check-out</code>, <code>GET</code> list. Commission auto-calc service + <code>GET /api/v1/admin/commissions</code> + finalize month</td><td>T5–T6</td></tr>
<tr><td>📌 Supplier: CRUD <code>/api/v1/admin/suppliers</code>. PO: CRUD <code>/api/v1/admin/purchase-orders</code> (create, send, receive). Supplier payment: <code>POST /api/v1/admin/supplier-payments</code>, <code>GET balance</code>. Rating</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>📌 Trang yêu cầu đổi trả <code>/account/returns/new</code> — Chọn đơn → chọn SP cần trả → lý do → upload ảnh → submit. Danh sách đổi trả <code>/account/returns</code></td><td>T2–T3</td></tr>
<tr><td>📌 Section tracking trong chi tiết đơn — Timeline + link tracking bên ngoài. Notification bell cập nhật realtime (Socket.IO hoặc polling)</td><td>T3–T4</td></tr>
<tr><td>📌 Trang <code>/account/loyalty</code> — Hạng hiện tại, progress bar sang hạng kế tiếp, quyền lợi, lịch sử điểm. Trang đổi điểm lấy voucher</td><td>T5</td></tr>
<tr><td>📌 Icon trái tim (wishlist) trên product card + detail page — Filled/outlined toggle, login required. Trang <code>/account/wishlist</code> — Grid SP yêu thích, nút quick add-to-cart</td><td>T6</td></tr>

<tr><td rowspan="6"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>📌 Trang <code>/admin/users</code> — Bảng users, actions (edit, lock, unlock). Modal tạo/sửa user: form thông tin, dropdown role, multi-select stores. Tab phân quyền chi tiết: **checkbox matrix** hiển thị tất cả permissions theo module, toggle extra/revoked</td><td>T2–T3</td></tr>
<tr><td>📌 Trang RMA <code>/admin/returns</code> — Bảng danh sách, flow xử lý từng bước (approve → inspect → complete/reject). Form hoàn tiền. Trang <code>/admin/payments</code> — Lịch sử GD, export. Trang đối soát <code>/admin/reconciliation</code></td><td>T3–T4</td></tr>
<tr><td>📌 Modal tạo vận đơn trong chi tiết đơn — Chọn hãng VC (GHN/GHTK/...), xem cước phí, xác nhận, in phiếu. Trang <code>/admin/inventory/transfers</code> — Tạo phiếu chuyển kho, flow duyệt, nhận hàng + ghi chênh lệch</td><td>T4</td></tr>
<tr><td>📌 Trang <code>/admin/stocktakes</code> — Tạo phiếu kiểm kê, nhập SL thực tế, highlight chênh lệch, nút chốt cân bằng. Trang <code>/admin/batches</code> — Table lô hàng, highlight sắp/đã hết hạn, nút khóa lô. Widget cảnh báo tồn kho trên dashboard</td><td>T5</td></tr>
<tr><td>📌 HR: Trang <code>/admin/employees</code> (table + form thêm/sửa NV). Trang <code>/admin/departments</code>, <code>/admin/shifts</code> (CRUD). Trang <code>/admin/attendance</code> (calendar view, color-coded, monthly summary)</td><td>T5–T6</td></tr>
<tr><td>📌 Trang <code>/admin/commissions</code> (bảng hoa hồng, tổng hợp theo NV, nút chốt tháng). Trang <code>/admin/suppliers</code> (CRUD), <code>/admin/purchase-orders</code> (tạo PO, chọn SP, SL+giá, flow), <code>/admin/supplier-payments</code> (công nợ + thanh toán)</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>📌 Màn hình yêu cầu đổi trả — Chọn SP, lý do, upload ảnh (camera/gallery), submit. Danh sách đổi trả</td><td>T2–T3</td></tr>
<tr><td>📌 Tracking trong chi tiết đơn — Status stepper animation, link tracking. Push notification khi shipment status change</td><td>T3–T4</td></tr>
<tr><td>📌 Màn hình Loyalty — Membership card UI (gradient card), tier benefits, progress bar, lịch sử điểm. Đổi điểm lấy voucher</td><td>T5</td></tr>
<tr><td>📌 Wishlist — Heart icon toggle trên product card/detail, swipe to remove trong danh sách yêu thích. Quick add-to-cart từ wishlist</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 4:** RMA hoàn chỉnh. Phân quyền admin. Kho nâng cao. Hoàn tiền gateway. HR + NCC + PO. ✅ **Toàn bộ P1 hoàn thành**

---

### 📊 SPRINT 5 — Phân tích & Marketing

**Thời gian:** Tuần 5  
**Mục tiêu:** Dashboard Analytics, Báo cáo doanh thu, Khuyến mãi & Voucher, CMS (Blog/Banner/FAQ), Tags/Import SP.  
**Milestone:** Admin có dashboard phân tích đầy đủ. Marketing chạy được khuyến mãi. Website có blog/banner.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-09.01 | Dashboard tổng quan | 🟡 P2 |
| FR-09.02 | Báo cáo doanh thu | 🟡 P2 |
| FR-09.03 | Phân tích SP bán chạy/ế | 🟡 P2 |
| FR-09.07 | KPI nhân viên | 🟡 P2 |
| FR-09.08 | Export báo cáo | 🟡 P2 |
| FR-10.01 | Chương trình khuyến mãi | 🟡 P2 |
| FR-10.02 | Voucher/Coupon | 🟡 P2 |
| FR-10.03 | Banner quảng cáo | 🟡 P2 |
| FR-10.05 | Push Notification (admin gửi) | 🟡 P2 |
| FR-13.01 | Trang tĩnh (CMS) | 🟡 P2 |
| FR-13.02 | Blog | 🟡 P2 |
| FR-13.04 | FAQ | 🟡 P2 |
| FR-06.05 | Tags & Labels | 🟡 P2 |
| FR-06.06 | Import SP hàng loạt | 🟡 P2 |
| FR-02.08 | Đánh giá sản phẩm | 🟡 P2 |

#### Phân công Sprint 5

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="5"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>📌 Review: <code>POST /api/v1/reviews</code> (validate purchase, create), <code>GET /api/v1/products/:id/reviews</code> (paginate, filter by rating, sort). Cập nhật <code>products.avg_rating</code>, <code>total_reviews</code> khi admin approve</td><td>T2</td></tr>
<tr><td>📌 Public APIs CMS: <code>GET /api/v1/pages/:slug</code>, <code>GET /api/v1/blog/posts</code> (list, paginate), <code>GET /api/v1/blog/posts/:slug</code> (detail, increment views_count), <code>GET /api/v1/faqs</code> (group by category)</td><td>T3</td></tr>
<tr><td>📌 Public APIs Banner/Promo: <code>GET /api/v1/banners?position=HOME_HERO</code>, <code>GET /api/v1/promotions/active</code> (KM đang chạy cho product listing). <code>POST /api/v1/coupons/validate</code> (validate coupon code trước checkout)</td><td>T4</td></tr>
<tr><td>📌 Tích hợp promotion vào product listing: API <code>GET /api/v1/products</code> tính sale_price từ active promotions. Trang Flash Sale: API <code>GET /api/v1/promotions/flash-sale</code></td><td>T5</td></tr>
<tr><td>📌 FCM broadcast: nhận push từ admin notification service. Tối ưu Elasticsearch indexing cho products (reindex khi CRUD)</td><td>T6</td></tr>

<tr><td rowspan="6"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>📌 Dashboard API: <code>GET /api/v1/admin/dashboard</code> — Aggregation: doanh thu hôm nay, số đơn, AOV, KH mới, doanh thu 7 ngày (line), top 5 SP (bar), tỷ lệ Online vs POS (pie), đơn chờ xác nhận, tồn kho thấp</td><td>T2</td></tr>
<tr><td>📌 Reports: <code>GET /api/v1/admin/reports/revenue</code> (period, date range, store, staff). <code>GET /api/v1/admin/reports/products</code> (top selling, slow-moving). <code>GET /api/v1/admin/reports/staff-kpi</code>. <code>GET /api/v1/admin/reports/export</code> (PDF/Excel generation)</td><td>T3</td></tr>
<tr><td>📌 Promotions CRUD: <code>/api/v1/admin/promotions</code> (create, update, delete). Apply logic: auto-calculate sale price trên product khi promotion active. Coupons CRUD: <code>/api/v1/admin/coupons</code> (create, bulk generate). Review admin: <code>PUT /api/v1/admin/reviews/:id/approve</code>, <code>/reply</code></td><td>T4</td></tr>
<tr><td>📌 CMS: CRUD <code>/api/v1/admin/pages</code>, CRUD <code>/api/v1/admin/blog/posts</code> (WYSIWYG, schedule publish), CRUD <code>/api/v1/admin/blog/categories</code>, CRUD <code>/api/v1/admin/faqs</code>. Cron: publish scheduled blog posts</td><td>T5</td></tr>
<tr><td>📌 Banner CRUD: <code>/api/v1/admin/banners</code>. Push Notification admin: <code>POST /api/v1/admin/notifications/push</code> (target: all/segment/individual, FCM integration)</td><td>T5</td></tr>
<tr><td>📌 Product enhancements: Tag management trong product CRUD. <code>POST /api/v1/admin/products/import</code> (parse Excel, validate, bulk upsert), <code>GET /api/v1/admin/products/import-template</code></td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>📌 Section đánh giá trong trang chi tiết SP — Rating bars (5→1 sao), danh sách reviews (paginate), nút "Viết đánh giá" (star picker + textarea, chỉ khi đã mua)</td><td>T2</td></tr>
<tr><td>📌 Trang chủ nâng cao — Hero carousel banner (auto-slide, responsive, lazy load). Trang Flash Sale: countdown timer, limited stock indicator. Hiển thị giá KM trên product card: badge "SALE -20%", crossed price</td><td>T3–T4</td></tr>
<tr><td>📌 Trang <code>/blog</code> (listing ISR), <code>/blog/:slug</code> (detail SSR, related posts, social share). Trang <code>/faq</code> (accordion, group by category)</td><td>T4–T5</td></tr>
<tr><td>📌 Trang <code>/:slug</code> catch-all (About, Contact, Policy) — render HTML content SSR. Input mã giảm giá cập nhật trong checkout (validate + hiển thị số tiền giảm)</td><td>T5</td></tr>
<tr><td>📌 SEO toàn trang: cấu hình default meta tags, dynamic per-page, JSON-LD structured data (Product, Organization, BreadcrumbList, FAQPage). Sitemap.xml, robots.txt</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>📌 Trang <code>/admin/dashboard</code> — 🔥 KPI cards (Ant Design Statistic), Line chart doanh thu 7 ngày (Recharts), Bar chart top SP, Pie chart Online vs POS, Alert boxes (tồn kho thấp, đơn chờ)</td><td>T2–T3</td></tr>
<tr><td>📌 Trang <code>/admin/reports/revenue</code> — Date range picker, store selector, period selector (ngày/tuần/tháng), line/bar charts, data table. Trang <code>/admin/reports/products</code> — Leaderboard. Nút Export PDF/Excel trên mỗi trang</td><td>T3–T4</td></tr>
<tr><td>📌 Trang <code>/admin/promotions</code> — Form tạo KM (type, value, date range, min_order, applicable products/categories picker). Trang <code>/admin/coupons</code> — Table, form tạo voucher, bulk generate. Trang quản lý đánh giá — reviews chờ duyệt, approve/reject/reply</td><td>T4–T5</td></tr>
<tr><td>📌 CMS Admin: Trang <code>/admin/pages</code> (WYSIWYG TinyMCE/CKEditor, SEO fields). Trang <code>/admin/blog</code> (post list, editor, category manager, schedule picker). Trang <code>/admin/faqs</code> (table + form, drag-and-drop sort)</td><td>T5–T6</td></tr>
<tr><td>📌 Trang <code>/admin/banners</code> (image upload, link, position selector, date range). Trang push notification admin (title, message, target audience, send). Tag input autocomplete trong form SP. Trang import SP (upload, preview, error highlighting)</td><td>T6</td></tr>

<tr><td rowspan="4"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>📌 Màn hình viết đánh giá — Star rating picker, text input. Section đánh giá trong chi tiết SP (rating summary + list)</td><td>T2–T3</td></tr>
<tr><td>📌 Banner slider trang chủ — Horizontal scroll, deep-link navigation khi tap. Flash Sale section: countdown, badge sale</td><td>T3–T4</td></tr>
<tr><td>📌 Mục Blog/Beauty Tips — Blog feed, reading view. Input mã giảm giá trong checkout flow</td><td>T5</td></tr>
<tr><td>📌 Receive push notification từ admin broadcast. Deep-link handling (open specific screen from notification: order detail, promotion, blog post)</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 5:** Dashboard Analytics + Reports. Khuyến mãi + Voucher. Blog + Banner + FAQ. Đánh giá SP. Import SP. ✅ **Toàn bộ P2 chính hoàn thành**

---

### 🎯 SPRINT 6 — Hoàn thiện & Tinh chỉnh (Polish & Extras)

**Thời gian:** Tuần 6  
**Mục tiêu:** Hoàn thành P2 còn lại (RFM, dự báo, SEO nâng cao, email marketing, phân nhóm KH, thống kê chiến dịch), triển khai P3 (OAuth Google/Facebook), bug-fix, performance tuning, testing E2E, chuẩn bị deployment.  
**Milestone:** Sản phẩm hoàn chỉnh, sẵn sàng demo và deployment.

| FR | Chức năng | Ưu tiên |
|----|-----------|---------|
| FR-09.04 | Phân tích khách hàng RFM | 🟡 P2 |
| FR-09.05 | Phân tích xu hướng mua hàng | 🟡 P2 |
| FR-09.06 | Dự báo doanh thu | 🟡 P2 |
| FR-08.06 | Phân nhóm khách hàng | 🟠 P1 |
| FR-10.04 | Gửi Email Marketing | 🟡 P2 |
| FR-10.06 | Thống kê chiến dịch | 🟡 P2 |
| FR-06.07 | SEO Metadata nâng cao | 🟡 P2 |
| FR-13.05 | SEO toàn trang | 🟡 P2 |
| FR-11.07 | Báo cáo nhân sự | 🟠 P1 |
| FR-01.08 | Đăng nhập Google/Facebook | 🟢 P3 |
| — | Bug-fix, Performance tuning, E2E Testing | — |

#### Phân công Sprint 6

<table>
<thead>
<tr><th width="130">Thành viên</th><th>Công việc cụ thể</th><th width="60">Ngày</th></tr>
</thead>
<tbody>

<tr><td rowspan="5"><strong>Việt Trung</strong><br/><em>BE End-user</em></td>
<td>📌 OAuth2 Google: <code>POST /api/v1/auth/oauth/google</code> (verify Google ID token, create/link user + user_oauth_accounts). OAuth2 Facebook: <code>POST /api/v1/auth/oauth/facebook</code></td><td>T2</td></tr>
<tr><td>📌 SEO: <code>GET /api/v1/sitemap.xml</code> (auto-generate từ products, categories, blog posts, pages). <code>GET /api/v1/robots.txt</code></td><td>T3</td></tr>
<tr><td>📌 Performance tuning: Redis caching cho product list/detail (invalidate on update), rate limiting tất cả public APIs, query optimization (N+1, index review)</td><td>T4</td></tr>
<tr><td>📌 🐛 Bug-fix backlog: sửa tất cả issues từ Sprint 1-5, edge cases checkout, payment callback retry, notification dedup</td><td>T5</td></tr>
<tr><td>📌 API documentation review: Swagger/OpenAPI spec hoàn chỉnh cho tất cả end-user APIs. Postman collection export</td><td>T6</td></tr>

<tr><td rowspan="6"><strong>Thành Lập</strong><br/><em>BE Admin</em></td>
<td>📌 RFM Analysis: <code>GET /api/v1/admin/reports/rfm</code> — Tính R (recency), F (frequency), M (monetary) cho từng KH → auto segment. Customer segmentation: <code>GET /api/v1/admin/customers/segments</code></td><td>T2</td></tr>
<tr><td>📌 Trend Analysis: <code>GET /api/v1/admin/reports/trends</code> (time-series, category trends). Revenue Forecast: <code>GET /api/v1/admin/reports/forecast</code> (simple moving average / linear regression)</td><td>T3</td></tr>
<tr><td>📌 Email Marketing service (SendGrid/SES): template-based email, bulk send, tracking open/click. <code>POST /api/v1/admin/email-campaigns</code>. Campaign stats: <code>GET /api/v1/admin/promotions/:id/stats</code> (usage, revenue, ROI)</td><td>T4</td></tr>
<tr><td>📌 HR Report: <code>GET /api/v1/admin/reports/hr</code> (tổng NV, theo phòng ban, tỷ lệ nghỉ). Staff KPI chi tiết</td><td>T4</td></tr>
<tr><td>📌 🐛 Bug-fix backlog admin: sửa tất cả issues, POS edge cases (split payment rounding, concurrent session), inventory transaction consistency check</td><td>T5</td></tr>
<tr><td>📌 Admin API documentation review: Swagger hoàn chỉnh cho tất cả admin APIs. Database index review & optimization. Chuẩn bị Docker production build, environment variables, seed data production</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Tuấn Anh</strong><br/><em>FE Web</em></td>
<td>📌 Nút "Đăng nhập bằng Google/Facebook" — Google Sign-In SDK, Facebook Login SDK trên trang /login và /register</td><td>T2</td></tr>
<tr><td>📌 SEO review toàn trang: kiểm tra tất cả meta tags, canonical URLs, structured data (JSON-LD), Open Graph tags, image alt text. Lighthouse audit → optimize (Web Vitals: LCP, FID, CLS)</td><td>T3</td></tr>
<tr><td>📌 Trang <code>/brand/:slug</code> — Landing page thương hiệu (banner, giới thiệu, SP của brand). Responsive review toàn bộ pages (320px → 4K)</td><td>T4</td></tr>
<tr><td>📌 🐛 Bug-fix backlog FE: UX polish, loading states, error boundaries, empty states, skeleton loaders. Accessibility review (WCAG 2.1 AA)</td><td>T5</td></tr>
<tr><td>📌 Cross-browser testing (Chrome, Firefox, Safari, Edge). Performance optimization: lazy loading images, code splitting, bundle size analysis. Chuẩn bị production build</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Văn Tân</strong><br/><em>FE Admin</em></td>
<td>📌 Trang <code>/admin/reports/customers</code> — RFM matrix visualization (scatter plot hoặc heatmap), segment breakdown cards. Trang phân nhóm KH: biểu đồ RFM, danh sách KH theo nhóm</td><td>T2</td></tr>
<tr><td>📌 Trang trends <code>/admin/reports/trends</code> — Multi-line chart, heatmap theo giờ/ngày. Trang dự báo — biểu đồ thực tế vs dự báo, confidence interval</td><td>T3</td></tr>
<tr><td>📌 Email marketing admin: template editor (drag-and-drop hoặc code), audience selector (segments), send/schedule. Campaign stats dashboard (charts, KPI cards)</td><td>T4</td></tr>
<tr><td>📌 SEO settings page (cấu hình default OG image, site description). Trang <code>/admin/reports/hr</code> (KPI cards, charts). Admin global: notification center, breadcrumb polish</td><td>T5</td></tr>
<tr><td>📌 🐛 Bug-fix backlog Admin: UX polish toàn bộ admin pages, loading states, form validation review, table sort/filter edge cases. Responsive review admin (tablet). Production build optimization</td><td>T6</td></tr>

<tr><td rowspan="5"><strong>Văn Kim</strong><br/><em>Mobile</em></td>
<td>📌 Nút OAuth login — Native OAuth flow (Expo AuthSession): Google Sign-In, Facebook Login</td><td>T2</td></tr>
<tr><td>📌 Polish UI: Skeleton loaders, empty states, error handling, pull-to-refresh tất cả lists, haptic feedback. Biometric login (FaceID/Fingerprint) với Expo LocalAuthentication</td><td>T3</td></tr>
<tr><td>📌 Deep-link handling hoàn chỉnh: product detail, order detail, blog post, promotion page. Universal Links (iOS) + App Links (Android)</td><td>T4</td></tr>
<tr><td>📌 🐛 Bug-fix backlog Mobile: fix tất cả issues từ Sprint 1-5, test trên nhiều device sizes, Android + iOS quirks</td><td>T5</td></tr>
<tr><td>📌 App Store preparation: app icons, splash screen, screenshots, store listing. Build production APK/IPA. Performance profiling (Flipper/React DevTools)</td><td>T6</td></tr>

</tbody>
</table>

> **Deliverable Sprint 6:** RFM + Trends + Forecast analytics. OAuth login. Email Marketing. SEO hoàn chỉnh. Bug-fix & Performance. ✅ **Sản phẩm hoàn chỉnh P0-P3, sẵn sàng deployment**

---

## 5. Tổng hợp Timeline & FR Coverage

### 5.1 Ma trận Sprint × FR Module

| Module | S1 | S2 | S3 | S4 | S5 | S6 |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|
| **FR-01** Auth | ✅ 01~04 | | ✅ 05~06 | ✅ 07 | | ✅ 08 |
| **FR-02** Mua hàng | ✅ 01~03 | ✅ 04~06 | | | ✅ 07~08 | |
| **FR-03** POS | | | ✅ 01~06 | | | |
| **FR-04** Đơn hàng | | ✅ 01~05 | | ✅ 06~08 | | |
| **FR-05** Kho hàng | | | ✅ 01~03 | ✅ 04~07 | | |
| **FR-06** Sản phẩm | ✅ 01~04 | | | | ✅ 05~06 | ✅ 07 |
| **FR-07** Thanh toán | | ✅ 02 | ✅ 01, 03 | ✅ 04~06 | | |
| **FR-08** KH & CRM | | ✅ 01~03 | | ✅ 04~05, 07 | | ✅ 06 |
| **FR-09** Analytics | | | | | ✅ 01~03, 07~08 | ✅ 04~06 |
| **FR-10** Marketing | | | | | ✅ 01~03, 05 | ✅ 04, 06 |
| **FR-11** Nhân sự | | | | ✅ 01~06 | | ✅ 07 |
| **FR-12** NCC | | | | ✅ 01~06 | | |
| **FR-13** CMS | | | | | ✅ 01~04 | ✅ 05 |

### 5.2 Burn-down theo Priority

| Sprint | P0 hoàn thành | P1 hoàn thành | P2 hoàn thành | P3 hoàn thành |
|:------:|:------------:|:------------:|:------------:|:------------:|
| S1 | 11/28 | 0/22 | 0/18 | 0/3 |
| S2 | 23/28 | 0/22 | 0/18 | 0/3 |
| S3 | **28/28 ✅** | 2/22 | 0/18 | 0/3 |
| S4 | ✅ | **22/22 ✅** | 0/18 | 0/3 |
| S5 | ✅ | ✅ | 15/18 | 0/3 |
| S6 | ✅ | ✅ | **18/18 ✅** | **3/3 ✅** |

### 5.3 Workload mỗi thành viên (ước lượng)

| Thành viên | S1 | S2 | S3 | S4 | S5 | S6 | Ghi chú |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|---------|
| Việt Trung | 🟡 | 🔴 | 🔴 | 🟡 | 🟡 | 🟡 | S2-S3 nặng nhất (checkout + payment) |
| Thành Lập | 🔴 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | S1 nặng (migration + seed), S3-S5 nặng (POS + inventory + reports) |
| Tuấn Anh | 🟡 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 | S2 nặng nhất (cart → checkout → order pages) |
| Văn Tân | 🟡 | 🟡 | 🔴 | 🔴 | 🔴 | 🟡 | S3-S5 nặng nhất (POS UI + inventory + dashboard + CMS) |
| Văn Kim | 🟡 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 | S2 nặng nhất (cart → checkout → orders mobile) |

> 🔴 = Tải cao (>= 40h/tuần, có thể OT) · 🟡 = Tải trung bình (~35-40h/tuần)

---

## 6. Rủi ro & Phương án dự phòng

| # | Rủi ro | Xác suất | Tác động | Phương án |
|---|--------|----------|----------|-----------|
| R1 | Tích hợp Payment Gateway (VNPay/MoMo) bị delay do đợi sandbox credentials | Cao | Chặn checkout flow | Dùng mock payment adapter trước, switch sang real khi có credentials |
| R2 | POS barcode scanner không hoạt động trên một số browser | Trung bình | UX kém cho POS | Fallback: cho phép tìm SP bằng tên/SKU thay vì scan |
| R3 | Thành Lập quá tải S3-S5 (POS + Inventory + Reports) | Cao | Delay delivery | Việt Trung hỗ trợ viết một số API admin (reports, CMS) khi rảnh S4-S5 |
| R4 | Elasticsearch setup phức tạp, delay search feature | Trung bình | Search kém hiệu quả | Fallback S1: dùng PostgreSQL full-text search (tsvector), migrate sang ES sau |
| R5 | Mobile build iOS gặp vấn đề signing/provisioning | Trung bình | Không test được trên iOS | Ưu tiên test Android trước, iOS signing setup sớm tuần 1 |
| R6 | API 3PL (GHN/GHTK) sandbox không ổn định | Trung bình | Không tạo được vận đơn | Dùng mock carrier adapter, hiển thị tracking thủ công |

---

## 7. Ceremonies & Communication

| Hoạt động | Thời gian | Nội dung |
|-----------|-----------|----------|
| **Daily Standup** | Hàng ngày, 9:00 AM, 15 phút | Mỗi người: Hôm qua làm gì? Hôm nay làm gì? Blocker nào? |
| **Sprint Planning** | Thứ 2 đầu sprint, 1 giờ | Review backlog, phân task chi tiết, commit sprint goal |
| **Sprint Review** | Thứ 6 cuối sprint, 1 giờ | Demo chức năng, collect feedback, review metrics |
| **Sprint Retro** | Thứ 6 cuối sprint, 30 phút | Went well / To improve / Action items |
| **Code Review** | Ongoing | PR phải có ít nhất 1 approval. BE review chéo, FE review chéo |
| **API Sync** | Thứ 3 + Thứ 5, 30 phút | BE + FE sync API contract, resolve integration issues |

---

> **Ghi chú cuối:**  
> Kế hoạch này là bản baseline, sẽ được adjust sau mỗi Sprint Retro dựa trên velocity thực tế.  
> Nếu P0 bị delay → hy sinh P3 trước, sau đó P2, để đảm bảo MVP đúng tiến độ.  
> Mọi thay đổi scope phải được thống nhất trong Sprint Planning.
