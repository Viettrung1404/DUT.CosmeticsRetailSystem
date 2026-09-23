# 📋 Tài Liệu Giải Thích Chi Tiết Các File Thay Đổi — Sprint 1 (BE End-user)

**Dự án:** GlowUp — Cosmetics Retail System  
**Thực hiện:** Backend End-user (Việt Trung)  
**Phạm vi:** Hoàn thiện nền tảng Authentication, bảo mật phân quyền RBAC Bitmask, Catalog sản phẩm & tìm kiếm nâng cao (Elasticsearch + Fallback DB), Cây danh mục đa cấp, Toàn bộ Swagger API Docs và 100% Unit Tests.  
**Kiến trúc:** Clean Architecture & Domain-Driven Design (DDD) trên nền tảng NestJS 10, Prisma ORM, Neon PostgreSQL 17 và Elasticsearch.

---

## 📑 Mục Lục
1. [Cấu Hình Dự Án & Môi Trường](#1-cấu-hình-dự-án--môi-trường)
2. [Tầng Core (Bảo Mật & Phân Quyền)](#2-tầng-core-bảo-mật--phân-quyền)
3. [Phân Hệ Authentication (`src/modules/auth`)](#3-phân-hệ-authentication-srcmodulesauth)
4. [Phân Hệ Products & Catalog (`src/modules/products`)](#4-phân-hệ-products--catalog-srcmodulesproducts)
5. [Phân Hệ Categories (`src/modules/categories`)](#5-phân-hệ-categories-srcmodulescategories)
6. [Tầng Root Application](#6-tầng-root-application)
7. [Hệ Thống Unit Test (`*.spec.ts`)](#7-hệ-thống-unit-test-spects)

---

## 1. Cấu Hình Dự Án & Môi Trường

### 📄 [`backend/package.json`](file:///d:/VS_Code/DUT/PBL6/backend/package.json)
* **Mục đích:** Khai báo danh sách các thư viện phục vụ Sprint 1 và cấu hình Jest test runner.
* **Các thay đổi chính:**
  - Cài đặt thư viện email `nodemailer`, `@types/nodemailer`.
  - Cài đặt engine tìm kiếm `@elastic/elasticsearch` và `@nestjs/elasticsearch`.
  - Cài đặt thư viện mã hóa `bcrypt`, `@types/bcrypt`, `uuid`, `@types/uuid`.
  - Bổ sung cấu hình `moduleNameMapper` trong mục `"jest"`: ánh xạ các path alias `@core/*`, `@modules/*`, `@infrastructure/*` giúp Jest resolve chính xác đường dẫn khi chạy test mà không cần biên dịch trước.

### 📄 [`backend/.env`](file:///d:/VS_Code/DUT/PBL6/backend/.env)
* **Mục đích:** Lưu trữ các biến môi trường cấu hình bí mật và tham số runtime.
* **Các biến bổ sung:**
  - `JWT_SECRET`: Khóa bí mật ký Access Token.
  - `JWT_EXPIRES_IN`: Thời hạn Access Token (`15m`).
  - `JWT_REFRESH_SECRET`: Khóa ký Refresh Token.
  - `JWT_REFRESH_EXPIRES_IN`: Thời hạn Refresh Token (`7d`).
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Cấu hình gửi mail xác thực qua giao thức SMTP.
  - `FRONTEND_URL`: Đường dẫn Web frontend (`http://localhost:3000`) dùng để tạo link xác thực email / reset mật khẩu.
  - `ELASTICSEARCH_NODE`: Địa chỉ node Elasticsearch (`http://localhost:9200`).

---

## 2. Tầng Core (Bảo Mật & Phân Quyền)

### 📄 [`src/core/guards/jwt-auth.guard.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/guards/jwt-auth.guard.ts)
* **Mục đích:** Global Guard kiểm tra tính hợp lệ của JSON Web Token trên mọi request đến hệ thống.
* **Chi tiết kỹ thuật:**
  - Đọc metadata `IS_PUBLIC_KEY`: nếu route có gắn decorator `@Public()` thì tự động cho qua mà không kiểm tra token.
  - Trích xuất token từ header `Authorization: Bearer <token>`.
  - Giải mã và xác thực token bằng `JWT_SECRET`.
  - Đính kèm payload đã giải mã (`userId`, `roleId`, `roleName`, `dataScope`, `permissionCodes`) vào object `request.user` để các controller và guard phía sau sử dụng.

### 📄 [`src/core/guards/permission.guard.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/guards/permission.guard.ts)
* **Mục đích:** Guard phân quyền dựa trên mã quyền (Permission Codes) thu được từ giải mã bitmask 53-bit.
* **Chi tiết kỹ thuật:**
  - Đọc danh sách quyền yêu cầu từ decorator `@RequirePermissions(...)`.
  - Nếu route không yêu cầu quyền đặc biệt $\rightarrow$ cho phép truy cập.
  - Đối chiếu danh sách quyền yêu cầu với mảng `request.user.permissionCodes`. Nếu thiếu bất kỳ quyền nào, ném lỗi `ForbiddenException` (HTTP 403).

### 📄 [`src/core/decorators/public.decorator.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/decorators/public.decorator.ts)
* **Mục đích:** Đánh dấu một route là công khai, cho phép người dùng chưa đăng nhập hoặc khách vãng lai (Guest) truy cập.

### 📄 [`src/core/decorators/current-user.decorator.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/decorators/current-user.decorator.ts)
* **Mục đích:** Custom Param Decorator giúp trích xuất thông tin người dùng từ `request.user` trực tiếp vào tham số của controller một cách ngắn gọn, an toàn (VD: `@CurrentUser() user: JwtPayload` hoặc `@CurrentUser('userId') userId: string`).

### 📄 [`src/core/decorators/require-permissions.decorator.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/decorators/require-permissions.decorator.ts)
* **Mục đích:** Gắn nhãn các mã quyền bắt buộc lên controller hoặc method (VD: `@RequirePermissions('PRODUCT_CREATE', 'PRODUCT_UPDATE')`).

### 📄 [`src/core/database/unit-of-work.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/database/unit-of-work.interface.ts)
* **Mục đích:** Định nghĩa hợp đồng Unit of Work (`IUnitOfWork`) và Injection Token (`UNIT_OF_WORK`) phục vụ quản lý Database Transaction nguyên tử (ACID) theo chuẩn Clean Architecture.
* **Chi tiết kỹ thuật:**
  - Cung cấp phương thức `runInTransaction<T>(work: () => Promise<T>): Promise<T>`.
  - Giúp tầng Application điều phối transaction liên bảng mà **không bị phụ thuộc (tightly coupled) vào Prisma ORM**.
  - Kết hợp cùng `AsyncLocalStorage` trong [`PrismaService`](file:///d:/VS_Code/DUT/PBL6/backend/src/infrastructure/database/prisma.service.ts) và [`PrismaUnitOfWork`](file:///d:/VS_Code/DUT/PBL6/backend/src/infrastructure/database/prisma-unit-of-work.ts): mọi Repository được gọi bên trong callback `runInTransaction` tự động dùng chung transaction client thông qua ES6 Proxy, tự động rollback toàn bộ nếu có lỗi và hỗ trợ nested transaction an toàn.
  - Được áp dụng ngay trên 4 Use Cases trọng yếu: `VerifyEmailUseCase`, `ResetPasswordUseCase`, `RefreshTokenUseCase`, và `RegisterUseCase`.

---

## 3. Phân Hệ Authentication (`src/modules/auth`)

Được thiết kế theo chuẩn **Clean Architecture** gồm 4 tầng độc lập:

```
src/modules/auth/
├── domain/                  # Lõi nghiệp vụ (Entities, Repository Interfaces)
├── application/             # Các kịch bản sử dụng (Use Cases, Ports)
├── infrastructure/          # Chi tiết công nghệ (Prisma Repos, Adapters, Mappers)
└── presentation/            # Giao tiếp người dùng (Controllers, DTOs)
```

### 3.1. Domain Layer (Lõi Nghiệp Vụ)

#### 📄 [`src/modules/auth/domain/entities/user.entity.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/domain/entities/user.entity.ts)
* **Mục đích:** Entity thuần túy đại diện cho Người dùng, hoàn toàn không phụ thuộc vào bất kỳ framework bên ngoài nào (NestJS, Prisma).
* **Quy tắc nghiệp vụ (Business Rules):**
  - `validatePassword(password)`: Kiểm tra độ mạnh mật khẩu — tối thiểu 8 ký tự, phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.
  - `validateEmail(email)`: Kiểm tra cấu trúc email hợp lệ bằng biểu thức chính quy (Regex).
  - `canLogin()`: Chỉ cho phép đăng nhập khi trạng thái tài khoản là `ACTIVE`.
  - `isEmailVerified()`, `verifyEmail()`, `verifyPhone()`, `updateLastLogin()`.
  - `getEffectivePermissions()`: Tính toán quyền hạn hiệu dụng bằng phép toán bitwise:
    $$\text{Effective} = (\text{role\_permissions} \mid \text{extra\_permissions}) \ \& \sim\text{revoked\_permissions}$$

#### 📄 [`src/modules/auth/domain/repositories/user.repository.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/domain/repositories/user.repository.interface.ts)
* **Mục đích:** Định nghĩa Contract (Interface Port) thao tác dữ liệu người dùng: tìm theo ID/Email/Phone, tạo mới, cập nhật, cập nhật thời gian đăng nhập cuối, tạo customer và liên kết khách hàng POS vãng lai theo số điện thoại.

#### 📄 [`src/modules/auth/domain/repositories/verification-token.repository.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/domain/repositories/verification-token.repository.interface.ts)
* **Mục đích:** Contract quản lý mã xác thực email và đặt lại mật khẩu: lưu token hash SHA-256, tìm kiếm token, đánh dấu đã dùng, đếm số lần gửi gần nhất (phục vụ Rate Limiting) và vô hiệu hóa tất cả token cũ.

#### 📄 [`src/modules/auth/domain/repositories/user-session.repository.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/domain/repositories/user-session.repository.interface.ts)
* **Mục đích:** Contract quản lý phiên đăng nhập và Refresh Token trong bảng `user_sessions`: tạo session, tìm kiếm theo Refresh Token, thu hồi session (Logout), thu hồi toàn bộ session (khi đổi mật khẩu) để kích hoạt Token Rotation.

---

### 3.2. Application Layer (Use Cases & Ports)

#### 📄 [`src/modules/auth/application/ports/email.port.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/ports/email.port.ts)
* **Mục đích:** Interface Port cho dịch vụ gửi email: gửi email xác thực, email chào mừng thành viên, email reset mật khẩu và email cảnh báo mật khẩu đã thay đổi.

#### 📄 [`src/modules/auth/application/use-cases/register.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/register.use-case.ts)
* **Mục đích:** Xử lý nghiệp vụ đăng ký tài khoản khách hàng mới.
* **Quy trình:**
  1. Validate định dạng email và độ mạnh mật khẩu qua `UserEntity`.
  2. Kiểm tra tính duy nhất của email trong cơ sở dữ liệu.
  3. Băm mật khẩu bằng `BcryptService` (salt 10 vòng).
  4. Tạo thực thể `UserEntity` với `roleId = 6` (Customer), `status = ACTIVE`, `emailVerified = false`.
  5. Tạo bản ghi khách hàng tương ứng trong bảng `customers`. Nếu người dùng đăng ký có cung cấp số điện thoại đã từng mua hàng tại POS (khách vãng lai chưa có tài khoản online), tự động liên kết tài khoản mới với dữ liệu mua hàng cũ (POS merge).
  6. Tạo chuỗi token ngẫu nhiên 32-byte an toàn (`crypto.randomBytes`), băm SHA-256 lưu vào `verification_tokens` (hạn 5 phút).
  7. Gửi email xác thực tài khoản kèm liên kết kích hoạt.

#### 📄 [`src/modules/auth/application/use-cases/verify-email.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/verify-email.use-case.ts)
* **Mục đích:** Xác thực tài khoản người dùng qua token gửi từ liên kết trong email.
* **Quy trình:**
  1. Băm token đầu vào bằng SHA-256 để tìm kiếm trong bảng `verification_tokens`.
  2. Kiểm tra tính hợp lệ: token có tồn tại không, đã bị sử dụng chưa, đã hết hạn chưa.
  3. Cập nhật trạng thái `email_verified = true` cho tài khoản người dùng.
  4. Đánh dấu token đã sử dụng (`is_used = true`).
  5. Gửi email chúc mừng và chào mừng gia nhập GlowUp.

#### 📄 [`src/modules/auth/application/use-cases/resend-otp.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/resend-otp.use-case.ts)
* **Mục đích:** Gửi lại mã xác thực email khi mã cũ hết hạn.
* **Quy tắc an toàn:**
  - Kiểm tra xem email đã được xác thực chưa.
  - **Rate Limiting:** Kiểm tra số lượng token đã gửi trong 1 giờ qua. Nếu đã gửi $\ge 3$ lần $\rightarrow$ từ chối với mã lỗi `429 Too Many Requests`.
  - Vô hiệu hóa toàn bộ token cũ chưa dùng của tài khoản đó.
  - Sinh token mới và gửi email.

#### 📄 [`src/modules/auth/application/use-cases/login.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/login.use-case.ts)
* **Mục đích:** Xử lý đăng nhập tài khoản.
* **Quy trình:**
  1. Tìm tài khoản theo email, đối chiếu mật khẩu đã băm bằng `BcryptService.compare`.
  2. Kiểm tra trạng thái tài khoản: ném lỗi nếu tài khoản bị khóa (`BANNED`) hoặc ngưng hoạt động (`INACTIVE`).
  3. Kiểm tra xác thực email: bắt buộc email đã được xác thực mới cho phép đăng nhập.
  4. Tính toán Effective Permissions và ánh xạ sang danh sách chuỗi `permission_code[]`.
  5. Cấp cặp token: **Access Token** (hạn 15 phút, chứa thông tin vai trò, phạm vi dữ liệu và quyền hạn) và **Refresh Token** (hạn 7 ngày).
  6. Lưu Refresh Token vào bảng `user_sessions` kèm IP và thiết bị (`user-agent`).
  7. Cập nhật dấu thời gian `last_login_at`.

#### 📄 [`src/modules/auth/application/use-cases/refresh-token.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/refresh-token.use-case.ts)
* **Mục đích:** Cấp lại Access Token mới khi token cũ hết hạn bằng kỹ thuật **Refresh Token Rotation**.
* **Bảo mật cao cấp:**
  1. Tra cứu session theo refresh token.
  2. Kiểm tra xem session có bị thu hồi (`is_revoked`) hoặc hết hạn chưa.
  3. **Token Rotation:** Đánh dấu thu hồi ngay lập tức session cũ (`revokeById`) nhằm ngăn chặn nguy cơ token replay attack.
  4. Tạo cặp Access Token và Refresh Token hoàn toàn mới, lưu bản ghi session mới và trả về cho client.

#### 📄 [`src/modules/auth/application/use-cases/logout.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/logout.use-case.ts)
* **Mục đích:** Thu hồi session đăng nhập hiện tại bằng cách đánh dấu `is_revoked = true` cho refresh token tương ứng.

#### 📄 [`src/modules/auth/application/use-cases/forgot-password.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/forgot-password.use-case.ts)
* **Mục đích:** Yêu cầu đặt lại mật khẩu qua email.
* **Nguyên tắc an toàn:** Luôn trả về thông báo trung tính *"Nếu email tồn tại, link đặt lại mật khẩu đã được gửi"* ngay cả khi email không có trong hệ thống, nhằm ngăn ngừa tấn công dò quét tài khoản (User Enumeration Attack).

#### 📄 [`src/modules/auth/application/use-cases/reset-password.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/reset-password.use-case.ts)
* **Mục đích:** Đặt lại mật khẩu mới bằng mã xác nhận nhận được từ email.
* **Quy trình:**
  1. Kiểm tra độ mạnh của mật khẩu mới theo chuẩn bảo mật.
  2. Xác minh token reset trong cơ sở dữ liệu.
  3. Băm mật khẩu mới và lưu vào tài khoản.
  4. Đánh dấu token đã sử dụng.
  5. **Bảo mật tuyệt đối:** Thu hồi toàn bộ các phiên đăng nhập khác của người dùng (`revokeAllByUserId`) buộc đăng nhập lại trên tất cả thiết bị.

---

### 3.3. Infrastructure Layer (Adapters & Repositories)

#### 📄 [`src/modules/auth/infrastructure/adapters/bcrypt.service.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/adapters/bcrypt.service.ts)
* **Mục đích:** Adapter bọc thư viện `bcrypt` cung cấp 2 hàm: `hash(plain)` và `compare(plain, hash)`.

#### 📄 [`src/modules/auth/infrastructure/adapters/jwt.service.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/adapters/jwt.service.ts)
* **Mục đích:** Adapter ký và giải mã JWT token: `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`.

#### 📄 [`src/modules/auth/infrastructure/adapters/nodemailer-email.service.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/adapters/nodemailer-email.service.ts)
* **Mục đích:** Triển khai `IEmailService` sử dụng thư viện `nodemailer`.
* **Đặc điểm nổi bật:**
  - Định dạng sẵn các mẫu email HTML sang trọng mang thương hiệu GlowUp (nút bấm CTA, màu sắc hồng cánh sen nhận diện).
  - Tự động fallback ghi log ra màn hình console nếu hệ thống chạy ở môi trường dev chưa cấu hình thông số SMTP, giúp việc phát triển không bị gián đoạn.

#### 📄 [`src/modules/auth/infrastructure/mappers/user.mapper.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/mappers/user.mapper.ts)
* **Mục đích:** Chuyển đổi dữ liệu hai chiều:
  - `toDomain`: Từ Prisma Model (`raw`) kèm quan hệ Role sang thực thể `UserEntity`.
  - `toPersistence`: Từ `UserEntity` sang object cấu trúc lưu trữ cơ sở dữ liệu.

#### 📄 [`src/modules/auth/infrastructure/persistence/prisma-user.repository.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/persistence/prisma-user.repository.ts)
* **Mục đích:** Triển khai `IUserRepository` thao tác trực tiếp với cơ sở dữ liệu PostgreSQL qua Prisma Client.

#### 📄 [`src/modules/auth/infrastructure/persistence/prisma-verification-token.repository.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/persistence/prisma-verification-token.repository.ts)
* **Mục đích:** Triển khai `IVerificationTokenRepository` thao tác với bảng `verification_tokens`.

#### 📄 [`src/modules/auth/infrastructure/persistence/prisma-user-session.repository.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/infrastructure/persistence/prisma-user-session.repository.ts)
* **Mục đích:** Triển khai `IUserSessionRepository` thao tác với bảng `user_sessions`.

---

### 3.4. Presentation Layer (Controllers & DTOs)

#### 📄 [`src/modules/auth/presentation/dtos/auth.dto.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/presentation/dtos/auth.dto.ts)
* **Mục đích:** Định nghĩa các Data Transfer Objects (DTOs) với đầy đủ decorator `@ApiProperty` phục vụ Swagger API Docs và các validation rule (`@IsEmail`, `@MinLength`, `@Matches` regex):
  - `RegisterDto`, `LoginDto`, `VerifyEmailDto`, `ResendOtpDto`, `RefreshTokenDto`, `LogoutDto`, `ForgotPasswordDto`, `ResetPasswordDto`.
  - `LoginResponseDto`, `RefreshTokenResponseDto`, `MessageResponseDto`, `AuthUserDto`.

#### 📄 [`src/modules/auth/presentation/controllers/auth.controller.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/presentation/controllers/auth.controller.ts)
* **Mục đích:** REST Controller tiếp nhận và phản hồi các request tại prefix `/api/v1/auth`:
  - `POST /register`: Đăng ký tài khoản (Public).
  - `POST /login`: Đăng nhập, tự động trích xuất IP và User-Agent (Public).
  - `POST /verify-email`: Xác thực tài khoản (Public).
  - `POST /resend-verification`: Gửi lại email xác thực (Public).
  - `POST /refresh-token`: Làm mới Access Token (Public).
  - `POST /logout`: Đăng xuất (Public/Protected).
  - `POST /forgot-password`: Yêu cầu link reset mật khẩu (Public).
  - `POST /reset-password`: Đổi mật khẩu mới (Public).
  - `GET /me`: Lấy thông tin tài khoản hiện tại (Protected - yêu cầu JWT Bearer Token).

#### 📄 [`src/modules/auth/auth.module.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/auth.module.ts)
* **Mục đích:** NestJS Module liên kết toàn bộ Controller, Use Cases, Service Adapters và ánh xạ Dependency Injection từ Interface Port sang Implementation (Repository Mapping).

---

## 4. Phân Hệ Products & Catalog (`src/modules/products`)

### 4.1. Domain & Mappers

#### 📄 [`src/modules/products/domain/entities/product.entity.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/domain/entities/product.entity.ts)
* **Mục đích:** Nâng cấp thực thể `ProductEntity` mở rộng các quan hệ phục vụ hiển thị chi tiết: `images` (danh sách ảnh, ảnh chính), `variants` (các tùy chọn dung tích/màu sắc kèm giá và tồn kho), `ingredients` (thành phần mỹ phẩm, đánh dấu thành phần chính `isKeyIngredient`), `tags` (nhãn sản phẩm), `brandName`, `categoryName`, `primaryImageUrl`.

#### 📄 [`src/modules/products/domain/repositories/product.repository.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/domain/repositories/product.repository.interface.ts)
* **Mục đích:** Mở rộng interface `IProductRepository` với các hàm nghiệp vụ:
  - `findFiltered(filter)`: Tìm kiếm và lọc sản phẩm đa tiêu chí.
  - `search(query, options)`: Tìm kiếm toàn văn full-text search.
  - `suggest(query, limit)`: Gợi ý autocomplete.
  - `findRelated(productId, categoryId, brandId, limit)`: Lấy sản phẩm liên quan.

#### 📄 [`src/modules/products/infrastructure/mappers/product.mapper.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/infrastructure/mappers/product.mapper.ts)
* **Mục đích:** Cập nhật ánh xạ toàn bộ dữ liệu quan hệ từ Prisma sang `ProductEntity` (bao gồm `images`, `ingredients`, `tags`, `brand`, `category`).

---

### 4.2. Tìm Kiếm Nâng Cao & Elasticsearch

#### 📄 [`src/modules/products/infrastructure/search/elasticsearch-product.service.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/infrastructure/search/elasticsearch-product.service.ts)
* **Mục đích:** Động cơ tìm kiếm full-text search chuẩn hóa bằng Elasticsearch.
* **Chi tiết kỹ thuật:**
  - `initIndex()`: Khởi tạo index `products` với custom analyzer **`vietnamese_analyzer`** (tokenizer `standard`, filter `['lowercase', 'asciifolding']` cho phép tìm kiếm tiếng Việt không dấu vẫn khớp chính xác tiếng Việt có dấu, VD: *"son duong"* tìm được *"Son Dưỡng"*).
  - `search(query, from, size)`: Thực hiện truy vấn `multi_match` trên các trường kèm trọng số: `name^3` (tên nhân 3 trọng số), `brandName^2` (thương hiệu nhân 2 trọng số), `ingredients`, `categoryName`, `tags` kết hợp thuật toán **Fuzzy Search** (`fuzziness: 'AUTO'`).
  - `suggest(query, limit)`: Gợi ý tìm kiếm nhanh (Autocomplete) cho thanh search bar.
  - `indexProduct(doc)`: Tự động đánh chỉ mục (index) sản phẩm mới hoặc được cập nhật vào Elasticsearch.

#### 📄 [`src/modules/products/infrastructure/persistence/prisma-product.repository.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/infrastructure/persistence/prisma-product.repository.ts)
* **Mục đích:** Triển khai truy vấn dữ liệu sản phẩm trên Prisma kết hợp cơ chế chuyển đổi thông minh:
  - `findFiltered`: Lọc kết hợp theo danh mục, thương hiệu, khoảng giá (`minPrice` - `maxPrice`), đánh giá sao (`rating`), nhãn tag (`tags`) và sắp xếp linh hoạt (`price_asc`, `price_desc`, `bestseller`, `rating`, `newest`).
  - `search`: **Cơ chế Fallback Resilient:** Hệ thống sẽ ưu tiên gửi truy vấn đến Elasticsearch để lấy danh sách ID sản phẩm có độ liên quan cao nhất. Nếu Elasticsearch chưa được cài đặt hoặc gặp sự cố mạng, repository tự động chuyển đổi sang truy vấn `ILIKE` trên PostgreSQL trên các trường tên, mô tả, thương hiệu, thành phần mà không làm crash ứng dụng.
  - `suggest`: Tương tự, ưu tiên Elasticsearch autocomplete, fallback sang truy vấn nhanh trên database.
  - `findRelated`: Truy vấn các sản phẩm cùng danh mục hoặc cùng thương hiệu, loại trừ sản phẩm hiện tại, sắp xếp theo độ bán chạy (`total_sold DESC`).

---

### 4.3. Use Cases & Customer Controller

#### 📄 [`src/modules/products/application/use-cases/get-products.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/get-products.use-case.ts)
* **Mục đích:** Hỗ trợ nhận `ProductFilterDto` để thực hiện lọc và phân trang.

#### 📄 [`src/modules/products/application/use-cases/search-products.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/search-products.use-case.ts)
* **Mục đích:** Use case tiếp nhận từ khóa tìm kiếm và tùy chọn phân trang.

#### 📄 [`src/modules/products/application/use-cases/suggest-products.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/suggest-products.use-case.ts)
* **Mục đích:** Use case gợi ý sản phẩm (tối đa 8 mục) phục vụ dropdown tìm kiếm trên Header.

#### 📄 [`src/modules/products/application/use-cases/get-related-products.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/get-related-products.use-case.ts)
* **Mục đích:** Use case lấy danh sách sản phẩm gợi ý liên quan cho trang chi tiết sản phẩm.

#### 📄 [`src/modules/products/presentation/dtos/product-filter.dto.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/presentation/dtos/product-filter.dto.ts)
* **Mục đích:** DTO nhận các query parameters lọc: `categoryId`, `brandId`, `minPrice`, `maxPrice`, `rating`, `tag`, `sortBy`, `page`, `limit`.

#### 📄 [`src/modules/products/presentation/dtos/product-suggestion.dto.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/presentation/dtos/product-suggestion.dto.ts)
* **Mục đích:** DTO trả về cho API gợi ý: `id`, `name`, `slug`, `imageUrl`, `price`.

#### 📄 [`src/modules/products/presentation/dtos/product-response.dto.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/presentation/dtos/product-response.dto.ts)
* **Mục đích:** DTO chuẩn hóa phản hồi chi tiết sản phẩm cho phía Web Next.js và Mobile App.

#### 📄 [`src/modules/products/presentation/controllers/product-customer.controller.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/presentation/controllers/product-customer.controller.ts)
* **Mục đích:** Controller cung cấp các endpoint công khai (`@Public()`) cho khách hàng:
  - `GET /customer/products`: Danh sách sản phẩm (phân trang, lọc, sort).
  - `GET /customer/products/search?q=xxx`: Tìm kiếm toàn văn tiếng Việt.
  - `GET /customer/products/suggest?q=xxx`: Gợi ý tìm kiếm nhanh.
  - `GET /customer/products/:slug`: Chi tiết sản phẩm thân thiện SEO.
  - `GET /customer/products/:id/related`: Danh sách sản phẩm liên quan.

#### 📄 [`src/modules/products/products.module.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/products.module.ts)
* **Mục đích:** Đăng ký toàn bộ các use cases mới và `ElasticsearchProductService`.

---

## 5. Phân Hệ Categories (`src/modules/categories`)

### 📄 [`src/modules/categories/domain/entities/category.entity.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/domain/entities/category.entity.ts)
* **Mục đích:** Thực thể Domain đại diện cho Danh mục sản phẩm, có thuộc tính đệ quy `children: CategoryEntity[]`.

### 📄 [`src/modules/categories/domain/repositories/category.repository.interface.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/domain/repositories/category.repository.interface.ts)
* **Mục đích:** Interface hợp đồng truy vấn danh mục (`findTree`, `findById`, `findBySlug`).

### 📄 [`src/modules/categories/infrastructure/mappers/category.mapper.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/infrastructure/mappers/category.mapper.ts)
* **Mục đích:** Chuyển đổi dữ liệu Prisma Category sang thực thể `CategoryEntity`.

### 📄 [`src/modules/categories/infrastructure/persistence/prisma-category.repository.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/infrastructure/persistence/prisma-category.repository.ts)
* **Mục đích:** Truy vấn tất cả danh mục đang hoạt động (`isActive = true`) sắp xếp theo `sort_order` và xây dựng cây phân cấp đa cấp cha - con (Parent - Children Tree) trong bộ nhớ, tối ưu hiệu năng và không bị giới hạn độ sâu quan hệ của Prisma.

### 📄 [`src/modules/categories/application/use-cases/get-category-tree.use-case.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/application/use-cases/get-category-tree.use-case.ts)
* **Mục đích:** Use case gọi repository lấy toàn bộ cây phân cấp danh mục.

### 📄 [`src/modules/categories/presentation/dtos/category-tree-response.dto.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/presentation/dtos/category-tree-response.dto.ts)
* **Mục đích:** DTO Swagger phản hồi cấu trúc cây danh mục đệ quy.

### 📄 [`src/modules/categories/presentation/controllers/category-customer.controller.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/presentation/controllers/category-customer.controller.ts)
* **Mục đích:** Cung cấp endpoint công khai `GET /api/v1/categories/tree` phục vụ điều hướng menu trên Web/Mobile.

### 📄 [`src/modules/categories/categories.module.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/categories.module.ts)
* **Mục đích:** Đóng gói module Categories, liên kết DI cho `CATEGORY_REPOSITORY`.

---

## 6. Tầng Root Application

### 📄 [`src/app.module.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/app.module.ts)
* **Mục đích:** Module gốc của ứng dụng NestJS.
* **Chi tiết thay đổi:**
  - Nhập khẩu `AuthModule` và `CategoriesModule`.
  - Cấu hình Global Guard: Đăng ký `JwtAuthGuard` và `PermissionGuard` thông qua token `APP_GUARD`. Mọi API trong hệ thống mặc định đều được bảo vệ chặt chẽ, chỉ các API có decorator `@Public()` mới được phép truy cập tự do.

### 📄 [`src/main.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/main.ts)
* **Mục đích:** Điểm khởi động ứng dụng NestJS (Bootstrap).
* **Chi tiết thay đổi:**
  - Bổ sung cấu hình Swagger OpenAPI: thêm thẻ tag `Auth (Xác thực & Người dùng)`, `Customer - Products (Việt Trung)`, `Customer - Categories (Việt Trung)` và cấu hình Bearer Auth JWT (`JWT-auth`).

---

## 7. Hệ Thống Unit Test (`*.spec.ts`)

### 7.1. Kiến Trúc & Quy Chuẩn Tổ Chức Test (Phương Án 2A: `__tests__` Co-located Per Layer)
Thay vì đặt file test trực tiếp ngay cạnh file logic khiến thư mục bị dài và rối mắt, hoặc tách ra một thư mục `test/` bên ngoài làm mất tính gắn kết mô-đun (Cohesion), hệ thống áp dụng **Phương án 2A** — chuẩn mực phổ biến và được khuyến nghị hàng đầu trong các dự án Clean Architecture / DDD trên TypeScript & Jest:

* **Tính cục bộ cao (High Cohesion):** Test của layer/module nào nằm trọn vẹn trong folder `__tests__` của layer/module đó (Domain Entity, Use Case, Core Guard). Khi đọc hoặc bảo trì một module, developer có toàn bộ code và unit test tập trung một chỗ.
* **Gọn gàng và tường minh:** Thư mục chính (như `use-cases/`, `entities/`, `guards/`) chỉ chứa code thực thi nghiệp vụ (`.ts`). Toàn bộ test file (`.spec.ts`) được gom gọn gàng vào thư mục con `__tests__/`.
* **Jest Auto-discovery:** Jest tự động nhận diện thư mục `__tests__` và quy tắc `*.spec.ts` mà không cần cấu hình phức tạp.
* **Tối ưu Build Production:** Dễ dàng loại trừ (`exclude`) toàn bộ các folder `__tests__` trong `tsconfig.build.json` khi đóng gói production bundle.

---

### 7.2. Danh Sách Chi Tiết 16 Test Suites

Toàn bộ **16 test suites** với **49 unit tests** được viết hoàn chỉnh, bao phủ tất cả các kịch bản thành công và ngoại lệ:

| STT | Phân Hệ / Vị Trí File Test | Đối Tượng Kiểm Thử | Số Test Cases | Kết Quả |
|:---:|:---|:---|:---:|:---:|
| 1 | [`src/modules/auth/domain/entities/__tests__/user.entity.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/domain/entities/__tests__/user.entity.spec.ts) | Kiểm tra độ mạnh mật khẩu, format email, tính toán quyền hạn bitmask 53-bit `(role \| extra) & ~revoked`, trạng thái active/banned/unverified | 10 | PASS |
| 2 | [`src/modules/auth/application/use-cases/__tests__/register.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/register.use-case.spec.ts) | Đăng ký thành công tạo token SHA-256 gửi email, từ chối email trùng lặp (ConflictException), từ chối mật khẩu yếu | 3 | PASS |
| 3 | [`src/modules/auth/application/use-cases/__tests__/login.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/login.use-case.spec.ts) | Đăng nhập thành công cấp cặp token, sai mật khẩu/email không tồn tại, chặn tài khoản chưa xác thực email (ForbiddenException) | 3 | PASS |
| 4 | [`src/modules/auth/application/use-cases/__tests__/verify-email.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/verify-email.use-case.spec.ts) | Xác thực tài khoản thành công, token không hợp lệ (NotFound), token đã được dùng trước đó, token quá hạn 24h | 4 | PASS |
| 5 | [`src/modules/auth/application/use-cases/__tests__/resend-otp.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/resend-otp.use-case.spec.ts) | Gửi lại email xác thực thành công, Rate Limit 3 lần/giờ (HTTP 429 TooManyRequests), chặn tài khoản đã xác thực | 3 | PASS |
| 6 | [`src/modules/auth/application/use-cases/__tests__/refresh-token.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/refresh-token.use-case.spec.ts) | Refresh Token Rotation thành công (thu hồi session cũ, tạo session mới), phát hiện token bị revoke, phát hiện token hết hạn | 3 | PASS |
| 7 | [`src/modules/auth/application/use-cases/__tests__/logout.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/logout.use-case.spec.ts) | Thu hồi session khi đăng xuất, tính lũy thừa idempotent (không lỗi nếu session đã revoke) | 2 | PASS |
| 8 | [`src/modules/auth/application/use-cases/__tests__/forgot-password.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/forgot-password.use-case.spec.ts) | Gửi link reset mật khẩu qua email, phản hồi generic an toàn khi email không tồn tại trong DB (chống dò email) | 2 | PASS |
| 9 | [`src/modules/auth/application/use-cases/__tests__/reset-password.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/auth/application/use-cases/__tests__/reset-password.use-case.spec.ts) | Đặt lại mật khẩu thành công và thu hồi tất cả phiên khác của user, từ chối mật khẩu không đủ độ mạnh | 3 | PASS |
| 10 | [`src/modules/products/application/use-cases/__tests__/search-products.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/__tests__/search-products.use-case.spec.ts) | Tìm kiếm sản phẩm trả về kết quả khớp từ khóa, xử lý an toàn chuỗi rỗng/chỉ chứa khoảng trắng | 2 | PASS |
| 11 | [`src/modules/products/application/use-cases/__tests__/get-products.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/__tests__/get-products.use-case.spec.ts) | Điều hướng thông minh: gọi `findFiltered` khi có bộ lọc đa tiêu chí, gọi `findAll` khi chỉ phân trang thông thường | 2 | PASS |
| 12 | [`src/modules/products/application/use-cases/__tests__/suggest-products.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/__tests__/suggest-products.use-case.spec.ts) | Trả về danh sách gợi ý autocomplete khi có từ khóa hợp lệ, trả mảng rỗng khi query rỗng | 2 | PASS |
| 13 | [`src/modules/products/application/use-cases/__tests__/get-related-products.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/products/application/use-cases/__tests__/get-related-products.use-case.spec.ts) | Ném `NotFoundException` khi ID sản phẩm gốc không tồn tại, trả danh sách sản phẩm liên quan cùng category/brand | 2 | PASS |
| 14 | [`src/modules/categories/application/use-cases/__tests__/get-category-tree.use-case.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/modules/categories/application/use-cases/__tests__/get-category-tree.use-case.spec.ts) | Trả về cấu trúc cây phân cấp danh mục đa tầng chính xác | 1 | PASS |
| 15 | [`src/core/guards/__tests__/jwt-auth.guard.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/guards/__tests__/jwt-auth.guard.spec.ts) | Cho qua route `@Public()`, chặn request thiếu token, gắn payload giải mã vào request, chặn token không hợp lệ hoặc hết hạn | 4 | PASS |
| 16 | [`src/core/guards/__tests__/permission.guard.spec.ts`](file:///d:/VS_Code/DUT/PBL6/backend/src/core/guards/__tests__/permission.guard.spec.ts) | Cho qua khi route không yêu cầu quyền, chặn request không có user, chặn request thiếu mã quyền (403), cho qua khi đủ quyền | 4 | PASS |
| **Tổng Cộng** | **16 Test Suites** | **Toàn Bộ Phân Hệ Sprint 1** | **50 Unit Tests** | **50/50 PASS (100%)** |

