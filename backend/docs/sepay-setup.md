# SePay chuyển khoản VietQR

Kịch bản trình bày từng bước: [Demo SePay trên GlowUp](sepay-demo.md). Đơn SePay mới đi qua `PENDING_PAYMENT` → thanh toán được xác minh → `PENDING` → nhân viên xác nhận → `CONFIRMED`.

## Kế hoạch chuyển đổi

1. Dùng SePay Bank API v2 + webhook HMAC-SHA256, giữ inbox, worker đối soát, khóa đơn và cơ chế hoàn tiền hiện có.
2. Chuyển checkout tài khoản và guest từ VNPay sang `SEPAY`. Hiển thị thông tin chuyển khoản, QR và trạng thái trên `/payment/return?paymentId=...`.
3. Kiểm thử chữ ký, chống trùng, đối chiếu giao dịch và hết hạn; cập nhật OpenAPI, cấu hình và hướng dẫn nghiệm thu.
4. Cấu hình tài khoản SePay Test mode, chạy mô phỏng end-to-end; sau nghiệm thu mới dùng token/tài khoản Live.

Các bước 1–3 đã có mã nguồn. Bước 4 cần tài khoản và thông tin SePay thực của người vận hành. Không đổi phương thức hoặc trạng thái các đơn VNPay cũ. VNPay adapter và callback vẫn tồn tại để tra soát lịch sử; checkout mới chỉ nhận COD/SEPAY. Bản sửa luồng chờ thanh toán cần chạy `npx prisma migrate deploy` để cập nhật trigger và chuyển các đơn SePay chưa thanh toán sang `PENDING_PAYMENT`; đơn lịch sử đã thanh toán giữ nguyên.

Đây là tích hợp chuyển khoản ngân hàng, không phải sản phẩm hosted checkout/thẻ quốc tế của SePay. Bank API dùng HTTPS REST trực tiếp theo tài liệu chính thức, không cần SDK cổng thanh toán.

## Cấu hình backend

Điền trong `backend/.env` (không commit token/secret):

```dotenv
SEPAY_ENABLED=true
SEPAY_MODE=sandbox
SEPAY_API_TOKEN=<token API Access trong Test mode>
SEPAY_WEBHOOK_SECRET=<secret HMAC đã lưu ở webhook>
SEPAY_BANK_ACCOUNT_ID=<UUID tài khoản từ API v2 /bank-accounts>
SEPAY_BANK_CODE=ACB
SEPAY_ACCOUNT_NUMBER=<số tài khoản nhận, giữ số 0 đầu>
SEPAY_ACCOUNT_NAME=<tên chủ tài khoản không dấu>
SEPAY_MIN_AMOUNT=1
SEPAY_MAX_AMOUNT=50000000
SEPAY_MAX_QPS=3
PAYMENT_WORKER_ENABLED=true
PAYMENT_PUBLIC_BASE_URL=https://<backend-public-host>/api/v1
PAYMENT_WEB_RETURN_URL=https://<frontend-host>/payment/return
VNPAY_ENABLED=false
```

`SEPAY_BANK_ACCOUNT_ID` là UUID của **API v2**, không phải ID số của webhook hay v1. Lấy bằng `GET https://userapi-sandbox.sepay.vn/v2/bank-accounts`, header `Authorization: Bearer <SEPAY_API_TOKEN>`. UUID phải ứng với đúng số tài khoản và ngân hàng đã chọn. Ngân hàng QR nhận mã như `ACB`, `VCB`, `BIDV` hoặc BIN.

Khởi động lại backend sau khi đổi `.env`. `GET /api/v1/payments/methods` trả `{COD:true, SEPAY:true}` trong trường `data` khi cấu hình đầy đủ. Thiếu cấu hình, worker bị tắt hoặc quota không hợp lệ sẽ làm SePay không khả dụng tại checkout. Không ghi secret vào frontend hoặc gửi secret trong chat.

Hai môi trường cách ly:

| Chế độ | API | Cách thử |
| --- | --- | --- |
| `sandbox` | `https://userapi-sandbox.sepay.vn/v2` | Token/tài khoản Test mode, mô phỏng trên dashboard |
| `live` | `https://userapi.sepay.vn/v2` | Token/tài khoản Live, chuyển khoản thật |

Backend từ chối sandbox khi `NODE_ENV=production`. UI sandbox hiển thị QR thử nghiệm và thông tin mô phỏng, có cảnh báo không chuyển tiền thật và liên kết dashboard SePay. Dùng chức năng mô phỏng giao dịch Test mode; tài khoản giả lập không dùng để chuyển tiền bằng ứng dụng ngân hàng. Chạy kiểm thử sandbox ở môi trường development/test. Đổi mode/tài khoản khi không còn lượt thanh toán cũ đang chờ: cấu hình tài khoản trong request snapshot được đối chiếu lại khi xử lý, không tự chuyển đơn cũ sang tài khoản mới.

## Bật nhận tiền thật bằng VietQR trên website

Luồng hiện tại hiển thị VietQR trực tiếp trên website; không chuyển khách sang hosted checkout. QR được tạo từ thông tin của từng payment, còn kết quả thanh toán được xác nhận qua webhook và API phía backend.

1. Trong **SePay Live**, liên kết tài khoản ngân hàng nhận tiền. Tạo API Access token Live và lấy UUID tài khoản qua `GET https://userapi.sepay.vn/v2/bank-accounts`.
2. Cập nhật `.env`: `SEPAY_MODE=live`, token Live, UUID tài khoản Live, ngân hàng, số tài khoản và tên chủ tài khoản tương ứng. Giữ token/secret ở backend.
3. Tạo webhook **Live** theo mục bên dưới, dùng cùng endpoint công khai và HMAC secret Live. Webhook Test mode không thay thế webhook Live.
4. Đợi các payment sandbox đang chờ kết thúc trước khi đổi cấu hình. Khởi động lại backend, tạo đơn mới để nhận hướng dẫn Live. Payment cũ giữ snapshot sandbox, không tự đổi sang QR Live.
5. Kiểm tra một giao dịch Live với số tiền nhỏ: QR đúng người nhận, số tiền và mã chuyển khoản; webhook trả 200; payment `COMPLETED`, order `PENDING`; giao diện ẩn QR sau đối soát. Nhân viên xác nhận thì order mới `CONFIRMED`. Chỉ đánh dấu nghiệm thu Live sau bước này.

Không chỉ đổi `SEPAY_MODE` rồi giữ token/tài khoản sandbox: hai môi trường có dữ liệu và thông tin xác thực riêng. QR sandbox được ghi rõ là thử nghiệm, dùng tài khoản Test mode.

## Tạo webhook trong SePay

Trong Test mode → Webhooks:

1. Chọn giao dịch **tiền vào**, tài khoản đã cấu hình ở trên.
2. URL: `https://<backend-public-host>/api/v1/payments/sepay/webhook` (POST JSON).
3. Bảo mật: **HMAC-SHA256**; lưu cùng secret vào `SEPAY_WEBHOOK_SECRET`. API Key/Bearer không được endpoint này chấp nhận.
4. Có thể để tắt bộ lọc “bỏ qua nếu không có mã thanh toán”: backend đọc mã từ `code` hoặc nội dung chuyển khoản. Nếu bật lọc thì cấu hình tiền tố `GU` và phần sau gồm 32 ký tự hex. Luôn giữ nguyên toàn bộ mã backend cấp.

Header cần có `X-SePay-Timestamp` (Unix giây) và `X-SePay-Signature: sha256=<hex>`. Chữ ký là HMAC-SHA256 của `timestamp.raw_body`; server kiểm tra timestamp lệch tối đa 300 giây và so sánh constant-time. Nest đã bật `rawBody: true`.

HTTP 200 `{ "success": true }` chỉ được trả sau khi inbox và bằng chứng giao dịch được lưu thành công. Webhook hợp lệ gửi lặp cũng trả 200. Chữ ký sai/hết hạn trả 401; tài khoản, mã, chiều chuyển tiền hoặc số tiền không hợp lệ trả 400; mã không thuộc payment trả 404; lỗi lưu trữ trả 503 để SePay gửi lại. Webhook không tự xác nhận đơn.

## Luồng và quy tắc

- Tạo payment không gửi yêu cầu thu tiền: tạo mã `GU` + UUID không dấu gạch ngang, cố định số tiền từ đơn và lưu hướng dẫn QR để có thể khôi phục sau lỗi. Frontend mở trang nội bộ bằng `paymentId`.
- QR Live tạo tại `https://vietqr.app/img` với tài khoản, ngân hàng, số tiền và nội dung chính xác. Không chấp nhận URL ảnh tùy ý từ payload. Số tiền/mã phía client không được dùng để xác nhận đơn.
- Worker gọi API v2 `/transactions` bằng token server, tìm theo mã và UUID tài khoản, kiểm tra lại tài khoản nhận, tiền vào, mã, số tiền; khi có webhook thì đối chiếu cả mã tham chiếu ngân hàng.
- Dùng `referenceCode` của webhook / `reference_number` của API làm định danh charge: ID webhook là số, còn ID API v2 là UUID nên không dùng hai ID đó thay thế nhau.
- Đơn giữ hàng 15 phút; bằng chứng tiền về trước hạn có tối đa 60 giây để đối soát. Trạng thái lấy từ database, không dựa vào nút “đã chuyển” hay query string. QR bị ẩn khi hết hạn, đơn hủy hoặc đã hoàn tất.
- Thanh toán tới đơn đã hủy/hết hạn và các charge đã xác minh nhưng không dùng để thực hiện đơn tạo yêu cầu hoàn tiền thủ công. Không tự phục hồi đơn hủy và không gọi API hoàn tiền tự động.
- Giao dịch sai số tiền, sai/thiếu mã hoặc thiếu mã tham chiếu cần người vận hành tra soát. Không cộng dồn chuyển thiếu, không tự giao hàng khi chuyển thừa. Khi nhiều giao dịch trùng mã mà chưa có webhook phân biệt, hoặc kết quả API còn phân trang, worker từ chối chọn tùy ý và tiếp tục tra soát; sau cửa sổ recovery 24 giờ chuyển `NEEDS_REVIEW`.
- API timeout, 429 hoặc dữ liệu lỗi không biến thành thanh toán thành công/thất bại giả. Worker thử lại. Transport tôn trọng `Retry-After` và quota tối đa 3 request/giây trong một process; nhiều replica chung IP cần limiter dùng chung trước khi chạy tải lớn.
- VNPay cũ vẫn được đối soát dù đã tắt tạo thanh toán mới. Nếu QueryDR trả lỗi không có chữ ký sau khi hết hạn thanh toán và 60 giây gia hạn, worker lùi lần thử tiếp theo 5 phút thay vì 15 giây. Trong thời gian xác nhận đơn vẫn giữ retry nhanh; hết cửa sổ recovery thì dừng và chuyển sang tra soát thủ công.

## Nghiệm thu

1. `GET /api/v1/health/ready` phải 200; kiểm tra `/payments/methods` đã có SePay.
2. Guest và tài khoản: đặt đơn mới bằng SePay, kiểm tra số tiền, tài khoản, mã và hạn trên trang thanh toán.
3. Test mode → mô phỏng **tiền vào** đúng tài khoản, số tiền và mã; chờ webhook 200 và API thấy giao dịch. Chỉ sau đối soát payment mới `COMPLETED`, order chuyển từ `PENDING_PAYMENT` sang `PENDING`. Nhân viên xác nhận đơn sau đó mới chuyển `CONFIRMED`.
4. Gửi lại cùng webhook: không sinh thêm charge, không giao hàng hai lần.
5. Thử chữ ký sai, outgoing, sai tài khoản, mã lạ, sai số tiền, API lỗi: không xác nhận đơn.
6. Hủy/hết hạn đơn rồi mô phỏng chuyển tiền đúng: đơn vẫn hủy và có refund `PENDING` sau đối soát.
7. Tải lại trang bằng cùng trình duyệt: khôi phục được thông tin, guest không đọc được payment thuộc phiên khác.

Kiểm tra mã nguồn (gọi CLI trực tiếp để tránh PowerShell/npm nuốt tham số):

```powershell
# backend
node node_modules/jest/bin/jest.js --runInBand --testPathPattern payments
npm run build
# frontend
node node_modules/vitest/vitest.mjs run tests/unit/checkout.test.ts
npm run typecheck
```

Bộ integration PostgreSQL chỉ chạy khi `TEST_DATABASE_URL` trỏ tới database local riêng có tên kết thúc `_test` và đã áp dụng migration. Không dùng database Neon đang phục vụ ứng dụng để chạy fixture.

## Kết quả kiểm tra trong workspace (2026-11-01)

- Backend: build và TypeScript qua; 63 test payment qua. 29 test integration PostgreSQL được skip vì chưa có `TEST_DATABASE_URL` riêng; Docker Desktop engine hiện không chạy.
- Frontend: production build, TypeScript, ESLint phần checkout và kiểm tra OpenAPI qua. 49 unit test qua, 14 test có điều kiện được skip.
- Backend thực đã trả readiness 200. Kiểm tra trình duyệt mobile với **API trạng thái giả lập** qua các ca sandbox, Live, hết hạn và thành công; không thực hiện chuyển tiền trong lượt kiểm tra này.
- Lượt triển khai ban đầu chưa có thông tin SePay. Lượt kiểm tra cấu hình sau khi bổ sung thông tin được ghi bên dưới.

### Lịch sử kiểm tra trước khi tách trạng thái chờ thanh toán (2026-11-01, GMT+7)

Các trạng thái và cách ẩn QR ghi trong hai mục lịch sử bên dưới phản ánh phiên bản cũ. Luồng hiện hành dùng `PENDING_PAYMENT` → `PENDING` → nhân viên xác nhận `CONFIRMED` theo [hướng dẫn demo](sepay-demo.md).

- `SEPAY_MODE=sandbox`, SePay và worker đã bật. Backend readiness 200; cả backend và BFF trả `SEPAY:true`.
- Token gọi API sandbox `/v2/bank-accounts` và `/v2/transactions` đều HTTP 200. UUID tài khoản tồn tại, số tài khoản khớp `.env`, ngân hàng ACB, tài khoản hoạt động.
- HMAC trên webhook SePay đã gửi khớp secret local. Các lượt mô phỏng cũ trả 400 do nội dung không chứa mã đơn. Kiểm tra riêng endpoint công khai: thiếu chữ ký trả 401, chữ ký hợp lệ với mã payment không tồn tại trả 404; không tạo charge từ các kiểm tra âm tính này.
- Qua website/BFF thật: guest tạo đơn `ORD202611010028`, tạo payment `PAYABLE`, tải lại trạng thái và hiển thị đúng thông tin sandbox trên mobile, không tràn ngang và không hiện QR chuyển tiền thật.
- Tài khoản demo tạo đơn `ORD202611010029` và payment SePay thành công. Gửi lại cùng yêu cầu trả cùng order/payment; tài khoản khác không đọc được payment guest (404). Đơn `ORD202611010029` đã được hủy qua API ứng dụng sau kiểm thử.
- Sửa test availability để độc lập với `SEPAY_ENABLED` trong `.env`; 64 test payment backend qua, 29 test PostgreSQL cô lập vẫn skip. Frontend 49 test qua, 14 test có điều kiện skip; ESLint phần liên quan qua. Footer và bảng capability đã đổi từ VNPay sang SePay.
- Dev cache Next.js cũ gây Fast Refresh tải lại trang liên tục trong lượt đầu; đã lưu bản cache cũ dưới `.next-build/sepay-dev-cache-backup-20261101` và khởi động lại frontend bằng cache mới.
- **Nghiệm thu sandbox end-to-end thành công** cho đơn guest `ORD202611010028`: người dùng mô phỏng tiền vào 59.000 VND; SePay gửi webhook lúc 19:30:24, endpoint trả HTTP 200 / `success:true`. Mã giao dịch ngân hàng `SBB8143516A4A8` khớp API v2 và đúng tài khoản nhận; API báo `webhook_success=1`.
- Inbox ghi nhận lúc 19:30:25.534; worker đối soát xong lúc 19:30:27.816, trước hạn đơn 19:37:57.790. Database có payment `COMPLETED`, order `CONFIRMED`, `verificationPending=false`, đúng một charge đã xác minh và `fulfilled=true`, không có refund, không còn lịch query.
- Gửi lại nguyên payload đã nhận với timestamp/chữ ký HMAC mới tạo local để kiểm tra idempotency: HTTP 200; vẫn một inbox, một charge, không sinh refund và không đổi kết quả đơn. Đây là kiểm thử gửi lặp tại local, không phải một giao dịch mô phỏng thứ hai trên SePay.
- Kiểm tra trình duyệt với phiên guest gốc sau thanh toán: trang payment hiển thị “Thanh toán thành công!”, trang đơn hiển thị “Đặt hàng thành công!”, QR/hướng dẫn chuyển khoản bị ẩn và không còn nút thanh toán lại.
- Các kết quả trên xác nhận sandbox, chưa phải nghiệm thu chuyển tiền Live. Khi triển khai Live cần token, tài khoản và webhook Live riêng theo phần cấu hình.

### Kiểm tra giao diện VietQR sau điều chỉnh (2026-11-01, GMT+7)

- Trang thanh toán dùng bố cục hai cột trên desktop, một cột trên mobile; có nút sao chép số tài khoản, số tiền và nội dung, đồng hồ đếm ngược, thông báo thử nghiệm và xử lý lỗi tải QR.
- Chỉ hiển thị hướng dẫn chuyển khoản khi payment `PAYABLE`, đơn `PENDING` và không có `verificationPending`. Khi lỗi tra cứu tạm thời, trang tiếp tục polling để khôi phục trạng thái.
- Backend thực: readiness HTTP 200; API sandbox `/v2/bank-accounts` HTTP 200 và khớp UUID/số tài khoản cấu hình. Không chuyển tiền hoặc tạo giao dịch trong lượt kiểm tra này.
- 16 test adapter/webhook backend, 6 unit test checkout frontend, TypeScript và ESLint phần thay đổi qua. 10 kiểm tra trình duyệt qua trên desktop/mobile với API trạng thái và ảnh QR giả lập: chi tiết QR, sao chép, không tràn ngang, sandbox, hết hạn, lỗi kết nối rồi phục hồi và chờ xác minh. Đây là kiểm tra UI, không phải nghiệm thu chuyển tiền Live.

### Kiểm tra sau khi sửa luồng demo (2026-11-01, GMT+7)

- Đã áp dụng migration `20261102000000_sepay_pending_payment` trên database ứng dụng. Đơn SePay mới bắt đầu ở `PENDING_PAYMENT`; đối soát tiền thành công chuyển `PENDING`, nhân viên xác nhận mới chuyển `CONFIRMED`. Đơn lịch sử đã thanh toán không bị chuyển ngược trạng thái.
- 117 bài kiểm tra backend qua, gồm 24 bài transaction trên PostgreSQL local riêng: QR sau empty polling, tiếp tục cùng payment/hạn, chống trùng, xác nhận bởi shop sau thanh toán, không tự hủy đơn đã trả tiền, hủy/hết hạn/tiền về muộn và chống hoàn tiền trùng. Một bài có điều kiện khác được skip.
- 10 unit test checkout/địa chỉ và 10 kiểm tra trình duyệt desktop/mobile qua. Frontend production build, TypeScript, ESLint phần liên quan và OpenAPI contract check qua.
- Script `node scripts/accept-sepay-flow.mjs` trong frontend qua 11 kiểm tra với BFF/backend thật và SePay sandbox đang cấu hình: tạo đơn riêng, tải ảnh QR thật, tiếp tục từ chi tiết đơn giữ payment/hạn, worker polling không làm mất QR, hủy đóng QR và giữ nguyên giỏ hàng. Hai đơn QA của lượt kiểm tra đã được hủy qua API; không mô phỏng nhận tiền hay sửa trạng thái thanh toán trực tiếp.
- Backend readiness và readiness qua URL webhook công khai trả HTTP 200. Lượt kiểm tra phiên bản này chưa thao tác mô phỏng tiền vào trên dashboard SePay; thực hiện bước đó theo [kịch bản demo](sepay-demo.md) để nghiệm thu lại toàn bộ luồng bên nhà cung cấp. Kết quả sandbox cũ ở mục lịch sử không thay thế bước này.

## Tài liệu chính thức

- [API v2: bắt đầu nhanh](https://developer.sepay.vn/vi/sepay-api/v2/bat-dau-nhanh)
- [API danh sách giao dịch và bộ lọc](https://developer.sepay.vn/vi/sepay-api/v2/giao-dich/danh-sach)
- [Webhook HMAC-SHA256](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc)
- [API Access trong Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/api-access)
- [VietQR và tham số ảnh](https://docs.sepay.vn/tao-qr-code-vietqr-dong.html)
