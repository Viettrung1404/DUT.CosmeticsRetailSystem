# GlowUp — chạy dự án sau khi clone/pull

Frontend Next.js chạy ở cổng **3001**, backend NestJS chạy ở cổng **3000**. Dùng **Node.js 22.14+ thuộc nhánh 22 hoặc Node.js 24**, npm 10+ và `npm ci` để cài đúng lockfile.

Checkout hỗ trợ **COD và SePay VietQR**. Cấu hình và quy trình thử thanh toán nằm tại [hướng dẫn SePay](backend/docs/sepay-setup.md).

## Chạy hệ thống

Đây là quy trình mặc định khi yêu cầu **“chạy hệ thống”**. Sau khi cấu hình các file môi trường, chạy `npx prisma migrate deploy` trong `backend` nếu có migration mới và chạy `npm run build` trong cả `backend` và `frontend` khi mã nguồn thay đổi. Frontend HTTPS cần cặp chứng chỉ `localhost.pem` và `localhost-key.pem` trong `frontend/certificates`.

Mở bốn terminal từ thư mục gốc và giữ chúng hoạt động:

| Thư mục | Lệnh | Kiểm tra |
| --- | --- | --- |
| `backend` | `npm run start:prod` | Đợi [readiness](http://localhost:3000/api/v1/health/ready) trả 200 |
| `backend` | `npm run tunnel:payment` | Chạy sau khi backend sẵn sàng. Khởi động lại backend nếu URL thanh toán trong `.env` thay đổi |
| `frontend` | `npm run start:https` | Mở [web HTTPS](https://localhost:3001) |
| `mobile` | `npx expo start` | Mở Metro ở cổng 8081 |

Nếu một tiến trình đúng lệnh đang chạy và hoạt động, dùng lại tiến trình đó. Khi vừa build lại, khởi động lại đúng backend và frontend của dự án để nạp bản mới.

## Người khác pull code về có chạy được không?

**Có, sau khi cấu hình môi trường riêng.** Git không chứa `backend/.env`, `frontend/.env.local`, mật khẩu demo, cấu hình đăng nhập ngrok hoặc database của người đang phát triển. Chỉ có mã nguồn và file `.env.example`. Các thay đổi local cũng phải được commit/push trước thì người khác mới pull được.

| Muốn chạy gì? | Cần chuẩn bị |
| --- | --- |
| Website, tài khoản, giỏ hàng và COD | Backend, frontend, PostgreSQL có schema/dữ liệu phù hợp và Redis; không cần tunnel ngrok |
| SePay Test mode độc lập trên máy mình | Các dịch vụ trên, tài khoản/token Test mode, webhook HMAC-SHA256 và URL backend công khai; xem runbook SePay |
| Dùng môi trường demo chung của nhóm | Người quản lý môi trường chạy backend/tunnel và cấu hình SePay; thành viên dùng các URL được bàn giao |

Không cùng lúc mở nhiều tunnel bằng cùng domain. Nếu dùng chung tài khoản SePay, cần thống nhất backend và URL webhook nhận giao dịch; đổi webhook sang máy khác có thể làm gián đoạn người đang test. Người cần thử độc lập nên dùng cấu hình Test mode và domain của mình.

## 1. Thiết lập lần đầu

Từ thư mục gốc, mở PowerShell:

```powershell
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run prisma:generate
```

Điền `backend/.env` trước khi chạy server:

| Nhóm biến | Cần điền |
| --- | --- |
| Database | `DATABASE_URL` của PostgreSQL/Neon đã có schema ứng dụng |
| Auth | `JWT_SECRET`, thời hạn JWT/refresh theo cấu hình nhóm |
| Redis backend | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; đối chiếu các biến Redis trong `.env.example` |
| SePay | Giữ `SEPAY_ENABLED=false` nếu chỉ chạy COD; điền `SEPAY_*` theo runbook khi dùng thanh toán online |
| Provider khác | SMTP, OAuth, storage cần cấu hình nếu dùng chức năng tương ứng |

Nếu chuẩn bị **database riêng mới**, áp dụng các migration đã có bằng `npx prisma migrate deploy` trong `backend`. Database mới chưa có catalog, cửa hàng và tồn kho nên chưa thể checkout ngay; xem [hướng dẫn dữ liệu demo](backend/scripts/demo/README.md). Nếu được bàn giao database của nhóm đã chuẩn bị, không tạo lại migration khởi tạo hoặc reset dữ liệu. Các lệnh đọc readiness không tự seed/migrate database.

Mở terminal khác từ thư mục gốc:

```powershell
cd frontend
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Điền `frontend/.env.local`:

```dotenv
BACKEND_API_BASE_URL=http://localhost:3000/api/v1
SITE_URL=http://localhost:3001
SESSION_REDIS_URL=DIEN_URL_REDIS_THUC
SESSION_KEY_PREFIX=glowup:frontend:ten-thanh-vien:session:
SESSION_MAX_AGE_SECONDS=604800
```

`SESSION_MAX_AGE_SECONDS` không vượt thời hạn refresh token backend. Nếu dùng chung Redis, đặt prefix riêng cho môi trường/thành viên. Token API và webhook secret của SePay chỉ đặt ở backend. Nhận thông tin dịch vụ từ người quản lý nhóm qua kênh riêng hoặc tạo dịch vụ của mình; không commit các file env.

## 2. Chạy local với COD

Giữ hai terminal hoạt động:

| Terminal | Thư mục | Lệnh |
| --- | --- | --- |
| 1 — Backend | `backend` | `npm run start:dev` |
| 2 — Frontend | `frontend` | `npm run dev` |

Mở **http://localhost:3001**. Swagger tại **http://localhost:3000/api/docs**. Backend phải trả 200 tại **http://localhost:3000/api/v1/health/ready**. Chạy COD không cần mở tunnel; SePay bị khóa ở checkout nếu chưa cấu hình đầy đủ.

## 3. Chạy và test SePay

### Cấu hình một lần trên mỗi máy

1. Tạo tài khoản ngân hàng, API Access và webhook trong **SePay Test mode**; xem [hướng dẫn từng bước](backend/docs/sepay-setup.md).
2. Cài ngrok, đăng nhập tài khoản và chạy lệnh `ngrok config add-authtoken ...` từ [dashboard ngrok](https://dashboard.ngrok.com/get-started/your-authtoken) trực tiếp trong terminal cá nhân. Không gửi token qua chat/Git.
3. Lấy đúng **Dev Domain** tại [Domains](https://dashboard.ngrok.com/domains). Không lấy URL tạm tự sinh từ lần chạy trước.
4. Điền nhóm biến trong `backend/.env`:

```dotenv
NGROK_DOMAIN=DOMAIN-DUOC-CAP.ngrok-free.dev
PAYMENT_PUBLIC_BASE_URL=https://DOMAIN-DUOC-CAP.ngrok-free.dev/api/v1
PAYMENT_WEB_RETURN_URL=https://localhost:3001/payment/return
PAYMENT_WORKER_ENABLED=true
SEPAY_ENABLED=true
SEPAY_MODE=sandbox
SEPAY_API_TOKEN=DIEN_TOKEN_TEST_MODE
SEPAY_WEBHOOK_SECRET=DIEN_SECRET_HMAC
SEPAY_BANK_ACCOUNT_ID=DIEN_UUID_TAI_KHOAN_API_V2
SEPAY_BANK_CODE=ACB
SEPAY_ACCOUNT_NUMBER=DIEN_SO_TAI_KHOAN_TEST
SEPAY_ACCOUNT_NAME=DIEN_TEN_CHU_TAI_KHOAN
SEPAY_MIN_AMOUNT=1
SEPAY_MAX_AMOUNT=50000000
SEPAY_MAX_QPS=3
```

Thay các giá trị `DIEN_*` và `DOMAIN-DUOC-CAP` bằng cấu hình riêng. `SEPAY_BANK_ACCOUNT_ID` là UUID lấy từ API v2, không phải ID số trong webhook. Trên dashboard SePay, đặt URL webhook là `https://DOMAIN-DUOC-CAP.ngrok-free.dev/api/v1/payments/sepay/webhook`, chọn **Tiền vào**, **JSON**, **HMAC-SHA256**, nhập cùng secret với `SEPAY_WEBHOOK_SECRET` và bật tự động gửi lại khi server lỗi. Sửa `.env` không tự cập nhật webhook trên dashboard.

### Thứ tự chạy mỗi lần test

Dùng quy trình [Chạy hệ thống](#chạy-hệ-thống) ở đầu README. Dừng từng tiến trình bằng `Ctrl+C` ở terminal tương ứng.

Trong terminal kiểm tra ở `backend`:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health/ready
Invoke-RestMethod http://localhost:3000/api/v1/payments/methods
```

Readiness phải trả 200 và API phương thức thanh toán phải có `data.SEPAY=true`. Sau đó mở **https://localhost:3001**, tin cậy chứng chỉ phát triển và dùng cùng trình duyệt/origin trong suốt checkout.

Đặt **đơn mới**, chọn **SePay**, lấy đúng số tiền và toàn bộ mã nội dung `GU...` từ trang thanh toán. Trên SePay Test mode → Mô phỏng giao dịch, chọn đúng tài khoản, **Tiền vào**, nhập số tiền và nội dung vừa lấy rồi gửi trước khi đơn hết hạn 15 phút. Webhook phải trả **200 / success:true**; sau đối soát API, payment chuyển `COMPLETED` và đơn chuyển từ `PENDING_PAYMENT` sang `PENDING` để chờ nhân viên xác nhận. Sau khi nhân viên xác nhận, đơn mới chuyển `CONFIRMED`. Test mode dùng giao dịch mô phỏng, không chuyển tiền thật. Không dùng nội dung thử tùy ý vì backend cần mã payment của đơn.

### Sau khi tắt máy hoặc đóng terminal

Mỗi lần mở máy để thử thanh toán, dùng lại quy trình ở đầu README. `NGROK_DOMAIN` cố định giúp giữ nguyên URL: không cần nhập lại authtoken hay cấu hình lại webhook nếu domain không đổi. Tunnel chỉ truy cập được khi máy, backend và ngrok đang chạy. Khi backend được triển khai trên server có URL công khai thì không cần ngrok.

## 4. Sau những lần pull tiếp theo

- Chạy lại `npm ci` ở package có lockfile thay đổi; sinh Prisma Client nếu schema thay đổi.
- Đối chiếu các biến mới trong `.env.example`, bổ sung vào env riêng; không ghi đè env đã điền.
- Nếu có migration mới, phối hợp với người quản lý database trước khi áp dụng trên DB chung.
- Giữ `NGROK_DOMAIN` đã được cấp và chạy lại `npm run tunnel:payment` khi cần.

Chi tiết theo package: [backend](backend/README.md), [frontend](frontend/README.md), [SePay Test mode và Live](backend/docs/sepay-setup.md).
