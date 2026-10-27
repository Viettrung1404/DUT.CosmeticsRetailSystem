# ADR-001 — Opaque web session và refresh broker

Ngày: 26/10/2026; cập nhật 27/10/2026. Trạng thái: runtime FE-01 đã triển khai, đã test trên Upstash thật; gate backend/provider còn mở. Xem [checklist FE-01](../fe-01-checklist.md).

## Bối cảnh và quyết định

Nest trả access/refresh token trong JSON. Refresh xoay token và có thể vô hiệu hóa access token trước đó; SSR, nhiều tab và nhiều instance Next có thể đồng thời refresh. Chọn cookie chứa ID ngẫu nhiên 256-bit và Redis server-side có TTL, khóa phân tán, compare-and-swap theo version. Không dùng promise/module-global lock làm bảo đảm production. Session store không lưu nghiệp vụ commerce và Next không truy cập database nghiệp vụ.

Cookie production: `__Host-glowup-session`, HttpOnly, Secure, SameSite=Lax, Path=/, không Domain. Local HTTP dùng `glowup-session`. Rotate ID sau login/link quyền; thời hạn cookie không vượt refresh expiry từ backend. Không hardcode refresh TTL từ mock. Chỉ Route Handler/Server Action sửa cookie; RSC chỉ đọc và gọi broker trực tiếp.

Redis dùng TLS, ACL và namespace riêng; key là hash của session ID, value chứa user scope, access/refresh token, access/refresh expiry, version. Không log value/ID/token. TTL cứng không vượt refresh expiry; store lỗi trả unavailable, không fallback memory. Cần cấu hình `SESSION_REDIS_URL` và `SESSION_KEY_PREFIX` ở FE-01; credentials chỉ server, không NEXT_PUBLIC.

## Refresh đa instance

1. Đọc session/version; request private luôn no-store. Gọi upstream bằng access token, chỉ xử lý lỗi auth 401; 403 không refresh.
2. Xin lock theo session (`SET NX PX`) với owner nonce. TTL lock dài hơn bounded upstream timeout; nếu gia hạn cần kiểm tra owner bằng Lua.
3. Sau khi có lock, đọc lại version. Nếu request khác đã đổi token, dùng version mới; không dùng refresh token cũ.
4. Gọi refresh một lần. Ghi token mới bằng Lua/CAS chỉ khi owner lock còn đúng, session còn tồn tại và version khớp. Logout xóa session/tạo tombstone, CAS không được tạo lại phiên đã logout. Release lock chỉ khi owner khớp.
5. Request thua lock đợi có giới hạn, đọc lại version hoặc trả 503. Không spam refresh; không coi hết TTL lock là bằng chứng refresh trước chưa commit.
6. Refresh 401 chắc chắn: invalidate phiên. 429/503/network: giữ phiên và tôn trọng Retry-After; không logout vì lỗi mạng. Timeout sau upstream rotate có kết quả không xác định: không tự retry refresh token cũ; đánh dấu phiên cần recovery và yêu cầu đăng nhập lại nếu BE không có grace/idempotency contract. Cần chốt nhánh này với BE trước FE-01 sign-off.
7. Sau refresh, retry read tối đa một lần; write chỉ retry khi có bảo đảm chưa thực hiện hoặc idempotency contract. Không retry write do timeout tùy ý.

## Browser/BFF

- Mutation cookie-based kiểm tra Origin khớp SITE_URL, reject missing/untrusted Origin và kiểm tra Content-Type; CSRF token cho ngoại lệ cần contract riêng. GET không đổi trạng thái. Không có generic upstream proxy.
- BFF allowlist method/path/header; không forward Authorization, Cookie, Host, X-Forwarded-For do browser tùy ý gửi. Trusted proxy/IP rate limiting thuộc ENV-01/O09.
- Logout vô hiệu hóa phiên local/cookie ngay cả khi revoke upstream lỗi. Không tuyên bố revoke mọi thiết bị. QueryClient clear/cancel private queries khi logout hoặc đổi user; query keys có user scope.
- `returnTo` phải là same-origin path được allowlist; reject scheme-relative, backslash, encoded bypass. FE-01 phải test redirect validation.
- Guest cart có UUID cookie riêng do server tạo, gửi X-Session-Id; chỉ xóa guest reference sau merge thành công. Login thất bại/merge retry không làm mất cart.
- OAuth challenge/clientNonce/email proof có TTL server-side; account linking cần login đích và proof đúng backend. Không tự merge identity.

## Đánh đổi và nghiệm thu FE-01

Thêm Redis availability/latency và recovery khi upstream rotate rồi crash trước CAS. Phương án cookie chứa token giảm hạ tầng nhưng không giải quyết race/cookie overwrite giữa SSR và nhiều tab. Không chọn phương án đó.

Gate FE-01: test hai instance/hai tab refresh cùng phiên, lock expiry, CAS stale, logout trong lúc refresh, 401/403/429/503/network timeout, user A → B cache isolation, CSRF, redirect và store unavailable. Backend authoritative cho ownership. Health/live không chứng minh session store/provider sẵn sàng.

Tham chiếu: [kiến trúc](../../../docs/3-planning/fe/01_architecture.md), [Next authentication](https://nextjs.org/docs/app/guides/authentication).

## Ghi nhận triển khai

- Dùng chung Upstash với backend theo yêu cầu người dùng, prefix riêng và TLS; Redis client chỉ ở server. Chưa có ACL user riêng, nên namespace hiện là cơ chế tránh collision, không được mô tả như isolation quyền.
- Backend chưa có refresh expiry trong JSON; cấu hình bắt buộc `SESSION_MAX_AGE_SECONDS` tạo fixed deadline không vượt TTL backend. Refresh không gia hạn deadline này.
- Pending state được CAS trước refresh. Owner crash/lock expiry hoặc refresh outcome không xác định chuyển recovery, không gửi lại refresh token cũ. 429 có persisted backoff; refresh 503/network được xử lý bảo thủ như outcome chưa xác định cho tới khi có contract rõ hơn.
- React request memoization cho current user không chia sẻ giữa request. Upstash chỉ chứa session kỹ thuật; public data caching vẫn theo ADR-002.
