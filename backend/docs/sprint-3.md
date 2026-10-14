# Sprint 3 backend end-user — Việt Trung

Ngày triển khai: 11/10/2026. Thiết kế đã được duyệt có điều kiện; **chưa nghiệm thu Sprint 3**. Người dùng xác nhận chưa có credentials merchant và URL callback HTTPS public. Không có giao dịch sandbox thật được thực hiện trong đợt triển khai này.

## Phạm vi đã triển khai

- Một `PaymentsModule`, adapter VNPay/MoMo/ZaloPay, durable inbox, query worker, lease/heartbeat và manual-refund compensation.
- Checkout, cancellation, lịch sử, notification và email outbox dùng transaction context chung của `PrismaService` qua AsyncLocalStorage. Inventory khóa theo ID tăng dần; coupon/điểm được kiểm tra lại khi đã khóa, tránh dùng trùng khi checkout đồng thời. Xóa giỏ hàng cùng transaction checkout.
- Đổi mật khẩu dựa trên JWT `sid`, giữ phiên hiện tại; refresh dùng CAS trên cùng session row. User repository chỉ ghi các trường đã thay đổi để verify/reset không khôi phục password hoặc quyền từ snapshot cũ.
- Hồ sơ User/Customer; đồng bộ phone và bỏ xác minh khi thay số. Avatar giải mã nội dung JPG/PNG/WebP, giới hạn 5 MB/16 MP, xử lý Sharp 512×512 WebP trước khi lưu S3.
- Notification có phân trang, unread count và kiểm tra sở hữu khi đánh dấu đọc. Email order/security dùng durable outbox; lỗi SMTP giữ PENDING và retry, không báo gửi thành công giả.

## API và hợp đồng Web/Mobile

Tiền tố mặc định `/api/v1`. API khách hàng giữ envelope hiện có `{statusCode, success, message, data}`; callback và browser return dùng response riêng. Xem Swagger tại `/api/docs` và [Postman](./sprint-3.postman_collection.json).

| API | Hợp đồng |
| --- | --- |
| `POST /payments/{vnpay,momo,zalopay}/create` | JWT; `{orderId, platform?: "WEB" \| "MOBILE"}`; backend lấy amount từ đơn của tài khoản. 200 khi có kết quả; 202 khi INITIATING/UNKNOWN/NEEDS_REVIEW. |
| `GET /payments/:id/status` | JWT + ownership; payment/order status, verification/refund flags và deadline. |
| `GET /payments/vnpay/ipn` | Public, native JSON `RspCode`; chữ ký SHA512. |
| `POST /payments/momo/ipn` | Public, chữ ký SHA256, raw JSON lossless; HTTP 204 rỗng sau commit. |
| `POST /payments/zalopay/callback` | Public, HMAC key2 trên nguyên chuỗi `data`; native `return_code=1` thành công, `2` input không hợp lệ; DB lỗi HTTP 503 để cổng retry. |
| `GET /payments/vnpay/callback`, `/momo/callback`, `/zalopay/return` | State ngẫu nhiên 32 byte, TTL 24 giờ. Không cập nhật trạng thái tiền từ browser. |
| `PUT /auth/change-password` | `{oldPassword,newPassword}`; JWT phải có sid của phiên còn hoạt động thuộc tài khoản. |
| `GET/PUT /users/me` | GET hồ sơ; PUT `fullName, phone, avatarUrl, dateOfBirth, gender`; không nhận password/role/email. |
| `POST /upload/avatar` | JWT; multipart field `file`; trả `{url}` để dùng khi cập nhật hồ sơ. |
| `GET /notifications?page=1&limit=20` | JWT; items/total/unreadCount; limit tối đa 100. |
| `PUT /notifications/:id/read` | JWT + ownership, idempotent. |

Create response: `paymentId, orderId, method, status, paymentUrl, walletDeeplink, qrCodeData, returnUrl, expiresAt`. Status response bổ sung `paymentStatus, orderStatus, verificationPending, refundPending, verificationDeadline`. Không trả request snapshot, credential, chữ ký hoặc raw gateway response cho khách hàng.

WEB trả 303 về `PAYMENT_WEB_RETURN_URL` cố định với `paymentId`. MOBILE hiển thị trang HTTPS trung gian, nút `glowup://payment/return?paymentId=...` và đường về Web. App luôn gọi status khi nhận link hoặc về foreground; không tin `resultCode` trên link. MoMo dùng deeplink thực do cổng trả, ZaloPay dùng `order_url`, fallback là paymentUrl.

Repository hiện **không có dự án Mobile**. [Handoff cho Văn Kim](./sprint-3-mobile.md) kèm handler tham khảo; chưa tích hợp/biên dịch/nghiệm thu app cold/warm hoặc thiết bị thiếu ví/GlowUp. Custom scheme Expo cần development build.

UI: trong cửa sổ xác minh hiển thị “Đang xác minh thanh toán”. `CANCELLED + COMPLETED` và `refundPending=true`: “Đã nhận tiền; yêu cầu hoàn tiền đang chờ xử lý”. Đầu mối demo Việt Trung, vận hành sau này A06; chưa cam kết SLA hoàn.

## Quy tắc tiền và phục hồi

Không giữ mức tối thiểu 100.000 VND của BR-01 cũ. Amount VND phải nguyên, kiểm tra sau giảm giá/điểm **trước các thay đổi checkout** và trước tạo attempt. MoMo tối thiểu 1.000 VND, VNPay 5.000 VND; có thể cấu hình merchant min cao hơn/max thấp hơn. ZaloPay phải xác nhận min/max trước bật. Trần áp dụng luôn ≤50.000.000 VND. Lỗi `PAYMENT_AMOUNT_OUT_OF_RANGE` giữ code và details min/max.

Online hết hạn tại `order.createdAt + 15 phút`, COD 30 phút. VNPay gửi `vnp_ExpireDate` GMT+7; ZaloPay gửi số giây còn lại (≥300), không đặt lại 900 khi retry. MoMo `captureWallet` chưa có expiry được tài liệu hóa. Còn dưới 300 giây với ZaloPay: dùng URL còn hiệu lực của attempt hiện tại; nếu UNKNOWN/VERIFYING thì kiểm tra status; chưa có attempt/URL thì hủy đơn hiện tại trước khi đặt lại để giải phóng hàng/điểm.

Reference, requestId, request snapshot và trạng thái INITIATING được lưu trước outbound. Tái sử dụng attempt đang hoạt động với platform/state/deadline ban đầu. Chỉ tạo attempt mới khi lượt trước FAILED cuối cùng và còn đủ thời gian. Mã không rõ, MoMo 9000, VNPay 04/07 giữ đối soát; ZaloPay -63 cho phép tiếp tục URL cũ.

Callback được xác thực signature/merchant/reference/amount/type trước lưu. Inbox và `PaymentCharge` lưu timestamp bằng `clock_timestamp()` DB. Event key phân biệt trạng thái và transaction; callback lặp không thay mốc paid. Transaction ID parse lossless và lưu string; hai ID liền nhau >2^53 không bị nhập thành một.

Merchant được đối chiếu với request snapshot ban đầu, kể cả khi cấu hình merchant đã thay đổi. Inbox ZaloPay giữ nguyên envelope và chuỗi `data` đã dùng ký. So sánh deadline diễn ra trực tiếp trong SQL để giữ độ chính xác microsecond của timestamp PostgreSQL.

Worker query ngoài transaction. Chỉ confirm khi có paid evidence của **cùng transaction**, DB nhận trước expiresAt, order còn PENDING và DB clock sau khóa còn trước expiresAt+60 giây. Query paid ghi bền vững trước hạn cũng là evidence. Không có paid signal đúng hạn: hủy ở phút 15. Có paid signal: cửa sổ xác minh cố định 60 giây. Callback lặp không kéo dài cửa sổ.

Đơn đã hủy không được khôi phục. Tiền muộn/thừa tạo Refund PENDING; khóa compensation duy nhất `ONLINE_UNFULFILLED:{gateway}:{transactionId}` dùng chung worker/customer/admin cancellation. Đã xác nhận một charge thì charge khác không xác nhận đơn lần nữa. Admin không được confirm thủ công đơn dùng cổng online; worker chịu trách nhiệm xác minh tiền.

Inbox claim đi qua payment lease: 15 giây, heartbeat 5 giây và claim token; worker cũ không ghi khi token/lease mất hiệu lực. Poll 1 giây, tối đa 50 query ưu tiên và 3 recovery, 8 apply DB đồng thời. Theo dõi INITIATING/UNKNOWN và đơn đã hủy; quá 24 giờ chưa xác định chuyển NEEDS_REVIEW. Callback đến sau đó vẫn được tiếp nhận.

Expiry chạy một task riêng, không chặn lần poll query ưu tiên tiếp theo; các lần ghi expiry cùng chịu limiter 8 tác vụ. Shutdown chờ query/apply/expiry đang chạy. Nếu limiter từ chối create trước khi gửi HTTP, attempt có bằng chứng chưa gửi được đánh dấu FAILED và có thể thử lượt mới; lỗi sau khi đã gửi hoặc timeout giữ UNKNOWN để đối soát.

Sau query, lỗi DB tạm thời (lock/statement timeout, transaction conflict hoặc connection timeout) thử lại phần ghi trong tối đa 25 giây với backoff 50–149 ms, giữ nguyên kết quả cổng. Không gọi lại query chậm chỉ vì tranh chấp DB; fencing và deadline SQL vẫn áp dụng từng lần thử. Shutdown chờ cả claim đang chạy trước khi lấy danh sách task cần drain; Prisma chỉ ngắt kết nối ở `onApplicationShutdown`, sau payment/email worker. Main bật shutdown hooks cho SIGINT/SIGTERM.

## Ngân sách và vận hành

| Thành phần | Mặc định |
| --- | --- |
| Callback ACK | p95 <1 giây, handler budget 2 giây; không query cổng/SMTP trong callback |
| Receipt transaction | maxWait 250 ms, timeout 1.500 ms, lock 250 ms, statement 750 ms |
| Apply transaction | maxWait 1.000 ms, timeout 3.000 ms, lock 500 ms, statement 1.500 ms |
| Pool | tự đặt connection_limit=20 nếu chưa có, hạ cấu hình lớn hơn 20 xuống 20; warm lúc startup; tổng mọi replica phải phù hợp DB quota |
| Outbound | HTTPS, không theo redirect, timeout 30 giây; limiter QPS riêng từng adapter/instance theo merchant xác nhận |
| Email | 2 task, lease 30 giây, tổng thời gian SMTP tối đa 10 giây; retry từ 30 giây tới 1 giờ, message ID ổn định |

MVP chạy **một backend worker instance** để quota QPS trong bộ nhớ áp dụng đúng toàn merchant. Lease DB cho phép khôi phục restart; trước khi tăng replica cần limiter chung hoặc chia quota rõ ràng. SMTP có thể giao trùng nếu provider đã nhận mail nhưng DB commit chưa rõ; message ID ổn định hỗ trợ dedup, không bảo đảm exactly-once delivery bên SMTP.

DB receipt lỗi trả native failure để cổng retry. Commit chưa rõ được giải quyết bằng unique inbox/charge/refund và lần query phục hồi. Theo dõi số inbox chưa xử lý, lease quá hạn, payment NEEDS_REVIEW, manual refunds và email PENDING/attempts. Không xóa attempt/inbox khi hủy đơn.

## Cấu hình và migration

Giữ `.env` hiện có; điền theo [.env.example](../.env.example). Cả ba `*_ENABLED=false` mặc định. Thiếu khóa, quota hoặc HTTPS return/callback URL thì online checkout trả `PAYMENT_GATEWAY_NOT_READY` trước giữ hàng; COD vẫn hoạt động. Không điền quota/hạn mức giả để bật demo.

Runtime cần Node.js ≥20.9 cho Sharp; đã chạy bằng Node.js 22.14.0. `.env` hiện có không bị thay đổi.

Mỗi cổng cần merchant sandbox credential chính thức, URL callback HTTPS public truy cập được từ Internet, hạn mức/quota xác nhận và kênh kiểm tra giao dịch. MoMo production deeplink cần quyền merchant. ZaloPay cần thêm `ZALOPAY_CALLBACK_TIMEOUT_MS >= 2000` đã xác nhận phù hợp budget; khuyến nghị query sau 15 phút không phải timeout callback. MoMo tài liệu IPN yêu cầu response trong 15 giây; backend đặt mục tiêu chặt hơn. SMTP/S3 cần credential thực và kiểm tra gửi/upload.

Migration bổ sung payment attempts, inbox, charges, refund compensation, notification event key và email outbox, không xóa dữ liệu cũ. Đã áp dụng **chỉ trên DB local riêng**. Chưa áp dụng lên Neon chung. Khi môi trường đích sẵn sàng: backup theo quy trình dự án, `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`, rồi start. User access token cũ thiếu sid cần refresh/login lại trước đổi mật khẩu; TTL access mới luôn 15 phút, refresh 7 ngày. Login/refresh tiếp tục JSON; không ép client đọc refresh token từ httpOnly cookie.

## Kiểm chứng local

Regression cuối: **73 suite / 379 test PASS**; load suite tùy chọn bị skip khi chưa bật `RUN_SPRINT3_LOAD`. Build NestJS và `prisma validate` đều PASS. Load local cuối: 50 người dùng, 5 item/đơn, 80/80 callback ACK và 150 lượt status, query giả lập 10/30 giây; ACK p95 **243 ms**, max **262 ms**, 45 đơn confirmed, 5 đơn hủy chủ động + 5 đơn quá hạn chưa trả tiền, 5 refund đúng dự kiến, không có refund sai. Xem [verification.json](./evidence/verification.json).

PowerShell, tại `backend`:

```powershell
# PostgreSQL local biệt lập; không trỏ TEST_DATABASE_URL tới DB dùng chung.
docker run --name glowup-sprint3-test -e POSTGRES_PASSWORD=sprint3_test_only -e POSTGRES_DB=glowup_sprint3_test -p 127.0.0.1:55433:5432 -d postgres:17
$env:DATABASE_URL='postgresql://postgres:sprint3_test_only@localhost:55433/glowup_sprint3_test?connection_limit=20'
npx prisma migrate deploy
$env:TEST_DATABASE_URL=$env:DATABASE_URL
node node_modules/jest/bin/jest.js --runInBand
npm.cmd run build
npx prisma validate
```

Nếu container đã tồn tại, dùng `docker start glowup-sprint3-test`. Các integration suite từ chối host ngoài localhost/127.0.0.1 hoặc DB tên không kết thúc `_test`; không có TEST_DATABASE_URL thì tự skip, vì thế unit pass không thay thế integration acceptance.

Load test riêng dùng DB tên `_load_test`, mô phỏng query 10/30 giây, 50 người dùng và đơn 5 sản phẩm. Kết quả được ghi tại [local-load.json](./evidence/local-load.json), là bằng chứng **local**, không thay thế Neon hoặc sandbox thật:

```powershell
docker exec glowup-sprint3-test psql -U postgres -c 'CREATE DATABASE glowup_sprint3_load_test;'
$env:DATABASE_URL='postgresql://postgres:sprint3_test_only@localhost:55433/glowup_sprint3_load_test?connection_limit=20'
npx prisma migrate deploy
$env:TEST_DATABASE_URL=$env:DATABASE_URL
$env:RUN_SPRINT3_LOAD='true'
npx jest payments.load.integration --runInBand
Remove-Item Env:RUN_SPRINT3_LOAD
```

Readiness bên ngoài chạy từ terminal mới tại `backend` để dùng `.env` thật:

```powershell
# Chỉ đọc kết nối/quyền Neon, không migrate DB hiện có.
node docs/checks/sprint3-neon-readiness.cjs
# Tạo DB Neon tên ngẫu nhiên có ownership marker; migrate/load chỉ trong DB đó,
# kiểm tra marker trước khi xóa. Gateway query vẫn là giả lập 10/30 giây.
node docs/checks/sprint3-neon-load.cjs
# Upload ảnh do script tạo, đọc lại kiểm tra hash/kích thước rồi xóa đúng key đó.
node docs/checks/sprint3-s3-readiness.cjs
```

S3 hiện trả **HTTP 540, “Project paused”**. Upload và cleanup đã bị từ chối; chưa xác nhận object nào được tạo. Hai key kiểm thử cần kiểm tra/xóa sau khi project mở lại được ghi trong [s3-readiness.json](./evidence/s3-readiness.json). Khi storage hoạt động, chạy `node docs/checks/sprint3-s3-readiness.cjs --cleanup-previous` để xóa đúng các key do lần kiểm tra trước ghi lại, rồi chạy spike upload/read lại. SMTP hiện thiếu user/password nên chưa thể chứng minh gửi email thực.

Neon cuối: 41/80 callback ACK, 39 thất bại, p95 phản hồi toàn bộ 795 ms (ACK thành công 773 ms); 15 confirmed, 35 cancelled, 5 refund. Callback fail nhanh không được tính thành thành công chỉ vì p95 thấp. Cancel batch không còn lỗi timeout, DB đóng sau worker; **gate Neon vẫn FAIL** vì connection wait/lock budget dưới tải. Migrations chỉ chạy trên DB kiểm thử tên ngẫu nhiên và DB đó đã được xóa; không sửa bảng dữ liệu Neon hiện có. Cần chạy lại backend gần DB với pool/quota thực, đủ callback bền vững và toàn bộ cohort xác minh trong deadline trước khi bật nghiệm thu.

## Nghiệm thu còn thiếu

| Bằng chứng | Trạng thái |
| --- | --- |
| TDD/unit, PostgreSQL transactions, native callback HTTP, regression/build | Xem [verification.json](./evidence/verification.json); không thay thế external acceptance |
| 50-user local mixed load, query 10/30 giây | Xem JSON bằng chứng local |
| VNPay/MoMo/ZaloPay sandbox thật: create → return → inbox → query → confirm/refund | Chưa có credential; chưa chạy |
| Merchant min/max/quota, ZaloPay HTTP callback timeout | Chưa xác nhận |
| Neon mixed load: callback/status/expiry/cancel nhiều item, latency/p95 và số refund sai | Đã chạy trên DB biệt lập; **chưa đạt**. Xem [metrics](./evidence/neon-load.json) và [migration/cleanup](./evidence/neon-load-run.json). Backend ở máy phát triển, cần đo lại khi chạy gần DB |
| Web thực và Mobile development build: cold/warm, foreground, thiếu ví/GlowUp | Chưa có dự án/build trong workspace |
| S3 upload/read/cleanup thực | FAIL: provider project PAUSED, HTTP 540; cần mở lại project |
| SMTP gửi/retry thực | Chưa có SMTP_USER/SMTP_PASS; outbox retry đã kiểm thử local |

Checklist demo từng gateway: order ≤50 triệu và ≥merchant min; lưu payment/merchant reference đã che dữ liệu cá nhân, thời điểm create/expiry/inbox/query/order transition và HTTP ACK; thử browser return trước callback không confirm; chữ ký sai/amount sai không lưu; duplicate không đổi anchor/refund; canceled order nhận tiền sinh đúng một refund; lưu screenshot và log đã loại secret. Chỉ đánh dấu Sprint 3 đạt khi cả ba gateway và các readiness/load/Mobile gate có bằng chứng.

## Decision log

- D01: bỏ mốc nghiệp vụ 100.000 VND, giữ giới hạn riêng từng cổng và trần MVP 50 triệu.
- D02: browser return chỉ điều hướng; query worker là nơi xác minh tiền; native ACK sau durable receipt.
- D03: paid anchor theo charge, DB clock và strict `<`; 60 giây là thời gian xác minh, không gia hạn thanh toán.
- D04: payment lease + token fencing; query/SMTP ngoài transaction; bù tiền bằng compensation key dùng chung.
- D05: sid ổn định qua refresh CAS; đổi mật khẩu giữ phiên hiện tại, invalidate reset tokens và revoke phiên khác; cập nhật từng field.
- D06: Mobile HTTPS bridge trong Sprint 3; custom scheme handler bàn giao Văn Kim; universal link/FCM sprint sau.
- D07: gateway mặc định tắt khi thiếu readiness; chưa có credential không chặn việc triển khai local nhưng chặn nghiệm thu sandbox.
- D08: kiểm thử bắt và sửa race callback đến trước create response; cart clear ngoài transaction; checkout cạnh tranh dùng trùng điểm/coupon; admin confirm tiền online chưa xác minh.
- D09: giữ native PostgreSQL timestamp khi xét deadline; giữ nguyên ZaloPay envelope/data và đối chiếu merchant gốc; payload/status khách hàng không lộ secret hoặc URL đã hết hạn.
- D10: kiểm tra tải Neon phát hiện customer cancel ghi tồn kho từng dòng và Prisma đóng kết nối trước worker; chuyển cancellation sang batch và ngắt DB sau worker drain. Test shutdown đã RED rồi GREEN.
- D11: lỗi DB sau query không được kéo theo một query cổng 10/30 giây nữa; retry ghi với kết quả đã xác thực, cùng limiter/fencing/deadline. Fault test đã RED rồi GREEN.
- D12: external readiness phản ánh thực tế: không có credential ba sandbox; S3 project paused; SMTP thiếu auth; Neon từ máy phát triển chưa qua mixed-load gate. Không đổi ngân sách hoặc hạ tiêu chí để đánh dấu nghiệm thu.
- D13: regression chạy trực tiếp Jest với `--runInBand`; build chạy sau regression để tránh thiếu RAM. Một lượt build/test song song đã bị dừng do thiếu bộ nhớ, không dùng làm bằng chứng pass.
- D14: test shutdown trong lúc claim còn chờ đã RED rồi GREEN; worker chờ poll hoàn tất trước drain, tránh công việc mới nhận chạy sau khi DB đã đóng.

## Tài liệu giao thức

- [VNPay payment/IPN](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [query](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html), [FAQ](https://sandbox.vnpayment.vn/apis/docs/faqs/).
- [MoMo captureWallet](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/), [query](https://developers.momo.vn/v3/vi/docs/payment/api/payment-api/query/), [IPN](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/), [result codes](https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/resultcode/).
- [ZaloPay create](https://docs.zalopay.vn/vi/docs/specs/order-create/), [query](https://docs.zalopay.vn/vi/docs/specs/order-query/), [callback](https://docs.zalopay.vn/vi/docs/specs/callback-api/), [status codes](https://docs.zalopay.vn/vi/docs/developer-tools/knowledge-base/status-codes/).
- [lossless-json](https://github.com/josdejong/lossless-json), [Expo linking](https://docs.expo.dev/linking/into-your-app/).
