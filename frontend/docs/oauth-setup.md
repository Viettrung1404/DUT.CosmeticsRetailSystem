# OAuth local — Google và Facebook

Facebook SDK hiện từ chối `FB.login` trên HTTP, kể cả lượt thử tại localhost được ghi nhận trong browser log. Việc popup xuất hiện chưa chứng minh SDK trả về token hay đăng nhập GlowUp thành công. Xem [yêu cầu HTTPS của Meta](https://developers.facebook.com/blog/post/2018/06/08/enforce-https-facebook-login/).

## Chạy frontend bằng HTTPS

Dừng frontend HTTP trong terminal của bạn, rồi chạy từ `frontend`:

```powershell
npm run dev:https
```

Mở `https://localhost:3001/login`. Next tạo chứng chỉ local qua mkcert; lần đầu có thể yêu cầu cài/chấp nhận chứng chỉ tin cậy trên máy. Chứng chỉ nằm trong `certificates/`, bị gitignore. Đây là chứng chỉ development, không dùng cho production.

Lệnh này chỉ đặt `SITE_URL=https://localhost:3001` cho process HTTPS để Origin/CSRF và Secure cookie khớp địa chỉ trình duyệt. `npm run dev` vẫn dùng cấu hình HTTP hiện có. Backend tiếp tục `http://localhost:3000/api/v1`: browser gọi BFF HTTPS, Next gọi backend phía server nên không có browser mixed content. Nếu dùng email link trong lượt thử HTTPS, đặt `PUBLIC_WEB_URL=https://localhost:3001` ở backend và restart backend để link email dùng đúng origin.

## Meta App Dashboard

1. Mở [Meta Apps](https://developers.facebook.com/apps/), chọn ứng dụng có App ID trùng `FACEBOOK_APP_ID` của frontend/backend.
2. Vào **App settings → Basic → Add platform → Website**, khai báo **Site URL** là `https://localhost:3001/`. **App Domains** dùng hostname `localhost`.
3. Vào **Facebook Login → Settings**. Với dashboard dùng Use cases, mở use case đăng nhập Facebook → **Customize → Settings**.
4. Bật **Client OAuth Login**, **Web OAuth Login** và **Login with the JavaScript SDK**. Trong **Allowed Domains for the JavaScript SDK**, khai báo origin website `https://localhost:3001`; không thêm path `/login`.
5. Save changes. Khi app đang Development, thử bằng tài khoản Admin/Developer/Tester đã nhận lời mời trong phần App Roles.

Code hiện gọi `FB.login` và nhận access token qua JavaScript callback, rồi POST BFF `/api/auth/oauth/facebook`; backend xác minh với Meta. Không có route GET `/auth/facebook/callback` và không khai báo một callback URL giả vào **Valid OAuth Redirect URIs**. `/oauth/continue` là continuation riêng của GlowUp, không phải provider callback.

Nếu Meta không chấp nhận localhost trong cấu hình app của bạn, dùng hostname HTTPS development được chấp nhận (ví dụ tunnel). Cập nhật đồng bộ Website URL/SDK allowed origin trong Meta và `SITE_URL` của Next theo origin đó. Lệnh `dev:https` cố định localhost; với tunnel chạy Next bằng lệnh phù hợp và cấu hình `SITE_URL` là origin tunnel.

## Google khi chuyển sang HTTPS

Trong **Google Auth Platform → Clients → Web client → Authorized JavaScript origins**, thêm `https://localhost:3001` và giữ các origin HTTP nếu vẫn cần `npm run dev`. Client ID phải khớp frontend và nằm trong `GOOGLE_OAUTH_CLIENT_IDS` của backend. Popup + JS callback hiện tại không cần thêm redirect URI. Xem [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Phân biệt lỗi Redis

Frontend session store qua native TLS trả `SESSION_UNAVAILABLE` khi lỗi. `REDIS_UNAVAILABLE` xuất hiện từ `readApiResponse → upstream → broker.read` là response 503 từ backend; lỗi này độc lập với cấu hình Facebook.

Backend Upstash REST mặc định chờ 4000ms, cấu hình bằng `UPSTASH_REDIS_TIMEOUT_MS` (100–10000ms). Frontend local dùng `BACKEND_TIMEOUT_MS=10000` để có thời gian chờ Redis + xử lý auth/DB. Backend log chỉ ghi `redis_command_failed` và reason `timeout`, `network`, `http_<status>`, `invalid_response` hoặc `command_error`; không ghi keys, token hoặc provider body. Không tự retry INCR/EVAL khi timeout vì lệnh có thể đã chạy. Khi Redis mất kết nối, rate limit vẫn từ chối request, không bypass sang memory.

Probe 28/10/2026: REST PING trả 200, native PING trả PONG, backend live/ready trả 200. Có lượt REST mất khoảng 1,2–1,4s; timeout 2s trước đây là khả năng gây lỗi gián đoạn, chưa chứng minh là nguyên nhân duy nhất. Nếu lỗi lặp lại, xem reason trong backend log và metrics Upstash; không coi việc tăng timeout là đã chữa mọi lỗi mạng/quota/credential.
