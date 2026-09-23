# GlowUp Backend — Clean Architecture with NestJS & Prisma

Dự án Backend cho Hệ thống Quản lý Bán lẻ Mỹ phẩm **GlowUp**, được xây dựng bằng **NestJS**, **Prisma ORM**, kết nối **PostgreSQL 17 (Neon Database)** theo mô hình **Clean Architecture (Module-centric)**.

---

## 1. Cấu trúc Clean Architecture trong từng Module

> 📖 **Xem hướng dẫn chi tiết toàn diện:** Đọc file [ARCHITECTURE.md](file:///d:/VS_Code/DUT/PBL6/backend/ARCHITECTURE.md) để nắm vững:
> - Nguyên lý **The Dependency Rule** & **Dependency Inversion (DIP)**
> - Luồng xử lý chi tiết từ Request -> Controller -> Use Case -> Repo -> DB
> - Hướng dẫn từng bước cách tạo module mới
> - Các "bẫy" anti-patterns cần tránh và Checklist trước khi tạo PR

Mỗi tính năng/phân hệ được đóng gói trong một module riêng biệt tại `src/modules/<module-name>/` gồm 4 phân lớp:

```
src/modules/<module-name>/
├── domain/                      # [Lớp 1 - Cốt lõi] Thực thể & Quy tắc nghiệp vụ
│   ├── entities/                # Class TypeScript thuần túy, chứa nghiệp vụ bất biến
│   ├── repositories/            # Interface (Port) định nghĩa các thao tác dữ liệu
│   └── value-objects/           # Các đối tượng giá trị (Value Object)
│
├── application/                 # [Lớp 2 - Use Cases] Nghiệp vụ ứng dụng
│   ├── use-cases/               # Mỗi use case là 1 class đơn nhiệm (Single Responsibility)
│   ├── dtos/                    # DTO trả về hoặc truyền nhận giữa các tầng
│   └── ports/                   # Interface dịch vụ bên ngoài (email, token, payment...)
│
├── infrastructure/              # [Lớp 3 - Adapters] Cài đặt kỹ thuật & CSDL
│   ├── persistence/             # Prisma Repository cài đặt các interface ở domain
│   ├── mappers/                 # Chuyển đổi qua lại giữa Prisma Model và Domain Entity
│   └── adapters/                # Cài đặt dịch vụ bên ngoài (JWT, Hash, Cloudinary...)
│
├── presentation/                # [Lớp 4 - Giao tiếp Client] Controllers & HTTP
│   ├── controllers/             # Phân chia: Customer Controller & Admin Controller
│   └── dtos/                    # Request DTO có class-validator & @ApiProperty Swagger
│
└── <module-name>.module.ts      # Khai báo DI, kết nối Use Cases và Repository Adapters
```

---

## 2. Phân vai API theo Sprint Plan

Theo phân công Sprint 1:
- **Việt Trung (BE End-user):**
  - Viết các Controller trong `presentation/controllers/*-customer.controller.ts`
  - Route prefix: `/api/v1/customer/...` hoặc `/api/v1/...` (public)
  - Phục vụ Web (Next.js) & Mobile (React Native)
- **Thành Lập (BE Admin):**
  - Viết các Controller trong `presentation/controllers/*-admin.controller.ts`
  - Route prefix: `/api/v1/admin/...`
  - Phục vụ Dashboard Admin (React)

*Cả 2 controller cùng tái sử dụng các Use Cases và Domain Repositories trong cùng module, giúp code DRY và nhất quán!*

---

## 3. Cài đặt và Chạy dự án

### 3.1 Cài đặt dependencies
```bash
cd backend
npm ci
```

> [!WARNING]
> **Luôn dùng `npm ci`**, KHÔNG dùng `npm install`.
> `npm install` sẽ tự cập nhật `package-lock.json` — gây lệch phiên bản thư viện giữa các thành viên và dễ xung đột khi merge.

> [!CAUTION]
> **Không chạy `npm audit fix --force`.**
> npm sẽ báo lỗ hổng bảo mật khi cài, nhưng nếu fix bằng `--force` sẽ nâng NestJS từ **v10 lên v12**, thay đổi `package-lock.json` và **có nguy cơ vỡ code**.
> Hiện tại team thống nhất **giữ NestJS 10** để đảm bảo ổn định.

### 3.2 Cấu hình môi trường (`.env`)
Mở file `.env` và điền chuỗi kết nối từ tài khoản **Neon** của bạn:
```env
DATABASE_URL="postgresql://[user]:[password]@[neon_hostname]/[dbname]?sslmode=require"
```

### 3.3 Sinh Prisma Client & Đồng bộ CSDL
```bash
# Sinh Prisma Client
npm run prisma:generate

# Hoặc tạo migration lên Neon PostgreSQL
npx prisma migrate dev --name init_db
```

### 3.4 Khởi động Server
```bash
# Chế độ phát triển (Watch mode)
npm run start:dev

# Chế độ production
npm run build
npm run start:prod
```

### 3.5 Tài liệu API (Swagger UI)
Sau khi khởi động server, truy cập Swagger UI tại:
👉 `http://localhost:3000/api/docs`
