# Antigravity Skills for PBL6 (DUT.CosmeticsRetailSystem)

Bộ kỹ năng này được tích hợp từ thư viện **Antigravity Awesome Skills** (hơn 1.840 kỹ năng mã nguồn mở) và được tinh gọn, tuyển chọn tối ưu hóa cho stack dự án:
- **Framework & Backend**: NestJS, TypeScript, Node.js
- **Database & ORM**: PostgreSQL, Prisma ORM, Database Design, SQL Optimization
- **Kiến trúc & API**: Backend Architect, API Design Principles, REST/GraphQL Patterns, Clean Code
- **Bảo mật & Auth**: Auth Implementation Patterns (JWT/RBAC), API Security Best Practices, Backend Security Coder
- **Thanh toán**: Payment Integration (Stripe, checkout, webhooks)
- **Kiểm thử & QA**: TDD (Test-Driven Development), Unit Testing Test Generation, Code Review Checklist & Excellence
- **DevOps**: Docker Expert

---

## 🛠️ Danh sách 24 Skills đang kích hoạt

| Nhóm | Tên Skill | Mô tả tóm tắt |
| :--- | :--- | :--- |
| **Framework & Lang** | `nestjs-expert` | Kiến trúc NestJS chuẩn doanh nghiệp, DI, guards, interceptors, pipes |
| | `prisma-expert` | Thiết kế schema Prisma, migrations, quan hệ và tối ưu truy vấn |
| | `typescript-expert` | Kỹ thuật TypeScript nâng cao, best practices và patterns |
| | `typescript-advanced-types` | Generics, Conditional & Mapped Types chuyên sâu |
| **Database** | `database-design` | Thiết kế CSDL quan hệ, chuẩn hóa, schema modeling |
| | `database-migration` | Chiến lược migration an toàn, rollback và zero-downtime |
| | `postgres-best-practices` | Tối ưu hóa hiệu năng PostgreSQL từ Supabase |
| | `postgresql-optimization` | Tuning query, indexing và tối ưu hóa hệ CSDL PostgreSQL |
| | `sql-optimization-patterns` | Tối ưu truy vấn SQL chậm, phân tích query plan |
| **Kiến trúc & API** | `backend-architect` | Thiết kế hệ thống phân tán, Clean Architecture, domain modeling |
| | `backend-dev-guidelines` | Tiêu chuẩn phát triển backend production-grade |
| | `api-design-principles` | Tiêu chuẩn thiết kế REST API, error handling, status code, pagination |
| | `api-patterns` | Lựa chọn kiến trúc API (REST vs GraphQL vs tRPC), formats |
| | `clean-code` | Nguyên lý Clean Code và SOLID áp dụng vào dự án |
| **Bảo mật & Auth** | `auth-implementation-patterns` | Xây dựng hệ thống xác thực và phân quyền (JWT, RBAC, OAuth2) |
| | `api-security-best-practices` | Rate limiting, CORS, input validation, chống lỗ hổng API phổ biến |
| | `backend-security-coder` | Viết code backend an toàn, mã hóa, phòng chống injection |
| | `security-and-hardening` | Rà soát và gia cố bảo mật toàn diện |
| **Thương mại điện tử**| `payment-integration` | Tích hợp cổng thanh toán, checkout flows, webhooks và bảo mật thanh toán |
| **Kiểm thử & Review** | `test-driven-development` | Phương pháp TDD trước khi code tính năng mới |
| | `unit-testing-test-generate` | Tự động sinh unit test bao phủ các ca biên (edge cases) |
| | `code-review-excellence` | Quy chuẩn review code tích cực, phát hiện lỗi sớm |
| | `code-review-checklist` | Bảng kiểm soát chất lượng code toàn diện |
| **DevOps** | `docker-expert` | Docker multi-stage build, docker-compose tối ưu cho phát triển |

---

## 🚀 Quản lý & Bổ sung Skills từ kho 1.840+ kỹ năng

Bạn có thể tìm kiếm và cài đặt thêm bất kỳ skill nào từ kho lưu trữ trung tâm (`~/.agents/skills`) bằng tiện ích:

```bash
# Xem danh sách skills đang kích hoạt trong dự án
node .agents/manage-skills.js list

# Tìm kiếm kỹ năng theo từ khóa (vd: redis, rabbitmq, graphql, microservices...)
node .agents/manage-skills.js search redis

# Cài đặt thêm skill vào dự án
node .agents/manage-skills.js add <tên-skill>

# Gỡ bỏ skill khỏi dự án
node .agents/manage-skills.js remove <tên-skill>
```
