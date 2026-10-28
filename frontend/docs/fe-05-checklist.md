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
- Chưa nghiệm thu E2E với DB/order COMPLETED, policy rewards/return, private bucket hoặc ảnh đối chiếu Stitch desktop/mobile. Các màn đánh dấu UI-ready, chưa Verified.
- Đổi hàng có chênh lệch dương hiện chỉ truyền COD; backend có thể trả `ONLINE_PAYMENT_MODULE_REQUIRED_FOR_DIFFERENCE` khi policy không cho COD. Không tuyên bố đã tích hợp thanh toán chênh lệch online.
- Review chỉ hiển thị công khai sau duyệt backend. Không giả lập trạng thái hoàn tiền thành công.
