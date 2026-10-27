# FE-01 — Shell, auth và session broker

Ngày cập nhật: 27/10/2026. Code FE-01 đã triển khai; nghiệm thu backend/SMTP/OAuth thật còn chờ ENV-01. Không có thay đổi source backend.

| Bàn giao | Trạng thái |
|---|---|
| Shell S39 | Navbar/footer dùng chung, desktop menu, mobile dialog, search, account/cart links; không badge/count/demo claim. Home sections vẫn thuộc FE-02/06. |
| Sidebar S29 | Card khoảng 260px, user thật, hai nhóm menu, active state, logout, mobile accordion theo Sổ địa chỉ. |
| S25/S26 | Register/login, validation theo DTO, xác nhận mật khẩu, show/hide password, giữ draft, cooldown Retry-After, returnTo allowlist. |
| S28/S41 | Forgot/reset tách route; verify link bằng POST rõ ràng, URL được bỏ token sau hydrate, resend và trạng thái thiếu/expired/success. |
| S27 | Continuation/email proof/link; nonce/challenge có TTL server-side, link cần session đích, rotate web ID sau thành công. Provider entry/CTA chưa mở vì chưa có provider smoke/SDK thật. |
| Session BFF | Cookie opaque 256-bit/HttpOnly/SameSite=Lax/Secure khi HTTPS, production __Host-; token chỉ server-side trong Redis/Upstash. |
| Refresh | Redis SET NX PX, owner release và Lua CAS; đánh dấu refreshing trước upstream call, chống logout resurrection/stale owner; read retry một lần, write không replay. |
| Guest cart | Server tạo UUID upstream, browser chỉ có opaque reference; merge sau login, giữ reference khi lỗi để retry. Cart UI/mutations đầy đủ thuộc FE-03. |
| Address UI nền | Adapter Zod theo source DTO; list/empty/modal/create/edit/default/delete, max 10 và validation. Fixture đã nối; chưa nghiệm thu O02/G05/O06 và địa chỉ chuẩn hóa tại staging. |
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
- `npm run check`: OpenAPI/inventory drift, ESLint không warning, Next typegen/TypeScript strict, 37 unit tests và production build đều pass. 14 ca Redis được skip trong lệnh unit mặc định, đã chạy riêng bằng `test:sessions` và pass trên Upstash thật.
- `npm run test:e2e`: 17 pass, 1 skip có chủ ý (case menu mobile không áp dụng desktop), Chromium desktop/mobile. Backend dùng fixture, store dùng Upstash. Đã kiểm tra POST/disabled submit trước hydration và đổi user không thấy địa chỉ của user trước; fixture user tách riêng cho từng viewport.
- `npm run test:production` và `npm run test:maintenance`: pass. Home/login 200; account redirect đúng returnTo; diagnostic/unknown 404; maintenance page/site/BFF 503 và Retry-After. Các process kiểm thử đã dừng.
- Đã xem ảnh login desktop/mobile và sửa container spacing; ảnh E2E nằm trong `frontend/test-results/` bị gitignore. Không publish ảnh/source Stitch. Kiểm tra diff không có credentials Upstash; `.env.local` bị gitignore.
- Probe backend `localhost:3000` ngày 27/10 vẫn không kết nối được. Chưa nghiệm thu live register/email/login, SMTP/OAuth hay staging account/address. Các integration flag vẫn false; không có source backend thay đổi.

Hướng dẫn chạy ở [README](../README.md).

Nguồn contract: `backend/src/modules/auth/presentation/dtos`, auth use cases/controllers, `customers/presentation/dtos/customer-address.dto.ts`, customer/cart controllers. Tham chiếu [ADR-001](adr/001-session-refresh.md), [ADR-002](adr/002-runtime-contracts-cache.md), [Upstash compatibility](https://upstash.com/docs/redis/overall/compatibility), [Upstash security](https://upstash.com/docs/redis/features/security).
