# FE-03 — Giỏ hàng, checkout và thanh toán

Ngày cập nhật: 01/11/2026.

## Checkout theo Stitch — 01/11/2026

- Đối chiếu `thanh_to_n_glowup/code.html`: khung hai cột, tiến trình đặt hàng, thẻ địa chỉ, thanh toán, voucher/xu, tóm tắt đơn và thông tin giao hàng. Desktop/mobile không tràn ngang.
- Guest nhập địa chỉ; tài khoản chọn địa chỉ đã lưu, thêm/chỉnh sửa ngay trong checkout. Sổ địa chỉ tài khoản dùng cùng biểu mẫu hai cấp. Địa chỉ cũ được giữ nguyên và cần chọn lại đơn vị hiện tại trước khi checkout.
- Dữ liệu tỉnh–xã snapshot `2026.10.8` từ tinhthanhpho.com (CC BY 4.0), đủ 34 tỉnh/thành và 3.321 phường/xã/đặc khu. Không có trường nhập quận/huyện. Chọn lại tỉnh xóa xã và ghim cũ.
- Leaflet hỗ trợ chọn/kéo ghim và định vị trình duyệt; tọa độ được lưu ở sổ địa chỉ, có thể gửi trong shipping snapshot. Ghim không tự suy ra số nhà hoặc thay thế địa chỉ. Test tự động dùng tile giả lập, không thu thập tile OSM bằng trình duyệt headless.
- Voucher nhập tay chỉ áp dụng sau khi kiểm tra backend; kho voucher chỉ trả mã công khai và mã thuộc tài khoản hiện tại, loại mã hết lượt/chiến dịch không còn hoạt động. Không điền sẵn voucher hay xu. Slider/toggle xu đọc số dư và quy tắc backend, tách giảm sản phẩm, voucher, xu và phí ship trong tổng tiền.
- Phí ship và ngưỡng miễn phí cùng nguồn chính sách với pricing engine (hiện 30.000đ, miễn phí từ 500.000đ tiền hàng sau ưu đãi/xu hoặc campaign freeship). Chưa có hãng vận chuyển/ETA; giao diện ghi lịch giao được cửa hàng xác nhận.
- Migration `20261101000000_address_map_location` đã áp dụng; backend readiness 200. Backend build và 42 test liên quan qua; frontend production build, TypeScript, ESLint phần thay đổi, 53 unit test qua (14 test có điều kiện skip), 6 ca trình duyệt desktop/mobile qua. OpenAPI/BFF contract đã cập nhật.
- Smoke backend thật bằng `scripts/accept-checkout-layout.mjs`: đăng nhập demo; đọc voucher/xu; thêm và chọn địa chỉ ngay tại checkout; định vị, lưu và đọc lại tọa độ; áp mã thật; sửa địa chỉ trong sổ địa chỉ và kiểm tra giữ tọa độ. Địa chỉ QA đã xóa, không tạo đơn hay chuyển tiền. Ảnh desktop/mobile và kết quả JSON tại `.tmp/checkout-review/` ở root workspace (gitignored).
- Các mục bên dưới là kết quả lịch sử ngày 29/10/2026. Checkout online hiện dùng SePay; xem `backend/docs/sepay-setup.md` cho trạng thái nghiệm thu thanh toán mới nhất.

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
