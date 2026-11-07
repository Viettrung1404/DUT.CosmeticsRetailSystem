# Sprint 6 — Backend end-user

Ngày triển khai: 2026-10-25. Backend đã bổ sung OAuth, SEO, bảo vệ session, distributed throttling và cache metadata có version. Chưa đóng toàn bộ DoD: cần kiểm chứng SDK Google/Meta và SMTP thật; DB đang cấu hình còn thiếu migration; nhánh payment online chưa có trong repository; cần demo Web/Mobile và nghiệm thu tải với dataset nghiệp vụ. Xem [handoff Next.js/Expo](api/nextjs-expo-handoff.md).

## Các thay đổi chính và carry-over

| ID | Mức độ / owner | Reproducer trước sửa | Kết quả và nghiệm thu |
|---|---|---|---|
| S6-AUTH-01 | P1 / Việt Trung | Logout/revoke session nhưng JWT chưa hết hạn vẫn được guard chấp nhận | JWT có `sessionId`; guard kiểm tra đúng user/session, expiry, ACTIVE, emailVerified và quyền hiện hành từ service Permissions; HTTP test logout → `/auth/me` 401 |
| S6-AUTH-02 | P1 / Việt Trung | Hai refresh đồng thời cùng đọc session chưa revoked rồi cùng phát session mới | Conditional consume `updateMany` trong transaction; chỉ một request 200, request còn lại 401; session mới gắn access token mới |
| S6-AUTH-03 | P1 / Việt Trung | Register gọi repository tạo User+Customer, sau đó lại tạo Customer cùng `userId` | Tạo CRM idempotent theo `userId`; PostgreSQL test đăng ký chỉ có một Customer |
| S6-AUTH-04 | P1 / Việt Trung | Register với phone của khách POS chưa có user có thể gắn lịch sử/điểm mà chưa xác minh | Trả `PHONE_VERIFICATION_REQUIRED`, rollback user/profile mới; không gắn hoặc sửa hồ sơ POS; cần luồng OTP phone riêng trước cho phép merge |
| S6-AUTH-05 | P1 / Việt Trung | JWT secret fallback, quyền trong JWT có thể cũ; login tin `X-Forwarded-For` trực tiếp | Không có fallback secret, HS256 allowlist, quyền đọc qua Permissions duy nhất, IP lấy từ Express sau trust proxy |
| S6-CACHE-01 | P2 / Việt Trung | Request đọc dữ liệu cũ có thể ghi cache sau invalidation | Revision DB tăng cùng transaction của category/page/FAQ; key chứa revision đã chụp trước load; test hai instance, stale fill và rollback |
| S6-SEO-01 | P2 / Việt Trung | JSON interceptor bọc mọi response; tăng views đổi blog updatedAt | Metadata bypass riêng, XML/text raw và ETag; timestamp nội dung blog do DB trigger cập nhật, tăng views không thay lastmod |
| S6-GATE-01 | Integration / nhóm payment | Checkout phương thức khác COD | Vẫn trả `ONLINE_PAYMENT_MODULE_REQUIRED`; không tự bật gateway, không ghi nhận mock là thanh toán thật |

Migration cộng thêm bảng pending identity, cache revision, timestamp blog và index. Không xóa user/review/order, không sửa ledger/quota/credit, không bỏ generated column/check/partial index S4/S5. Index `lower(email)` chặn tài khoản trùng email khác hoa/thường; migration dừng nếu dữ liệu cũ đã trùng, không tự merge.

## OAuth contract cho Web/Mobile

Prefix `/api/v1`. Luồng token exchange server-side, không có redirect backend hoặc nhận `returnUrl`. Web/Mobile cấu hình SDK/redirect/deep link tại provider và client; không truyền token vào URL backend. Body whitelist không chấp nhận role/permission/userId tùy ý.

| Route | Request | Kết quả |
|---|---|---|
| `POST /auth/oauth/google` | `idToken`, `clientNonce` | `{accessToken, refreshToken, user}` hoặc `{code, challenge, expiresIn:600}` trong `data` |
| `POST /auth/oauth/facebook` | Classic user `accessToken`, `clientNonce` | Cùng contract; **không hỗ trợ Limited Login JWT** |
| `POST /auth/oauth/email` | `challenge`, `clientNonce`, `email` | Gửi mã xác thực qua SMTP, không trả mã trong API/log |
| `POST /auth/oauth/complete` | `challenge`, `clientNonce`, `verificationToken` | Chỉ onboarding tài khoản mới; email đã có phải dùng `/link` |
| `POST /auth/oauth/link` | Cùng body `/complete` + Bearer của tài khoản đích | Xác minh login nội bộ và bằng chứng email mới trước link; trả session mới, không merge tài khoản |

Client tự tạo `clientNonce` ngẫu nhiên 32–128 ký tự, giữ riêng trong flow và gửi lại khi hoàn tất. Đây là binding secret của onboarding, không phải tuyên bố đã triển khai redirect state/PKCE hoặc Google nonce server-issued. Challenge và mã email là 32 random bytes dạng hex, DB chỉ lưu SHA256; hạn 10 phút, consume một lần. Không phát access token từ challenge. Mỗi challenge chỉ gửi email một lần; nếu gửi lỗi, hash được gỡ để retry; hết hạn cần bắt đầu lại. Job mỗi giờ xóa tối đa 500 pending identity đã hết hạn hơn 24 giờ.

Google xác minh bằng `google-auth-library` khóa phiên bản trong package-lock: signature, issuer, audience Web/Mobile allowlist và expiry. Chỉ email đã verified thuộc Gmail/Workspace được dùng tự tạo tài khoản; email bên thứ ba đi qua email verification. Facebook gọi `debug_token` với app credential rồi `/me` kèm `appsecret_proof`; kiểm tra app, type USER, subject, token/data-access expiry. Không dùng email làm identity provider và không lưu provider token.

Identity đã link đăng nhập theo `(provider, providerUserId)`, không tự thay email nội bộ nếu provider đổi email. Email có sẵn, kể cả Google authoritative, luôn yêu cầu login vào đúng tài khoản và mã gửi tới email đó. BANNED/INACTIVE/unverified không được phát session. Customer mới không kế thừa POS phone/points.

Provider call và SMTP ở ngoài transaction. Advisory lock identity/email + unique constraints bảo vệ first login/link đồng thời; unique conflict lúc đăng ký lần đầu chỉ retry một lần và đọc lại chủ identity. Audit chỉ ghi provider/action/entity, không token. Trả lỗi 401 cho token/challenge sai; 403 cho owner/account không hợp lệ; 409 conflict; 429 có Retry-After; 503 provider/config/rate store unavailable.

**Gate provider:** đã có Google client ID và Facebook app/version trong `.env`. Probe đọc cấu hình xác nhận Google key endpoint truy cập được và Meta chấp nhận App credentials; chưa kiểm chứng Google client registration hoặc login bằng token người dùng thật. SMTP vẫn thiếu `SMTP_USER`/`SMTP_PASS`. Unit test dùng chữ ký RSA thật với cert fixture cho Google và HTTP fixture cho Meta; HTTP/DB tests mock provider/SMTP. Chưa xác nhận login Google/Facebook trên browser/thiết bị thật. Capability SDK và Facebook Limited Login iOS vẫn cần được chốt trước nghiệm thu. Xem [readiness hiện tại](api/client-readiness.json).

## Session, CORS và rate limit

Access JWT phải có sessionId. Token cũ không có claim này cần login/refresh lại sau release. Refresh token hiện là opaque random token; `JWT_REFRESH_SECRET` không tham gia ký JWT refresh. TTL session đọc `JWT_REFRESH_EXPIRES_IN` (`s/m/h/d`, tối đa 365d; mặc định 7d nếu thiếu); access TTL đọc `JWT_EXPIRES_IN`. Refresh rotation thu hồi session cũ nên access token cũ cũng bị từ chối. Đọc quyền hiện hành không tự triển khai một bộ tính bitmask khác.

`CORS_ALLOWED_ORIGINS` là danh sách origin Web/Admin, cách nhau bằng dấu phẩy; native Mobile không cần Origin. Không dùng phản chiếu origin với credentials. `TRUSTED_PROXIES` chỉ chứa IP/CIDR proxy được tin; mặc định không tin forwarded header. DTO whitelist/forbidNonWhitelisted giữ nguyên; order list giới hạn tối đa 100.

ThrottlerGuard gắn toàn app, storage Upstash REST thực sự dùng chung. Lua thực hiện counter/window/block expiry atomically; key hash, namespace theo môi trường. Auth/OAuth 5/phút, email onboarding 3/10 phút; register/login và resend giữ giới hạn riêng; search/suggest 30/phút, upload/redeem/RMA writes 10/phút, mặc định 100/phút. Giới hạn cơ bản theo IP, coupon còn có user/IP limiter riêng từ S5. `Retry-After` theo giây. Khi Redis configured nhưng lỗi, trả 503, không mở vô hạn; local thiếu cấu hình được dùng memory, production yêu cầu Upstash và không fallback memory.

Production startup yêu cầu secret mạnh ít nhất 32 ký tự, CORS allowlist, PUBLIC_WEB_URL HTTPS và Upstash. `/api/v1/health/live` kiểm tra HTTP process; `/api/v1/health/ready` kiểm tra DB/Redis bắt buộc, trả 503 không lộ endpoint/credentials. Search/FCM/payment vẫn có readiness riêng, không được suy từ health này là mọi provider đã pass.

## SEO và cache public

`GET /sitemap.xml` trả **sitemap index**; `GET /sitemaps/{products|categories|blog|pages}/{page}.xml` trả tối đa 1.000 URL/phần. `GET /robots.txt` là text. Tất cả nằm dưới `/api/v1` ở backend. Web phải proxy cả `/sitemap.xml`, **`/sitemaps/*`** và `/robots.txt` tại root domain website.

Host chỉ từ `PUBLIC_WEB_URL`, không từ Host header. Route Web mặc định `/products/:slug`, `/categories/:slug`, `/blog/:slug`, `/:pageSlug`; FE cần xác nhận mapping. Product active có variant active/category active/brand active hoặc không brand; category chỉ đưa vào khi cả chuỗi cha từ root active, blog PUBLISHED đã tới lịch, page published và bỏ slug hệ thống. Slug URL-encode trước XML-escape. Mỗi phần giới hạn 1.000 URL; index không vượt 50.000 phần. Lastmod lấy DB, blog dùng `content_updated_at` với trigger loại trừ views-only update.

RawResponse metadata bypass response wrapper chỉ trên SEO. ETag theo nội dung, `Cache-Control: public, no-cache` yêu cầu revalidate, trả 304 khi khớp. Không shared-cache XML nên publish/hide/đổi slug nhìn thấy ở lần revalidate kế tiếp, kể cả Admin ghi SQL. Robots mặc định `Disallow: /`, chỉ bật `SEO_INDEXING_ENABLED=true` cho production public.

Cache server dùng cho category tree, published pages và FAQ. Trigger tăng revision singleton trong cùng transaction; rollback không tăng revision, mọi instance đọc revision đã commit. Request cũ chỉ ghi vào namespace cũ; TTL dọn cache cũ. Category HTTP cache cũng revalidate. Public read Redis lỗi đi DB; lỗi DB revision không được giả là cache hit. Không cache catalog giá động, promotion/quota/stock/tier/wishlist/order/profile/notification: các dữ liệu đó tiếp tục đọc/enrich đúng owner và kiểm tra transaction PostgreSQL.

## Kiểm thử và hiệu năng

Chạy local PostgreSQL riêng, harness từ chối host/schema ngoài allowlist; không migrate/seed DB trong `.env`. Regression S4/S5 giữ các test receipt/rollback/quota/points/review/return/exchange/worker fencing; thêm OAuth first-login race, challenge replay/expiry/owner, logout/revoke, refresh race, đăng ký/CRM/POS, CORS/IP spoof, raw SEO/ETag/publication/views, cache stale fill/rollback và OpenAPI references.

```powershell
# Chạy tại backend; chọn schema mới cho mỗi lần cần fixture sạch.
$env:SPRINT4_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint4_s6_regression_new'
$env:SPRINT5_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint5_s6_regression_new'
$env:SPRINT6_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint6_acceptance_new'
node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand
node node_modules/jest/bin/jest.js --runInBand
npm run build
npx prisma validate
npx prisma generate

# Upgrade S5 với dữ liệu synthetic cũ, không dùng DB trong .env.
$env:SPRINT6_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint6_upgrade_new'
node -r ts-node/register -r tsconfig-paths/register scripts/sprint6-migration-check.ts

# Upstash thật, chỉ dùng key ngẫu nhiên có TTL và xóa đúng key sau kiểm tra.
node -r ts-node/register -r tsconfig-paths/register scripts/sprint6-redis-readiness.ts

# Synthetic catalog benchmark; script tự migrate/seed schema local riêng.
$env:SPRINT6_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint6_benchmark_new'
node -r ts-node/register -r tsconfig-paths/register scripts/sprint6-benchmark.ts
```

Kết quả cuối: build, Prisma validate/generate pass; **72 suites / 446 unit tests** và **3 suites / 54 PostgreSQL + HTTP tests** pass. Upgrade S5 với dữ liệu synthetic cũ đã kiểm chứng backfill timestamp blog, giữ user và generated inventory. Tóm tắt có thể review tại `docs/api/sprint6-validation.json`.

Evidence local trong `.tmp/sprint6-unit-results.json`, `.tmp/sprint6-e2e-results.json`, `.tmp/sprint6-upstash.json`, `.tmp/sprint6-benchmark*.json`. Upstash thật đã pass SET/GET/TTL, hai instance cùng counter chỉ cho một request khi limit=1 và cleanup đúng key; không đưa credential vào evidence.

Baseline catalog: PostgreSQL 17.9 / Node 22.14.0 local, 10.000 product + 10.000 variant + 100 category + 10.000 blog, guest price_asc, pages 1–5, 20 request, concurrency 4, không HTTP/Redis/ES. Hai lần đo p95 khoảng 335 ms và 495 ms, không lỗi; không tuyên bố cải thiện catalog từ các lần đo khác điều kiện tải máy. Query count 9/request cho cả page size 20 và 100, không tăng theo từng item. Chưa seed workload order/review/notification/ledger đại diện hoặc chốt SLO với nhóm, nên đây chưa là nghiệm thu tải production.

Blog feed `ORDER BY published_at DESC,id ASC`: EXPLAIN ANALYZE/BUFFERS trước index trên 10.000 published rows có Seq Scan + top-N sort, execution 2.628 ms; sau thêm `blog_posts_public_feed_idx(status,published_at DESC,id ASC)` có Index Scan, execution 0.042 ms. Số liệu minh họa cùng query/dataset local, không phải throughput production. Giữ index cũ vì chưa có đủ workload ghi để kết luận có thể drop an toàn.

## OpenAPI / Apidog và cấu hình bàn giao

`docs/api/openapi.json` xuất từ application module thật trong HTTP harness; dùng cùng hàm mô tả response envelope với Swagger runtime. XML/text giữ schema raw, JSON có `statusCode/success/message/data/timestamp`, error code, TTL/rate-limit và Bearer scheme. DTO checkout/preview/shipping và pagination có schema rõ hơn. Một số endpoint legacy vẫn có generic data schema; cần bổ sung response projection cụ thể khi nhánh Admin/payment tích hợp.

Import OpenAPI hoặc Postman v2.1 collection `docs/api/end-user.postman_collection.json` vào Apidog. Các environment local/staging chỉ chứa placeholder; collection dùng biến access/refresh/provider tokens, không export secret thực. Bắt đầu login → products → preview → xác nhận quoteVersion → COD order → order detail/tracking; REFUND/EXCHANGE cần đơn COMPLETED và state INSPECTED/quote hợp lệ từ Admin. Không chạy toàn collection tự động trên production.

Biến mới trong `.env.example`: `PUBLIC_WEB_URL`, `CORS_ALLOWED_ORIGINS`, `SEO_INDEXING_ENABLED`, `TRUSTED_PROXIES`, `GOOGLE_OAUTH_CLIENT_IDS`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_GRAPH_VERSION`. Storage example dùng R2 S3; return evidence private bucket riêng. SMTP phải gửi thật cho OAuth email proof; thiếu SMTP thì 503, không fake-send hoặc log mã. Cấu hình tiền/loyalty và feature flags giữ contract S4/S5.

## Runbook migration / recovery

1. Backup DB, kiểm tra `npx prisma migrate status`. Audit `SELECT lower(email),count(*) FROM users GROUP BY lower(email) HAVING count(*)>1`; giải quyết collision có xác minh owner, không tự merge. Rà dữ liệu review/constraint theo runbook S5.
2. Apply migration bằng `npx prisma migrate deploy` trên DB bản sao trước; chạy regression và kiểm tra generated inventory, quota/check, unique identity/review. Không dùng `db push` để thay SQL handwritten.
3. Deploy app sau migration, buộc client cập nhật token khi cần. Cấu hình env rồi kiểm tra health, login/logout/refresh, sitemap/robots và CORS từ Web/Admin. Chỉ bật SEO indexing/worker sau readiness của môi trường.
4. Cache thay đổi category/page/FAQ được DB trigger invalidation tự động, kể cả writer Admin. Không cần gọi Redis trong transaction. Cache cũ tự hết TTL; không FLUSHDB. Nếu Redis lỗi, khắc phục endpoint/quota/network trước khi mở auth/write traffic.
5. Search indexing/retry/dead-letter/reconciliation payment/refund/credit/points tiếp tục theo `sprint-4.md` và `sprint-5.md`. Không replay gateway callback hoặc hoàn tiền thật bằng fixture. Chưa có nhánh online payment → giữ COD gate.
6. Rollback ưu tiên application/feature flags, **giữ migration cộng thêm**. Không drop `users_email_lower_key`, bảng identity/challenge hoặc timestamp khi có traffic phiên bản mới. App cũ không còn enforce session binding nên cần đánh giá lại đăng nhập trước rollback. Nếu cần schema rollback, dừng writers, backup/export pending/audit, restore bản sao đã kiểm chứng; không có lệnh xóa tự động trên DB dùng chung.

Resource ownership: identity theo provider+subject; challenge theo clientHash và user đích; session theo userId/sessionId; order/return/attachment/wishlist/notification theo customer/user trong query như S4/S5. Admin chịu trách nhiệm CRUD/transition đúng contract; Web/Mobile xác nhận canonical route, SDK và UI challenge/email/link.

Skill đã áp dụng: `backend-architect`, `nestjs-expert`, `auth-implementation-patterns`, `api-security-best-practices`, `api-design-principles`, `prisma-expert`, `database-design`, `database-migration`, `postgresql-optimization`, `sql-optimization-patterns`, `payment-integration` (audit gate), `unit-testing-test-generate`, `code-review-checklist`. Bằng chứng là module/DI, verified identity/challenge/session, SQL constraints/triggers/index, EXPLAIN, HTTP/race regression và bộ contract. Không thay đổi Docker production image trong scope này.

Tài liệu đối chiếu: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Google email authority](https://developers.google.com/identity/sign-in/web/backend-auth), [Meta debug_token](https://developers.facebook.com/docs/graph-api/reference/debug_token/), [Upstash REST](https://upstash.com/docs/redis/features/restapi), [Sitemap protocol](https://www.sitemaps.org/protocol.html), [Apidog import/export](https://openapi.apidog.io/import-export-1328063f0).

Dependency audit: cùng thời điểm tra cứu, lockfile nhánh gốc có 37 cảnh báo gồm 2 critical. Đã nâng bcrypt lên 6.0.0 và cập nhật handlebars trong lockfile; còn 33 cảnh báo, **0 critical**. Hash synthetic tạo bởi bcrypt 5.1.1 trước upgrade đã được bcrypt 6 xác minh và có regression fixture. Các advisory high/moderate còn lại cần được nhóm xử lý hoặc đánh giá exposure trước production; không chạy `npm audit fix --force` trên toàn dependency graph. [Bcrypt 6 release](https://github.com/kelektiv/node.bcrypt.js/releases/tag/v6.0.0).

## Gate còn chờ để đóng Sprint 6

- Google/Meta dev app, supported SDK flow và test accounts; SMTP thật; login/link/onboarding Web/Mobile trên thiết bị.
- Domain/canonical route chính thức, proxy cả sitemap index/parts/robots; CORS/deep-link nghiệm thu staging.
- Tích hợp nhánh payment online và sandbox callback/refund/restart reconciliation; không đánh đồng unit/mock với provider hoạt động thật.
- DB bản sao có dữ liệu cũ và workload đủ order/review/ledger/quota/notification, SLO/performance target; demo/review chéo và owner vận hành.
- Đối chiếu dependency audit và các response schema legacy còn generic trước production sign-off.
