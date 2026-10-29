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
- Nghiệm thu backend thật ngày 29/10/2026: `health/ready` 200; đăng nhập demo qua BFF 200; đọc giỏ 200; báo giá checkout 200; đọc đơn đã seed qua BFF 200. Giỏ khách vãng lai thêm một biến thể rồi xóa: các lệnh 200, số lượng từ 1 về 0. Bản production render `/cart`, `/checkout`, `/order-success/[id]` trong Chromium với HTTP 200 và tiêu đề đúng.
- Ca COD bằng tài khoản demo riêng: tạo đơn HTTP 201/PENDING, đọc chi tiết HTTP 200/PENDING, hủy HTTP 200/CANCELLED. Đơn thử đã hủy nhưng lịch sử đơn vẫn được lưu trong DB demo. Chạy lại bằng `node scripts/accept-live-checkout.mjs` chỉ trên DB demo vì lệnh tạo đơn thật.
- Trước migration, catalog/wishlist và preview trả 500 do DB thiếu cột `product_variants.try_on_color_hex`. Đã chạy `npx prisma migrate deploy` cho migration `20261028000000_product_try_on_color`; kiểm tra lại preview 200. Cần áp dụng migration này ở mọi DB đích trước nghiệm thu.

## Còn cần nghiệm thu

- Chưa thao tác đặt đơn COD qua giao diện trình duyệt, sandbox VNPAY hoặc merchant callback. Cần HTTPS public callback/IPN, cấu hình `VNPAY_*`, `PAYMENT_PUBLIC_BASE_URL`, `PAYMENT_WEB_RETURN_URL` ở backend; URL return đặt `/payment/return`. Migration payment cần được xác nhận trên từng DB đích.
- Snapshot `backend/docs/api/openapi.json` chưa có endpoint `/payments/*` dù source backend đã có; cần export lại từ app khi môi trường backend test sẵn sàng, rồi chạy `contracts:generate`. Không sửa generated type bằng tay.
- Chưa có ảnh đối chiếu S14/S22/S24/S32/S37 desktop/mobile với `code.html` Stitch hiện tại; các màn đánh dấu UI-ready, chưa Verified. Trang `/payment/return` chưa thử với callback sandbox thật.
- Backend phải xác nhận refund/reconcile, duplicate IPN, late payment và timeout sau commit trên môi trường test trước khi đóng gate G01.
