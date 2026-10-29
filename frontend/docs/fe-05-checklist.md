# FE-05 — Sau mua, điểm thưởng và đổi trả

Ngày cập nhật: 29/10/2026.

## Đã triển khai

- S31 wishlist phân trang theo sản phẩm, lưu từ PDP bằng PUT trạng thái đích, bỏ lưu trong tài khoản; mua hàng dẫn về PDP để chọn variant.
- S19 điểm/hạng/lịch sử từ API; S20 rewards lấy policy backend, redeem có khóa idempotency giữ qua reload trong tab, hiển thị coupon trả về. Khi policy thiếu, hiện trạng thái không khả dụng thay vì dữ liệu giả.
- S16 thông báo phân trang, số chưa đọc và đánh dấu từng mục.
- S12/S34/S06 đổi trả: chọn đơn COMPLETED, dòng hàng/số lượng/lý do, tìm variant thay thế, upload ảnh private tối đa 5 MB và 5 ảnh, tạo yêu cầu có idempotency; chi tiết hiển thị quote, hạn, settlement/refund thật, chỉ bật accept cho quote INSPECTED còn hạn. URL ảnh private được lấy khi người dùng yêu cầu.
- Form review trên PDP gửi API; backend chỉ chấp nhận khách có đơn COMPLETED và review chờ duyệt.
- BFF giữ Bearer token server-side, validate input/Origin/UUID, không public-cache dữ liệu tài khoản; upload multipart có giới hạn kích thước trước khi forward.

## Kiểm tra và giới hạn

- Frontend lint, typecheck, unit, production build, inventory/contracts check.
- Nghiệm thu backend thật ngày 29/10/2026: wishlist, điểm/hạng/lịch sử, rewards policy, danh sách và chi tiết đổi trả, thông báo đều HTTP 200 qua BFF với tài khoản demo có đơn COMPLETED và yêu cầu đổi trả đã seed. Lượt đầu wishlist 500 do DB thiếu migration `20261028000000_product_try_on_color`; sau khi áp dụng migration đã trả 200.
- Bản production trong Chromium: `/account/loyalty`, `/account/loyalty/rewards`, `/account/returns`, `/account/returns/new`, `/account/returns/[id]`, `/account/wishlist`, `/account/notifications` đều HTTP 200 và có tiêu đề đúng. Next dev tại lần thử này gặp lỗi Suspense ở trang tài khoản rồi lặp tải trang, dẫn đến HTTP 429 ở `/auth/me`; bản production không tái hiện. Chưa kiểm tra thao tác redeem, tạo yêu cầu đổi trả/upload ảnh private, review sau mua và đối chiếu ảnh Stitch desktop/mobile. Các màn hiện UI-ready, chưa Verified.
- Đổi hàng có chênh lệch dương hiện chỉ truyền COD; backend có thể trả `ONLINE_PAYMENT_MODULE_REQUIRED_FOR_DIFFERENCE` khi policy không cho COD. Không tuyên bố đã tích hợp thanh toán chênh lệch online.
- Review chỉ hiển thị công khai sau duyệt backend. Không giả lập trạng thái hoàn tiền thành công.
