# FE-00 — Foundation / contracts

Ngày kiểm tra: 26/10/2026. Code foundation đã triển khai; chưa nghiệm thu kết nối backend thật/provider. Không có thay đổi source backend và chưa triển khai FE-01.

| Bàn giao | Trạng thái / bằng chứng |
|---|---|
| Bootstrap frontend cổng 3001 | Next 16.4.3, React 19.3.1; App Router, TS strict, dev/start port 3001 |
| Pin stack/env/scripts | package.json exact versions + package-lock; .env.example server-only; lint/typecheck/test/build/check |
| API envelope/error | Runtime Zod theo endpoint, unwrap một lớp, giữ status/code/details/Retry-After, timeout/no-store/no blind retry |
| Generated types | openapi.d.ts + SHA256 backend snapshot; contracts:generate/check; O02 generic schemas chưa sửa |
| SSR gọi backend | /dev/backend gọi trực tiếp health/live bằng server-only client; E2E fixture pass; backend thật cổng 3000 chưa kết nối được |
| Session/refresh ADR | ADR-001: opaque cookie + Redis TTL/lock/CAS, logout race, uncertain refresh outcome, FE-01 test gates |
| Cache/runtime ADR | ADR-002: cacheComponents false, no-store baseline; caching opt-in chờ public contract |
| Routes/navigation | 46 screen IDs; mini-cart overlay, reset tách route, CMS reserved/published allowlist; menu account đúng Sổ địa chỉ |
| Tokens | Primary #C85A70, fonts Montserrat/Be Vietnam Pro, action contrast 6.71:1, focus/reduced-motion |
| Asset inventory | 41 HTML/screenshot pairs, 268 img/script/CSS references, local PNG dimensions/bytes; chưa publish hotlinks/reference |
| Capability registry | API source-present/blocked/omitted phân biệt; mọi integration false; VNPAY bắt buộc G01 |
| BE review handoff | backend-review.md: O01/O02/O03/O05/G01/G02/G03/ENV-01 có owner tham chiếu, gates và yêu cầu bàn giao |

## Kết quả kiểm tra

- OpenAPI generation/drift và inventory check: pass.
- ESLint không warning và TypeScript strict: pass.
- Vitest: 14 tests pass (schema/envelope, HTTP errors/details/headers, network/timeout/cancellation, no retry/no-store, route safety/coverage).
- Next production build: pass, `/` static, `/dev/backend` dynamic.
- Playwright: 4 tests pass, Chromium desktop và mobile; Vietnamese shell không pageerror/tràn ngang; SSR fixture không bị gọi từ browser.
- Production runtime smoke: pass — home 200, lang=vi/noindex, diagnostic 404 ngay cả khi bật FE_DIAGNOSTICS, unknown route 404; process test đã dừng sau kiểm tra.
- Cài lại từ lockfile bằng `npm ci`: pass, audit 0 vulnerabilities. ESLint 9 có deprecation notice do giới hạn peer compatibility Next plugins; đã ghi ADR-002.

## Còn chờ và quy tắc chuyển phase

- Backend `http://localhost:3000/api/v1/health/live` không phản hồi khi probe. Khởi động backend theo runbook của backend rồi mở `/dev/backend` trong development để ghi bằng chứng live; không dùng fixture thay nghiệm thu.
- `health/ready`, SMTP/OAuth, session Redis, payment/provider và storage chưa được xác nhận. FE-01 triển khai broker/auth theo ADR, FE-02+ chỉ tích hợp sau các gate BE tương ứng.
- Registry S01–S41/B01–B05 vẫn TODO; skeleton bootstrap không tính là home hoàn thành. Chưa có header/footer/auth screen hoặc mutation BFF.
- Asset nguồn Stitch bị gitignore; kiểm tra CI/clone không có source chỉ xác nhận manifest đã commit. Khi duyệt asset phải đối chiếu file/URL thật, quyền sử dụng và nội dung.
- Backlog này là tài liệu local; chưa tạo issue/PR hoặc gửi giao việc ra ngoài.

Các lệnh tái kiểm tra nằm trong [README](../README.md).
