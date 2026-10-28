# GlowUp frontend — FE-00 đến FE-04

Next.js App Router cho Guest/Customer, cổng **3001**; backend NestJS cổng **3000**. Đã có foundation, auth/session, catalog, checkout FE-03 và tài khoản/đơn hàng FE-04. Xem [checklist FE-03](docs/fe-03-checklist.md) và [FE-04](docs/fe-04-checklist.md) để biết kết quả kiểm thử và các gate backend/provider còn lại.

## Chạy local

Node 22.14.0 (hoặc Node 24 LTS), npm 10+. Từ thư mục `frontend`:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở http://localhost:3001. `BACKEND_API_BASE_URL` gồm prefix `/api/v1`; `SITE_URL` là origin frontend, không có path. Cấu hình `SESSION_REDIS_URL` trong `.env.local` bằng kết nối TLS Upstash (có thể dùng chung database với backend), với prefix riêng `glowup:frontend:local:session:`. Không commit `.env.local`. Shell/auth UI có thể render khi backend/store offline; đăng nhập và trang private cần cả hai dịch vụ.

`SESSION_MAX_AGE_SECONDS` bắt buộc, không vượt thời hạn refresh của backend. Backend hiện trả opaque refresh token không kèm expiry; mặc định mẫu là 7 ngày, phải đối chiếu `JWT_REFRESH_EXPIRES_IN` khi triển khai. Cookie và record có cùng deadline cố định, refresh không kéo dài deadline web. Không có fallback session trong memory.

`/dev/backend` chỉ mở ở development với `FE_DIAGNOSTICS=true`; RSC gọi thẳng `GET /api/v1/health/live` bằng server client. Backend offline sẽ hiện lỗi kết nối, không mock thành công. Production luôn trả 404 cho diagnostic. Liveness không chứng minh DB/provider readiness.

## Kiểm tra

```powershell
npm run check
npm run test:sessions
npx playwright install chromium
npm run test:e2e
npm run test:production
npm run test:maintenance
```

`check`: OpenAPI drift, route/asset inventory, Prettier, ESLint, Next route types + strict TypeScript, Vitest, production build. `test:sessions` dùng Redis/Upstash thật từ `.env.local`, tạo namespace ngẫu nhiên `glowup:test:*`, kiểm tra refresh/CAS/logout/TTL và xóa các record đã tạo. Có thể đặt `TEST_SESSION_REDIS_URL` để dùng database kiểm thử riêng; lệnh này không duyệt hoặc xóa key backend. Các test Redis được tách khỏi `npm test` để kiểm tra code không bắt buộc network.

Định dạng mã trong `src` bằng `npm run format`; kiểm tra mà không sửa file bằng `npm run format:check`. Prettier dùng cấu hình trong `.prettierrc.json`; ESLint tiếp tục kiểm tra quy tắc mã bằng `npm run lint`.

`test:e2e` cần cổng 3001 và 3100 trống, dùng session store từ `.env.local` (hoặc `TEST_SESSION_REDIS_URL`) với prefix riêng `glowup:e2e:*`. Tự bật Next dev và backend fixture cho auth/address/health, chạy desktop/mobile. Record test có TTL tối đa một giờ. Fixture không chứng minh SMTP/OAuth/backend thật hoạt động. Chạy các lệnh tạo type/build tuần tự với E2E để tránh Next dev và `typegen` cùng thay artifact `.next`.

`test:production` chạy sau build, cần cổng 3001 trống, tự bật/tắt Next production và xác nhận home/noindex/404 cùng diagnostic không public. ESLint 9 hiện deprecated nhưng còn cần cho peer compatibility của Next plugins; xem ADR-002, không dùng force/legacy-peer-deps để ép ESLint 10.

Build tải font qua next/font; cần network đến Google Fonts ở build time. Artifact production self-host font. Triển khai Node runtime bằng `npm run build` rồi `npm start`; không static export.

## Contracts và boundaries

- `npm run contracts:generate` lấy `../backend/docs/api/openapi.json`, pin snapshot SHA256 trong `src/shared/api/generated/openapi.d.ts`. `contracts:check` fail khi spec/types drift. Không chỉnh generated bằng tay.
- Runtime schema Zod cho mỗi endpoint; generic schemas trong spec chưa đủ làm integration. Envelope chỉ unwrap một lần. Lỗi giữ status/code/details/Retry-After, không hiển thị upstream body.
- Các server client có `server-only`, endpoint allowlist, no-store, timeout và redirect:error. Browser dùng BFF same-origin; mutation kiểm tra Origin/content-type/body size. Không forward Authorization/cookie/IP do browser chọn sang backend.
- API backend thiếu giữ blocker trong `capabilities.ts`; toàn bộ integration status vẫn false. VNPAY bắt buộc, không được bật giả khi thiếu G01.
- Hướng import: app → widgets/features → entities/shared. `(site)` dùng chung navbar/footer, `(auth)` là sibling không header/footer; account layout xác thực qua backend và dùng menu Sổ địa chỉ ở `navigation.ts`.
- Route inventory được sinh từ kế hoạch: S01–S41 + B01–B05, S24 là overlay, S28 có hai route, lỗi là boundary. Registry không tự tạo 46 trang rỗng. CMS cần published allowlist + reserved slug guard.

## Handoff

- [Checklist và kết quả FE-00](docs/fe-00-checklist.md)
- [Checklist, cache policy và kết quả FE-01](docs/fe-01-checklist.md)
- [Đối chiếu thiết kế Stitch FE-01 và ảnh desktop/mobile](docs/fe-01-design-review.md)
- [ADR session/refresh](docs/adr/001-session-refresh.md)
- [ADR runtime/cache/contracts](docs/adr/002-runtime-contracts-cache.md)
- [Asset inventory và quyền sử dụng](docs/assets.md)
- [Backlog BE review](docs/backend-review.md)
- [Kế hoạch toàn bộ frontend](../docs/3-planning/fe/README.md)

Mặc định noindex; chưa có sitemap/robots proxy production. Trước public release cần origin/callback, image hosts, nội dung chính thức, session infra, provider tests và FE-07 gate. Deploy rollback dùng artifact/lockfile phiên bản trước; thay schema/migrations do backend quản lý.

`MAINTENANCE_MODE=true` trả 503 cho site/BFF và `Retry-After`; `/maintenance` luôn trả 503. Restart server sau khi đổi cờ. Lỗi backend thông thường dùng error boundary và nút thử lại, không tự bật bảo trì. OAuth continuation giữ challenge/nonce trong store có TTL; login/register có Google Identity Services/Facebook JS SDK, callback qua BFF. Bật tính năng không đồng nghĩa đã nghiệm thu provider thật; xem cấu hình bên dưới.


## Google / Facebook login

Facebook cần HTTPS trong môi trường đang chạy. Dừng frontend HTTP, chạy `npm run dev:https` và mở `https://localhost:3001/login`. Lệnh tự đặt `SITE_URL` đúng HTTPS cho process đó; không cần đổi backend thành HTTPS. Xem [hướng dẫn Meta URL, Google HTTPS và lỗi Redis](docs/oauth-setup.md).

Login/register dùng layout auth riêng, không có header/footer site. `.env.local` cần:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
FACEBOOK_APP_ID=your-public-app-id
FACEBOOK_GRAPH_VERSION=your-backend-graph-version
OAUTH_GOOGLE_ENABLED=true
OAUTH_FACEBOOK_ENABLED=true
```

Google client ID phải là loại Web application và nằm trong `GOOGLE_OAUTH_CLIENT_IDS` của backend; thêm `http://localhost` và `http://localhost:3001` vào Authorized JavaScript origins trong Google Console theo [hướng dẫn Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Facebook app ID/version phải khớp backend; cấu hình Facebook Login/JS SDK và website domain trong Meta Console. Không đưa Facebook app secret xuống frontend. Restart dev server sau đổi env. Thiếu ID hoặc tắt cờ thì provider hiện chưa khả dụng, email login vẫn hoạt động.

Google dùng [GIS renderButton và credential callback](https://developers.google.com/identity/gsi/web/guides/display-button); Facebook dùng [JS SDK / FB.login](https://developers.facebook.com/docs/facebook-login/web/). Không lưu credential provider trong storage; backend xác minh rồi Next tạo cookie phiên HttpOnly. Challenge/email proof/linking giữ binding server-side.

Nếu Google báo origin không được phép: mở Google Cloud Console → Google Auth Platform → Clients, chọn Web application có Client ID trùng `GOOGLE_OAUTH_CLIENT_ID` trong `.env.local`. Trong Authorized JavaScript origins thêm hai dòng `http://localhost` và `http://localhost:3001`, rồi Save và tải lại `/login`. Không nhập path `/login` vào origins. Luồng popup + JS callback hiện tại không cần thêm Authorized redirect URI; `/oauth/continue` là trang xử lý challenge của GlowUp, không phải Google callback. Nếu đổi Client ID, cập nhật frontend và danh sách `GOOGLE_OAUTH_CLIENT_IDS` của backend rồi restart hai server.

`tests/e2e/oauth.spec.ts` giả lập SDK, dùng BFF/Upstash thật với backend fixture. Kiểm tra callback, cookie, returnTo, proof sai/đúng, linking cần login đích, cancel, invalid credential, SDK bị chặn. Test này không xác nhận tài khoản Google/Facebook thật, consent app hay SMTP. Smoke thật cần backend đang chạy và hoàn tất chọn tài khoản/cấp quyền ở provider; kiểm tra thêm email proof/linking với tài khoản thử đã được phép.
