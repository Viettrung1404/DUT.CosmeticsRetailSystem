# FE-03 — Giỏ hàng, checkout và thanh toán

Ngày cập nhật: 29/10/2026.

## Đã triển khai

- S14 `/cart`: đọc cùng query với drawer S24, chọn từng dòng, sửa số lượng, xóa, cảnh báo giá đổi/hết hàng/vượt tồn; checkout chỉ dùng dòng đã chọn.
- S37 `/checkout`: chọn hoặc nhập địa chỉ, coupon, điểm, báo giá backend và đặt hàng bằng quoteVersion cùng Idempotency-Key. Báo giá cũ không được dùng khi input thay đổi; lỗi 409 yêu cầu xác nhận lại.
- S32 `/order-success/[id]`: đọc đơn theo UUID và quyền sở hữu qua backend; COD hiển thị chờ thu, VNPAY đọc trạng thái payment. S22 `/payment/return` chỉ đọc status từ backend, có polling giới hạn; không tin query từ VNPAY là kết quả.
- BFF cart/checkout/payment giữ session HttpOnly, validate input và Origin; URL chuyển đến VNPAY bị giới hạn HTTPS và domain VNPAY.
- Backend `CommerceCheckoutService` nhận VNPAY khi gateway đã cấu hình, tạo payment PENDING tương ứng để module payment tạo attempt; COD giữ nguyên.

## Kiểm tra đã chạy

- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run inventory:check`, `npm run contracts:check` — đạt.
- Backend: `npm run build` — đạt.

## Còn cần nghiệm thu

- Chưa chạy sandbox VNPAY thật hoặc E2E có DB, session và merchant callback. Cần HTTPS public callback/IPN, cấu hình `VNPAY_*`, `PAYMENT_PUBLIC_BASE_URL`, `PAYMENT_WEB_RETURN_URL` ở backend; URL return đặt `/payment/return`. Chưa xác nhận migrations payment đã áp dụng trên DB mục tiêu.
- Snapshot `backend/docs/api/openapi.json` chưa có endpoint `/payments/*` dù source backend đã có; cần export lại từ app khi môi trường backend test sẵn sàng, rồi chạy `contracts:generate`. Không sửa generated type bằng tay.
- Chưa có ảnh đối chiếu S14/S22/S24/S32/S37 desktop/mobile với `code.html` Stitch hiện tại; các màn đánh dấu UI-ready, chưa Verified.
- Backend phải xác nhận refund/reconcile, duplicate IPN, late payment và timeout sau commit trên môi trường test trước khi đóng gate G01.
