# FE-01 — Shell, auth và session broker

Ngày cập nhật: 28/10/2026. Code FE-01 đã triển khai và đã chỉnh UI theo Stitch, navbar mới theo D00. Xem [bảng đối chiếu thiết kế](fe-01-design-review.md) cho nguồn từng màn và các khác biệt có căn cứ. Nghiệm thu backend/SMTP/OAuth thật còn chờ ENV-01. Lượt debug Redis sau UI có sửa timeout/log của adapter backend, ghi bên dưới.

| Bàn giao | Trạng thái |
|---|---|
| Shell S11/S39 | Đã sửa navbar theo **`code.html`** Danh mục chăm sóc da (S11, D00 cập nhật 28/10/2026): announcement hồng, search/camera, cửa hàng/tạp chí/more, account/wishlist/cart, pill nhiều màu và cuộn tiếp; mobile dialog và active state theo route. Footer theo HTML trang chủ (S39); không badge/count demo. Home sections vẫn thuộc FE-02/06. |
| Sidebar S29 | Card khoảng 260px, user thật, hai nhóm menu, active state, logout, mobile accordion theo Sổ địa chỉ. |
| S25/S26 | Auth không header/footer theo D11. Register/login giữ editorial hai cột theo hai nguồn riêng, ảnh local, form icon, password strength; validation theo DTO, xác nhận mật khẩu, show/hide password, giữ draft, cooldown Retry-After, returnTo allowlist. |
| S28/S41 | Card giữa trang theo từng nguồn, recovery hai bước và verify có logo/icon email. Forgot/reset tách route; verify link bằng POST rõ ràng, URL được bỏ token sau hydrate, resend và trạng thái thiếu/expired/success. |
| S27 | Continuation/email proof/link; nonce/challenge có TTL server-side, link cần session đích, rotate web ID sau thành công. Google/Facebook entry đã nối SDK và BFF ở login/register, xử lý error/cancel/unavailable. Bật bằng public ID và `OAUTH_*_ENABLED`; chưa nghiệm thu login provider thật. |
| Session BFF | Cookie opaque 256-bit/HttpOnly/SameSite=Lax/Secure khi HTTPS, production __Host-; token chỉ server-side trong Redis/Upstash. |
| Refresh | Redis SET NX PX, owner release và Lua CAS; đánh dấu refreshing trước upstream call, chống logout resurrection/stale owner; read retry một lần, write không replay. |
| Guest cart | Server tạo UUID upstream, browser chỉ có opaque reference; merge sau login, giữ reference khi lỗi để retry. Cart UI/mutations đầy đủ thuộc FE-03. |
| Address UI nền | Adapter Zod theo source DTO; list/empty/card thêm địa chỉ, form inline theo S29, create/edit/default/delete, max 10, validation và focus. Fixture đã nối; chưa nghiệm thu O02/G05/O06 và địa chỉ chuẩn hóa tại staging. |
| S01/S17/S30 | Not-found, segment/root/global error, loading skeleton, maintenance 503/Retry-After; network error giữ riêng. |

Auth forms dùng POST và chỉ cho submit sau hydration để không đưa thông tin đăng nhập vào URL khi JavaScript chậm/chưa chạy. Trang bảo trì là response HTML trực tiếp, dùng cùng navigation/brand tokens, để trả 503 ngay cả khi React/session store không hoạt động; không dùng rewrite tới chính trang đang bị chặn.

## Store và cache

- Dùng chung Upstash với backend qua native TLS `rediss://`; credentials nằm trong `.env.local` bị gitignore. Namespace runtime frontend: `glowup:frontend:local:session:`; test dùng prefix riêng. Không scan/flush database hay đọc key backend.
- Upstash đang lưu **trạng thái phiên server**, không cache catalog/order và không phải database nghiệp vụ. ID được hash trong key; giá trị có token/user/version/deadline, không đưa xuống browser hay log.
- Backend chưa trả expiry của opaque refresh token. `SESSION_MAX_AGE_SECONDS` là upper bound bắt buộc không vượt TTL backend; web session hết hạn cố định, không kéo dài theo refresh. Cookie/record cùng deadline; broker kiểm tra deadline ngay cả khi clock Redis chậm. Cần NTP giữa instance/store khi deploy.
- RSC gọi trực tiếp upstream; `React.cache` chỉ memoize current user trong một render request. Không gọi HTTP vòng qua BFF và không dùng shared persistent cache cho user.
- Upstream `no-store`; BFF private trả `Cache-Control: private, no-store`, `Vary: Cookie`. TanStack Query có stale time 30 giây trong memory, key addresses gồm user ID; mutation invalidate, auth change cancel/clear cache và tải document mới để bỏ RSC/router cache. Tab khác nhận thông báo storage để reload; không persist private data/token trong localStorage.
- Catalog/public caching chưa bật, theo ADR-002 và gate FE-02. Redis connection dùng chung trong process không phải cache dữ liệu người dùng.

## Recovery và giới hạn

- Refresh 401 xóa phiên; 403 của private read không refresh. 429 giữ phiên và lưu backoff/Retry-After dùng chung giữa các instance.
- Timeout/network hoặc refresh 503 chưa có contract chứng minh upstream chưa rotate: giữ record ở trạng thái recovery, không dùng lại refresh token cũ. Request đầu giữ lỗi upstream; lần truy cập tiếp yêu cầu đăng nhập lại. Đây là lựa chọn bảo thủ trong lúc chờ grace/idempotency/expiry contract, chưa được coi là nghiệm thu nhánh transient của ENV-01.
- Logout xóa record trước revoke; cookie được xóa cả khi revoke lỗi. Khi store không truy cập được, trả lỗi rõ ràng và vẫn xóa cookie; chưa thể khẳng định revoke record/upstream thành công. Không tuyên bố đăng xuất mọi thiết bị.
- Dùng chung credential/database Upstash không thay thế ACL cô lập. Khi triển khai, cấp user/ACL giới hạn namespace session nếu plan hỗ trợ; prefix hiện ngăn collision của app nhưng không phải ranh giới quyền truy cập.
- Trusted proxy/IP rate limiting backend còn ENV-01; frontend không tin X-Forwarded-For do browser gửi. SMTP/provider/storage và các policy/content claim còn cần nghiệm thu thật.

## Kiểm chứng

- Unit tests cho validation/redirect/CSRF/body limit và response projection; OAuth tests cho binding, expiry, proof và authenticated linking.
- 14 tests session đã pass trên **Upstash thật**: hai broker/hai tab cùng refresh, expired owner/stale CAS, logout trong refresh, 401/403/429/503/504, backoff, write không replay, fixed deadline và store unavailable.
- Playwright dùng backend fixture và store thật, bao gồm desktop/mobile, auth states, private redirect, cookie flags/token isolation, address và chuyển user. Không dùng kết quả fixture làm bằng chứng backend/SMTP/provider thật.
- Kiểm tra lượt sửa UI/auth 28/10: OpenAPI/inventory drift, ESLint không warning, TypeScript strict, 38 unit tests và production build đều pass. 14 ca Redis được skip trong unit mặc định; kết quả chạy riêng trên Upstash thật ở trên thuộc lượt FE-01 trước, không chạy lại session concurrency vì broker không đổi.
- E2E 28/10: **23 pass, 1 skip có chủ ý** (case menu mobile không áp dụng desktop), Chromium desktop/mobile. Gồm navbar HTML/pill màu/active state/search/Escape/scroll, sáu composition auth, 404/503/logo maintenance, POST/disabled submit trước hydration, CRUD địa chỉ và chuyển user không lộ dữ liệu. Backend dùng fixture, store dùng Upstash; fixture user tách riêng cho từng viewport.
- `npm run test:production` và `npm run test:maintenance`: pass. Home/login 200; account redirect đúng returnTo; diagnostic/unknown 404; maintenance page/site/BFF 503 và Retry-After. Các process kiểm thử đã dừng.
- Review mới 28/10: nguồn chuẩn là **HTML hiện tại**, không phải `screen.png` cũ. Đối chiếu thêm ảnh navbar mới người dùng gửi; ảnh kết quả desktop/mobile nằm trong `frontend/test-results/` bị gitignore. Logo và hai ảnh editorial từ thiết kế được tối ưu WebP local, có `sources.json`; không đưa nguyên HTML/screen vào app. Chi tiết nguồn/ngoại lệ ở [bảng đối chiếu](fe-01-design-review.md). `.env.local` bị gitignore.
- Sau khi người dùng bật backend ngày 28/10: health/live trả 200, BFF → backend OAuth thật trả 401 với credential cố ý không hợp lệ cho cả Google/Facebook. SDK thật đều tải 200; Facebook mở popup đăng nhập tại facebook.com. Google render nút nhưng báo origin không được phép với client ID hiện tại; cần thêm `http://localhost:3001` trong Authorized JavaScript origins của đúng Web client trong Google Console. Chưa hoàn tất consent/login provider thật, live email proof/SMTP hoặc staging account/address. Integration status vẫn false; `OAUTH_*_ENABLED` chỉ là cờ bật runtime, không phải nghiệm thu. Không đổi source backend.
- OAuth E2E chạy riêng sau khi sửa: **12 pass**, Chromium desktop/mobile. Bao gồm hai provider callback → BFF → Upstash, cookie opaque/HttpOnly, returnTo, challenge chưa tạo login, proof sai/đúng và consume, linking yêu cầu login đích, hủy, invalid credential, SDK bị chặn. SDK/backend được giả lập; không dùng fixture làm bằng chứng đăng nhập Google/Facebook thật.
- Auth chuyển ra route group `(auth)` cùng cấp `(site)`; sáu route không có header/footer trong SSR production, no-JS và client navigation. Đã sửa callback Google giữ state cũ trước hydration. Nút Google dùng GIS chính thức (copy/branding của SDK), bố cục hai provider theo HTML và xếp dọc trên mobile.

Hướng dẫn chạy ở [README](../README.md).

## Debug Facebook HTTPS và Redis — 28/10/2026

- Browser thực tế từ chối `FB.login` trên HTTP. Popup mở được ở lượt trước chưa đủ chứng minh provider login hoàn tất. Đã thêm `npm run dev:https` với `SITE_URL` HTTPS theo process, giữ `npm run dev` HTTP; UI giải thích HTTPS khi SDK chỉ log và không callback. Chứng chỉ local bị gitignore.
- Smoke thực tế ở server HTTPS kiểm thử cổng 3015, dùng chứng chỉ tạm không cài vào trust store: Facebook mở popup, không còn cảnh báo từ chối HTTP, BFF HTTPS → backend thật trả 401 với credential cố ý sai. Đã đóng server kiểm thử và xóa private key/cert tạm; chưa nghiệm thu login/consent tài khoản Facebook thật.
- `REDIS_UNAVAILABLE` từ `readApiResponse → upstream → broker.read` là 503 backend Upstash REST. Frontend native Redis store hiện dùng mã `SESSION_UNAVAILABLE`. Probe REST/native và backend live/ready đều đạt; có lượt REST 1,2–1,4s trong khi deadline cũ 2s. Chưa chứng minh timeout là nguyên nhân duy nhất của lỗi người dùng.
- Backend có `UPSTASH_REDIS_TIMEOUT_MS`, mặc định 4000ms và validate 100–10000ms; log reason an toàn, không lộ command/key/credentials/body. Không retry lệnh INCR/EVAL và không bỏ qua rate limit khi Redis lỗi. Frontend local deadline 10000ms để đủ thời gian chờ backend.
- Kiểm tra lượt này: 12 backend unit tests Redis/throttler/config, backend TypeScript, 38 frontend unit tests, 14 OAuth E2E desktop/mobile và lint pass. Fixture E2E không thay nghiệm thu provider thật.
- Các URL và các mục cần khai báo trong Meta/Google khi đổi sang HTTPS: [OAuth setup](oauth-setup.md).

Nguồn contract: `backend/src/modules/auth/presentation/dtos`, auth use cases/controllers, `customers/presentation/dtos/customer-address.dto.ts`, customer/cart controllers. Tham chiếu [ADR-001](adr/001-session-refresh.md), [ADR-002](adr/002-runtime-contracts-cache.md), [Upstash compatibility](https://upstash.com/docs/redis/overall/compatibility), [Upstash security](https://upstash.com/docs/redis/features/security).
