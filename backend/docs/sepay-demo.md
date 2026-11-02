# Demo thanh toán SePay trên GlowUp

## Chuẩn bị trước buổi demo

- Chạy backend và frontend; `GET http://localhost:3000/api/v1/health/ready` phải trả 200, `/api/v1/payments/methods` có `SEPAY: true`.
- Backend dùng `SEPAY_MODE=sandbox`, token/tài khoản **Test mode**, `PAYMENT_WORKER_ENABLED=true`. Áp dụng migration bằng `npx prisma migrate deploy` trong thư mục backend trước khi chạy phiên bản này.
- Mở dashboard SePay, bật **Test mode**. Kiểm tra tài khoản nhận khớp thông tin trên website và webhook tiền vào đúng URL HTTPS công khai `/api/v1/payments/sepay/webhook`, bảo mật HMAC-SHA256.
- Nếu dùng ngrok, giữ tunnel chạy trong suốt buổi demo. Khi URL đổi, cập nhật webhook trên SePay và cấu hình backend; `npm run payment:tunnel` hỗ trợ khởi động tunnel/cập nhật URL local. Xem [cấu hình chi tiết](sepay-setup.md).
- Đăng nhập sẵn tài khoản khách và tài khoản nhân viên có quyền xác nhận đơn ở hai cửa sổ riêng. Chuẩn bị sản phẩm còn tồn kho. Tạo đơn mới ngay lúc trình bày để còn đủ hạn 15 phút.

## Kịch bản chính, khoảng 3–5 phút

1. Khách chọn sản phẩm, vào checkout, chọn địa chỉ và **SePay**, bấm đặt hàng. Website tạo đơn **Chờ thanh toán (`PENDING_PAYMENT`)** và mở trang QR có người nhận, số tiền, nội dung `GU…`, thời gian còn lại. QR sandbox được ghi rõ là thử nghiệm; không dùng ứng dụng ngân hàng để chuyển tiền thật.
2. Bấm **Xem đơn hàng**, sau đó **Tiếp tục thanh toán SePay**. Với tài khoản, có thể vào **Tài khoản → Đơn hàng → chi tiết đơn** để mở lại. QR/nội dung/số tiền và hạn phải giữ nguyên, không tạo đơn thứ hai. Khách vãng lai mở lại liên kết đơn trong cùng trình duyệt đã đặt hàng.
3. Trên dashboard **SePay Test mode → Mô phỏng giao dịch**, chọn **tiền vào**, đúng tài khoản nhận. Sao chép **đúng số tiền** và **toàn bộ nội dung chuyển khoản** từ website rồi tạo giao dịch mô phỏng. Đây là bước đóng vai khách chuyển khoản; không chỉnh trạng thái trong database và không gọi nút/API giả lập “đã thanh toán” của website.
4. Quay về trang thanh toán, đợi webhook và worker đối soát API. Trang tự chuyển **Thanh toán thành công**, ẩn QR; payment là `COMPLETED`, đơn là **Chờ xác nhận (`PENDING`)**. Có thể bấm **Tra cứu lại** để đọc trạng thái mới nhất; nút này không tự đánh dấu đã trả tiền. Lúc đã có bằng chứng nhưng đang đối soát, trang tạm ẩn QR để tránh chuyển khoản thêm.
5. Nhân viên mở đúng đơn, kiểm tra thông tin rồi **Xác nhận đơn**. Lúc này đơn mới là **Đã xác nhận (`CONFIRMED`)**, tiếp tục chuẩn bị/giao hàng theo quy trình có sẵn. Nhân viên không thể xác nhận đơn SePay chưa được xác minh thanh toán.

Luồng trạng thái:

```text
Đặt hàng → PENDING_PAYMENT → nhận tiền và đối soát → PENDING → shop xác nhận → CONFIRMED
                   └→ khách/shop hủy hoặc hết hạn chưa trả → CANCELLED
```

## Các tình huống phụ nên trình bày

| Tình huống | Thao tác | Kết quả đúng |
| --- | --- | --- |
| Khách rời trang | Về chi tiết đơn rồi tiếp tục thanh toán | Cùng payment, cùng hạn; đóng trang không hủy đơn |
| Khách hủy khi chưa trả | Bấm hủy đơn trong tài khoản | Đơn `CANCELLED`, QR không còn dùng được, hoàn giữ hàng/ưu đãi/xu |
| Không trả tiền | Để đơn mới hết 15 phút, chờ worker quét hết hạn | Đơn hủy, không còn QR; không cần đợi trường hợp này trong kịch bản chính |
| API/mạng tạm lỗi | Mất mạng lúc tra cứu rồi kết nối lại | Giữ trạng thái chờ, thử lại; không coi lỗi mạng là thanh toán thất bại |
| Webhook gửi lặp | Gửi lại webhook của cùng giao dịch trong SePay | Chỉ một charge và một lần ghi nhận thanh toán |
| Tiền về sau khi hủy/hết hạn | Mô phỏng tiền vào đúng mã của đơn đã hủy | Đơn vẫn hủy; sau đối soát tạo yêu cầu hoàn tiền để nhân viên xử lý |

Chuyển khoản VietQR không có bước ngân hàng báo “khách đóng trang = thất bại”. Nếu chưa có tiền, trạng thái vẫn chờ cho tới khi hủy/hết hạn. Sai số tiền/mã không được tự coi là thành công; cần tra soát. Không mô phỏng thành công cho đơn đã hủy nếu mục tiêu là trình bày kịch bản chính.

## Nếu chưa thấy thành công

1. Kiểm tra giao dịch nằm trong **Test mode**, đúng tài khoản, chiều tiền vào, số tiền và nội dung `GU…`.
2. Kiểm tra lịch sử webhook SePay: URL còn truy cập được, trả HTTP 200, HMAC secret khớp. HTTP 200 chỉ xác nhận đã nhận webhook, chưa phải hoàn tất đối soát.
3. Kiểm tra worker đang bật và API v2 sandbox thấy giao dịch. Nếu API chưa thấy tiền hoặc lỗi, đơn tiếp tục chờ; không sửa payment bằng tay.
4. Nếu đã hết hạn, tạo đơn mới cho kịch bản chính. Chuyển khoản vào mã cũ sẽ đi theo luồng tra soát/hoàn tiền.

Tài liệu chính thức: [Test mode](https://developer.sepay.vn/vi/tien-ich-khac/test-mode), [mô phỏng giao dịch](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/mo-phong-giao-dich), [VietQR thử nghiệm](https://developer.sepay.vn/vi/tien-ich-khac/test-mode/mo-phong-tao-ma-vietqr).
