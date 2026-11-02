# Thiết lập thanh toán VNPay sandbox

VNPay đã được nối với checkout cho khách đăng nhập và khách vãng lai. Backend ký URL bằng HMAC-SHA512, số tiền lấy từ đơn hàng và quy đổi VND × 100. IPN có kiểm tra chữ ký, merchant, mã giao dịch và số tiền; thông báo lặp được ghi nhận idempotent. Worker truy vấn VNPay để xác minh trước khi xác nhận đơn hàng. Browser return chỉ điều hướng về website.

## 1. Lấy tài khoản và khóa sandbox

1. Mở [đăng ký merchant sandbox](https://sandbox.vnpayment.vn/devreg), nhập tên website, URL website, email và mật khẩu, rồi hoàn tất mã xác nhận.
2. Kiểm tra email đăng ký, gồm cả thư rác. Theo [tài liệu VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), thông tin kết nối được gửi qua email.
3. Lấy hai giá trị sau từ thông tin merchant:

   | VNPay cung cấp | Biến trong `backend/.env` |
   | --- | --- |
   | `vnp_TmnCode` / Terminal ID / mã website | `VNPAY_TMN_CODE` |
   | `vnp_HashSecret` / Secret Key | `VNPAY_HASH_SECRET` |

Mật khẩu đăng nhập merchant **không phải** HashSecret. Không đưa HashSecret vào frontend, biến `NEXT_PUBLIC_*`, Git hoặc ảnh chụp màn hình. Nếu cần hỗ trợ cấu hình, chỉ chia sẻ tên biến còn thiếu; điền giá trị bí mật trực tiếp vào `.env` trên máy.

## 2. Cho VNPay gọi được backend qua HTTPS

IPN cần địa chỉ HTTPS công khai với chứng chỉ hợp lệ. `localhost:3000` không thể nhận cuộc gọi từ máy chủ VNPay.

Nếu chưa có API staging, có thể dùng [ngrok](https://ngrok.com/docs/start). CLI đã được cài trên máy hiện tại. Chỉ cần liên kết tài khoản một lần: đăng nhập [trang authtoken](https://dashboard.ngrok.com/get-started/your-authtoken), sao chép lệnh `ngrok config add-authtoken ...` từ trang đó và chạy trực tiếp trong terminal cá nhân. Không gửi token qua chat hay ghi vào repository.

Ngrok hiện cấp [dev domain cố định miễn phí theo tài khoản](https://ngrok.com/blog/free-static-domains-ngrok-users). Mở [Gateway → Domains](https://dashboard.ngrok.com/domains), lấy đúng **Dev Domain** được cấp và điền hostname vào `NGROK_DOMAIN` trong `backend/.env`, ví dụ `ten-duoc-cap.ngrok-free.dev`. Khi dùng đúng domain này, có thể yêu cầu lại cùng URL khi khởi động. URL tự sinh từ một lần chạy `ngrok http 3000` có thể là URL tạm, không được phép giữ lại trên gói Free.

Trong terminal riêng, tại thư mục `backend`, chạy:

```powershell
npm run payment:tunnel
```

Helper mở tunnel về cổng 3000 bằng `NGROK_DOMAIN` đã cấu hình, lấy URL HTTPS thực và cập nhật `PAYMENT_PUBLIC_BASE_URL` trong `backend/.env`. Helper giữ nguyên khóa merchant, cấu hình khác và trạng thái bật/tắt VNPay; chưa có khóa thì không tự bật VNPay. Nó in URL đăng ký và IPN để dùng với VNPay. Nếu chưa điền `NGROK_DOMAIN`, helper có thể mở URL tự cấp để thử kết nối nhưng không tự lưu URL đó làm domain cố định. Sau lần cập nhật env đầu tiên, khởi động lại backend để nhận cấu hình mới.

Ví dụ ngrok cấp `https://glowup-api-example.ngrok-free.dev`. Giữ tunnel hoạt động suốt giao dịch; tắt tunnel sẽ mất kết nối nhưng domain cố định vẫn giữ lại trong tài khoản. Các URL bên dưới chỉ là minh họa; dùng URL helper in ra trên máy bạn.

Frontend của dự án hỗ trợ HTTPS local. Trong terminal frontend:

```powershell
cd frontend
npm run dev:https
```

Mở `https://localhost:3001` và tin cậy chứng chỉ phát triển trước khi checkout. Bản demo local dùng cùng máy và cùng trình duyệt từ lúc đặt hàng đến lúc quay về. Khi chia sẻ cho máy khác, dùng URL frontend HTTPS công khai và cấu hình `SITE_URL` đúng origin đó; không dùng `localhost` làm địa chỉ quay về cho người khác.

## 3. Điền `backend/.env`

Giữ nguyên cấu hình database, JWT, Redis và các phần hiện có. Chỉ thêm/sửa nhóm thanh toán; không ghi đè toàn bộ file `.env` bằng `.env.example`.

```dotenv
VNPAY_ENABLED=true
VNPAY_TMN_CODE=DIEN_TMN_CODE_TU_EMAIL
VNPAY_HASH_SECRET=DIEN_HASH_SECRET_TU_EMAIL
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_QUERY_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_MIN_AMOUNT=5000
VNPAY_MAX_AMOUNT=50000000
VNPAY_MAX_QPS=1

PAYMENT_PUBLIC_BASE_URL=https://glowup-api-example.ngrok-free.app/api/v1
PAYMENT_WEB_RETURN_URL=https://localhost:3001/payment/return
PAYMENT_QUERY_IP=127.0.0.1
PAYMENT_WORKER_ENABLED=true
```

`VNPAY_MAX_QPS=1` là giới hạn gọi API ra ngoài trên mỗi process để thử sandbox ít giao dịch; đây không phải hạn mức được VNPay cam kết. Xác nhận quota merchant trước khi tăng hoặc chạy nhiều instance. Hạn mức 5.000–50.000.000 VND là chính sách đang áp dụng trong ứng dụng.

`PAYMENT_PUBLIC_BASE_URL` trỏ tới **backend**, đã gồm `/api/v1`, không thêm `/payments`. `PAYMENT_WEB_RETURN_URL` là trang **frontend** để hiển thị kết quả. `PAYMENT_QUERY_IP` là IP máy chủ thực hiện query; `127.0.0.1` dùng cho thử local, khi triển khai dùng IP phù hợp cấu hình merchant thực tế.

Frontend không cần khóa VNPay. Trong `frontend/.env.local`, BFF vẫn có thể gọi backend local:

```dotenv
BACKEND_API_BASE_URL=http://localhost:3000/api/v1
SITE_URL=https://localhost:3001
```

Giữ nguyên các biến session/Redis hiện có. `npm run dev:https` đã đặt `SITE_URL=https://localhost:3001` cho process đó. Nếu chuyển giữa HTTP và HTTPS, đăng nhập lại hoặc tạo lại giỏ hàng trong origin đang dùng để bảo đảm phiên checkout nhất quán.

## 4. Cấu hình IPN và Return URL với VNPay

Với URL ví dụ ở trên:

| Loại URL | Địa chỉ |
| --- | --- |
| **IPN URL** đăng ký cho terminal với VNPay | `https://glowup-api-example.ngrok-free.app/api/v1/payments/vnpay/ipn` |
| **Return URL** backend gửi trong từng yêu cầu | `https://glowup-api-example.ngrok-free.app/api/v1/payments/vnpay/callback?state=...` |
| Trang hiển thị kết quả | `https://localhost:3001/payment/return?paymentId=...` |

Đăng ký/cập nhật IPN trong cấu hình merchant nếu tài khoản cung cấp chức năng này; nếu không, yêu cầu bộ phận hỗ trợ VNPay cấu hình IPN cho đúng TmnCode. Chỉ đặt env không tự đăng ký IPN với VNPay. Không trỏ IPN vào frontend. Khi hệ thống merchant yêu cầu khai báo Return URL, cung cấp đường dẫn callback backend ở bảng trên; `state` do ứng dụng tạo riêng cho mỗi giao dịch, không điền một state cố định.

Nếu tunnel đổi domain, cập nhật cả `PAYMENT_PUBLIC_BASE_URL` và cấu hình IPN với VNPay, khởi động lại backend rồi tạo giao dịch mới. URL đã ký trong giao dịch cũ vẫn chứa domain cũ.

## 5. Chạy và kiểm tra

Trong `backend`:

```powershell
npm run payment:vnpay:check
npm run start:dev
```

Nếu backend đang chạy, khởi động lại process đó sau khi sửa `.env`. Lệnh check chỉ kiểm tra cấu hình local, không gọi tạo thanh toán và không in khóa bí mật. Nó không chứng minh khóa merchant đúng hoặc IPN đã được cấu hình ở VNPay.

1. `GET http://localhost:3000/api/v1/health/ready` phải trả 200.
2. `GET http://localhost:3000/api/v1/payments/methods` phải có `data.VNPAY=true`. API chỉ công bố khả dụng, không công bố merchant/secret. Nếu cổng tắt, thiếu cấu hình hoặc worker bị tắt, checkout khóa lựa chọn VNPay và vẫn cho dùng COD.
3. Từ `https://localhost:3001`, thêm hàng, mở checkout, nhập địa chỉ, chọn VNPay và bấm tiếp tục. Số tiền phải nằm trong hạn mức trên.
4. Dùng thẻ **sandbox**, theo [trang demo chính thức](https://sandbox.vnpayment.vn/apis/vnpay-demo/):

   | Trường | Giá trị test |
   | --- | --- |
   | Ngân hàng | NCB |
   | Số thẻ | `9704198526191432198` |
   | Tên chủ thẻ | `NGUYEN VAN A` |
   | Ngày phát hành | `07/15` |
   | OTP | `123456` |

5. Sau khi quay về, trang kết quả tra cứu payment qua BFF của phiên checkout. Đợi worker xác minh; đơn phải chuyển từ `PENDING` sang `CONFIRMED`, payment thành `COMPLETED`. Không coi một redirect có `vnp_ResponseCode=00` là bằng chứng đơn đã được thanh toán.
6. Thử hủy trên VNPay; đơn không được xác nhận thành công. Nút **Tra cứu lại** cho phép kiểm tra tiếp nếu kết quả còn chờ.

Đơn online giữ hàng 15 phút; worker chỉ xác nhận khoản thanh toán đủ điều kiện trong thời gian cho phép. Tiền về muộn hoặc thừa cần xử lý hoàn tiền thủ công theo dữ liệu đối soát; trang kết quả hiển thị thông báo tương ứng. Tích hợp này chưa tự gọi API refund VNPay.

## 6. Khi gặp lỗi

| Hiện tượng | Kiểm tra |
| --- | --- |
| Không chọn được VNPay | Chạy lệnh check, xem `data.VNPAY`, kiểm tra `VNPAY_ENABLED`, khóa, QPS, URL HTTPS và worker; restart backend |
| VNPay báo merchant/website không tồn tại | TmnCode sandbox phải khớp terminal được cấp; không dùng bộ khóa production với URL sandbox |
| Sai checksum / mã 97 | HashSecret đúng terminal, không dư khoảng trắng; không sửa URL thanh toán sau khi ký |
| Trở về nhưng còn chờ | IPN công khai có đến backend không, IPN đã đăng ký đúng chưa, worker có chạy và Query API có bị chặn/quá quota không |
| IPN thử bằng tay trả `RspCode=97` | Bình thường nếu không có đầy đủ tham số và chữ ký hợp lệ; kết quả này chỉ chứng minh route nhận được request |
| Query trả mã 91 hoặc 94 | Chưa tìm thấy giao dịch hoặc truy vấn trùng trong thời gian giới hạn; ứng dụng giữ trạng thái chưa xác minh và đối soát lại, không tự đánh dấu đã trả tiền |
| Query trả `99 — Unexpected error` | Đây là mã lỗi tổng quát; không đủ bằng chứng để kết luận thiếu quyền QueryDR. Đối chiếu endpoint, HMAC và `vnp_TransactionDate` với `vnp_CreateDate` đã gửi; nếu vẫn lỗi, yêu cầu VNPay tra soát theo TmnCode, TxnRef và thời gian. Response không có chữ ký không được dùng làm bằng chứng đã thanh toán |
| Mất phiên sau khi quay về | Dùng cùng trình duyệt/origin HTTPS với lúc đặt hàng; kiểm tra Redis và cookie session/guest |
| Trình duyệt dừng ở cảnh báo ngrok | Gói Free có thể hiện trang xác nhận truy cập; bấm `Visit Site` để tiếp tục về website. Đây là trang của ngrok, không phải kết quả thanh toán |

## 7. Production

Đăng ký merchant production với VNPay, lấy bộ khóa và endpoint production do VNPay cấp, cấu hình IPN/Return HTTPS production, IP máy chủ và quota thực. Dùng frontend/backend origin thực; không dùng tunnel/local URL. Không chỉ đổi URL từ sandbox sang production mà giữ nguyên khóa test.

Tài liệu đối chiếu: [Thanh toán PAY 2.1.0](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html), [QueryDR](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html), [FAQ IPN/Return](https://sandbox.vnpayment.vn/apis/docs/faqs/).

## 8. Gỡ chặn khi IPN chưa về và QueryDR trả 99

1. Mở [trang đăng nhập Merchant Sandbox](https://sandbox.vnpayment.vn/merchantv2/Users/Login.htm) bằng tài khoản được VNPay cấp. Tài khoản này khác với TmnCode/HashSecret; không dùng HashSecret làm mật khẩu.
2. Kiểm tra cấu hình website/terminal. Nếu có trường `IPN URL`, điền URL backend in ra từ `npm run payment:vnpay:check`, kết thúc bằng `/api/v1/payments/vnpay/ipn`, rồi lưu cho đúng TmnCode. Không điền trang frontend `/payment/return` vào ô IPN.
3. Nếu tài khoản không có chức năng chỉnh IPN, phản hồi email cấp thông tin merchant để yêu cầu VNPay cấu hình. Không suy đoán tên menu: phần cấu hình sau đăng nhập chưa được kiểm chứng bằng tài khoản của người dùng.
4. Với QueryDR 99, cung cấp TmnCode, mã tham chiếu `vnp_TxnRef`, `vnp_CreateDate` GMT+7, endpoint và response code cho VNPay tra soát. Không gửi HashSecret, mật khẩu hoặc cookie. Mã 99 không xác định riêng lỗi phân quyền.
5. Sau khi VNPay xác nhận cấu hình, giữ backend/tunnel đang chạy và tạo **giao dịch mới**. Kiểm tra IPN trong `http://127.0.0.1:4040`, số bản ghi inbox và trạng thái xác minh của backend. Không dùng lại đơn thử đã hủy.

Lượt kiểm tra bổ sung xác nhận endpoint IPN công khai nhận được request có chữ ký hợp lệ và trả `RspCode=01` cho mã tham chiếu test cố ý không tồn tại. Điều này kiểm tra đường truyền, khóa ký và route; không chứng minh VNPay đã đăng ký/gửi IPN về URL đó. Thời gian giao dịch dùng cho QueryDR đã khớp snapshot đã gửi; thử lại vẫn nhận 99. Mẫu yêu cầu hỗ trợ của máy phát triển được chuẩn bị riêng trong `.tmp/vnpay-support-request.txt`, không commit vào repository và không tự gửi đi.

### Đối chiếu request QueryDR thực tế

Trong `backend`, dùng UUID payment cần kiểm tra, không dùng mã order:

```powershell
npm run payment:vnpay:diagnose -- "UUID_PAYMENT_CAN_KIEM_TRA"
```

Lệnh chỉ hỗ trợ sandbox, đọc payment hiện có và gửi một QueryDR qua đúng adapter/transport của worker; không tạo đơn, không xác nhận hoặc sửa trạng thái thanh toán. Lệnh kiểm tra:

- Khóa hiện tại khớp chữ ký URL thanh toán gốc; TmnCode khớp snapshot.
- `vnp_TransactionDate` bằng `vnp_CreateDate` gốc trong cả snapshot lẫn URL đã gửi, không lấy `vnp_PayDate` từ IPN.
- `vnp_TxnRef` khớp mã gốc; `vnp_RequestId` do adapter tạo mới; `vnp_CreateDate` là giờ QueryDR GMT+7.
- Chữ ký request khớp phép tính HMAC-SHA512 độc lập trên chín giá trị theo thứ tự tài liệu, phân cách `|`.

Báo cáo lưu ở `.tmp/vnpay-query-diagnostic-<paymentId>.json`, gồm RequestId, thời điểm, các phép đối chiếu, HTTP status và các trường phản hồi được cho phép. Không ghi HashSecret, `vnp_SecureHash`, URL có state, cookie, thông tin thẻ hoặc nguyên văn body phản hồi. Có mã thoát 1 nếu kiểm tra/truy vấn không thành công; trường hợp response 99 không có chữ ký vẫn tạo báo cáo để tra soát. Thư mục `.tmp` không đi theo Git.

Lượt kiểm tra trên giao dịch có IPN `PAID`: tất cả phép đối chiếu request đạt, nhưng endpoint VNPay vẫn trả HTTP 200 với `{"vnp_ResponseCode":"99","vnp_Message":"Unexpected error"}` không có chữ ký. Đây là kết quả quan sát từ endpoint, không phải mã 99 do ứng dụng tự tạo. Chưa có bằng chứng quy kết nguyên nhân cụ thể như thiếu quyền merchant.

## Kiểm chứng lần triển khai

### Chẩn đoán bổ sung QueryDR ngày 2026-11-01

Truy vấn lại giao dịch đã nhận IPN `PAID` vẫn trả mã `99`, không có chữ ký. Thử gửi thêm `vnp_TransactionNo` rỗng, `0`, mã thật từ IPN, và thử RequestId chỉ gồm chữ số cũng không giải quyết lỗi. Đồng hồ máy phát triển khớp đồng hồ HTTP của VNPay. Các kiểm tra này chỉ đọc trạng thái, không sửa đơn hàng. Chưa xác định được nguyên nhân nội bộ của VNPay từ phản hồi chung `Unexpected error`.

Adapter hiện phân biệt phản hồi lỗi API không có chữ ký (`VNPAY_QUERY_UNAVAILABLE`) với phản hồi thanh toán sai chữ ký (`PAYMENT_INVALID_SIGNATURE`). Worker ghi `paymentId`, `requestId`, `responseCode` để tra soát, tiếp tục cơ chế retry hiện có và không xác nhận thanh toán từ lỗi API. Chữ ký của phản hồi thành công vẫn bắt buộc được kiểm tra. Đây là cải thiện chẩn đoán, không phải cách khắc phục lỗi 99 phía endpoint.

Đơn sandbox có IPN ở lượt trước đã chuyển sang `CANCELLED` khi kiểm tra lại lúc 17:28 ngày 2026-11-01 (GMT+7), vì đã quá thời hạn thanh toán/xác minh. Không mở lại đơn đã hủy để thử tiếp. Khi QueryDR hoạt động trở lại, cơ chế đối soát hiện có xử lý khoản thanh toán của đơn bị hủy theo luồng chờ hoàn tiền thủ công; không tự khôi phục đơn.

Để VNPay tra soát, gửi nội dung `.tmp/vnpay-support-request.txt` đã cập nhật và báo cáo chẩn đoán. Cần họ kiểm tra log theo RequestId và cấu hình terminal/endpoint; không thể suy ra thiếu quyền hay sai IP chỉ từ mã 99. Sau khi có phản hồi QueryDR hợp lệ, thử một đơn sandbox mới trong thời hạn thanh toán.

- [x] 40 kiểm thử backend: adapter, QueryDR, IPN HTTP, readiness, payment policy và worker.
- [x] 46 kiểm thử frontend đã qua; 14 kiểm thử phụ thuộc môi trường được bỏ qua theo cấu hình suite hiện có.
- [x] Backend kiểm tra TypeScript và Nest build vào thư mục kiểm chứng riêng; frontend lint, TypeScript, OpenAPI contract và inventory đã qua.
- [x] Trình duyệt: BFF khả dụng lấy dữ liệu backend thật; checkout khóa VNPay khi chưa cấu hình và vẫn cho COD. Các trạng thái kết quả được kiểm tra bằng dữ liệu fixture, không tạo đơn thật.
- [x] Ngày 2026-11-01: đã bật VNPay trên máy phát triển, check cấu hình và API khả dụng trả `VNPAY=true`; URL backend công khai trả health/ready 200.
- [x] Đã tạo một đơn demo 299.100 VND, VNPay chấp nhận URL đã ký, mở được chọn ngân hàng NCB, nhập thẻ/OTP test và chuyển về callback. Callback backend kiểm tra state rồi trả redirect 303 về frontend.
- [ ] Xác nhận thanh toán cuối cùng còn chưa đạt: không có bản ghi IPN cho giao dịch thử; QueryDR thực tế trả `99 — Unexpected error` không có chữ ký. Payment còn `PAYABLE`, đơn chưa được backend xác nhận. Cần hoàn tất cấu hình IPN/quyền query của terminal với VNPay rồi chạy giao dịch mới.

Đơn thử ở lượt đầu sau đó đã được hủy qua API và trả trạng thái `CANCELLED` để giải phóng tồn kho. Không dùng lại payment của đơn thử này.

Lượt thử mới sau khi cập nhật cấu hình IPN:

- [x] Tạo một đơn sandbox mới 299.100 VND, thực hiện thẻ NCB/OTP test. VNPay trả `vnp_ResponseCode=00`, `vnp_TransactionStatus=00`; trình duyệt về `/payment/return`.
- [x] Backend nhận và xác thực IPN `PAID`; có bản ghi inbox và `firstPaidReceivedAt`. Chỗ chặn IPN của lượt trước đã được giải quyết.
- [ ] QueryDR vẫn trả `99 — Unexpected error` không có chữ ký, kể cả khi thử bằng mã giao dịch thực từ IPN và IP công khai của máy. Đơn mới còn `PENDING`, payment `PAYABLE` với `verificationPending=true`; chưa thể ghi nhận nghiệm thu xác nhận đơn hoàn chỉnh. Mẫu yêu cầu hỗ trợ đã được cập nhật theo giao dịch mới, tập trung vào lỗi QueryDR.

Các unit/HTTP test tự động dùng khóa fixture. Lượt nghiệm thu sandbox thực tế ở trên dùng thẻ test, không dùng tiền/thẻ thật; chưa đạt xác nhận cuối cùng. Không coi trạng thái enabled hoặc việc qua OTP là bằng chứng toàn bộ tích hợp đã hoạt động.
