# GlowUp frontend — FE-00

Next.js App Router cho Guest/Customer, cổng **3001**; backend NestJS cổng **3000**. FE-00 là foundation, chưa triển khai storefront/auth hoặc các route nghiệp vụ FE-01–07. Trang `/` hiện là trang chờ có brand tokens; không phải home S39 đã hoàn tất.

## Chạy local

Node 22.14.0 (hoặc Node 24 LTS), npm 10+. Từ thư mục `frontend`:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở http://localhost:3001. `BACKEND_API_BASE_URL` gồm prefix `/api/v1`; `SITE_URL` là origin frontend, không có path. Env backend/session luôn server-only. FE-01 mới dùng Redis sessions, không cần secret/session store để chạy foundation.

`/dev/backend` chỉ mở ở development với `FE_DIAGNOSTICS=true`; RSC gọi thẳng `GET /api/v1/health/live` bằng server client. Backend offline sẽ hiện lỗi kết nối, không mock thành công. Production luôn trả 404 cho diagnostic. Liveness không chứng minh DB/provider readiness.

## Kiểm tra

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:production
```

`check`: OpenAPI drift, route/asset inventory, ESLint, Next route types + strict TypeScript, Vitest, production build. `test:e2e` cần cổng 3001 và 3100 trống; tự khởi tạo app và health fixture riêng, test desktop/mobile. Đây là contract fixture, không phải bằng chứng backend thật online. Không dùng fixture ngoài tests.

`test:production` chạy sau build, cần cổng 3001 trống, tự bật/tắt Next production và xác nhận home/noindex/404 cùng diagnostic không public. ESLint 9 hiện deprecated nhưng còn cần cho peer compatibility của Next plugins; xem ADR-002, không dùng force/legacy-peer-deps để ép ESLint 10.

Build tải font qua next/font; cần network đến Google Fonts ở build time. Artifact production self-host font. Triển khai Node runtime bằng `npm run build` rồi `npm start`; không static export.

## Contracts và boundaries

- `npm run contracts:generate` lấy `../backend/docs/api/openapi.json`, pin snapshot SHA256 trong `src/shared/api/generated/openapi.d.ts`. `contracts:check` fail khi spec/types drift. Không chỉnh generated bằng tay.
- Runtime schema Zod cho mỗi endpoint; generic schemas trong spec chưa đủ làm integration. Envelope chỉ unwrap một lần. Lỗi giữ status/code/details/Retry-After, không hiển thị upstream body.
- `server.ts` có `server-only`, fixed health allowlist, no-store, bounded timeout, redirect:error; browser chỉ dùng BFF same-origin. Chưa có auth/token broker hoặc mutation BFF.
- API backend thiếu giữ blocker trong `capabilities.ts`; toàn bộ integration status vẫn false. VNPAY bắt buộc, không được bật giả khi thiếu G01.
- Hướng import: app → widgets/features → entities/shared. Chỉ tạo folder khi dùng. `(site)` là nơi FE-01 thêm navbar/footer chung; account layout sẽ dùng menu Sổ địa chỉ ở `navigation.ts`.
- Route inventory được sinh từ kế hoạch: S01–S41 + B01–B05, S24 là overlay, S28 có hai route, lỗi là boundary. Registry không tự tạo 46 trang rỗng. CMS cần published allowlist + reserved slug guard.

## Handoff

- [Checklist và kết quả FE-00](docs/fe-00-checklist.md)
- [ADR session/refresh](docs/adr/001-session-refresh.md)
- [ADR runtime/cache/contracts](docs/adr/002-runtime-contracts-cache.md)
- [Asset inventory và quyền sử dụng](docs/assets.md)
- [Backlog BE review](docs/backend-review.md)
- [Kế hoạch toàn bộ frontend](../docs/3-planning/fe/README.md)

Mặc định noindex; chưa có sitemap/robots proxy production. Trước public release cần origin/callback, image hosts, nội dung chính thức, session infra, provider tests và FE-07 gate. Deploy rollback dùng artifact/lockfile phiên bản trước; thay schema/migrations do backend quản lý.
