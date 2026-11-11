# FE Admin Sprint 4 — Đợt 1: Người dùng & phân quyền

## Phạm vi đã triển khai
- `/admin/users`: danh sách, tìm theo tên/email/SĐT; lọc vai trò, trạng thái; phân trang.
- Tạo tài khoản nhân viên (email, tên, SĐT, vai trò, cửa hàng có sẵn).
- Sửa tên, SĐT, vai trò; khóa/mở tài khoản có xác nhận.
- Gán/gỡ cửa hàng qua `PUT /admin/users/:id/stores` (danh sách đầy đủ).
- Ma trận quyền theo module: Kế thừa vai trò / Cấp thêm / Thu hồi.
- Bitmask sử dụng `BigInt`, không ép sang JavaScript number để tránh sai bit.
- Xử lý trạng thái thiếu `SYSTEM_USER_MANAGE`; không hiển thị dữ liệu mẫu khi API lỗi.

## Phụ thuộc Backend
- `GET /api/v1/admin/users`, `GET /api/v1/admin/users/:id`, `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id`, `PUT /api/v1/admin/users/:id/stores`
- `GET /api/v1/admin/roles`, `GET /api/v1/admin/permissions`
- `PUT /api/v1/admin/users/:id/permissions`
- Tất cả endpoint trên yêu cầu `SYSTEM_USER_MANAGE`.
- **Không có endpoint liệt kê toàn bộ cửa hàng** trong hợp đồng User API hiện tại: dropdown chỉ hiển thị các cửa hàng của người dùng đã tải; có thể nhập UUID thật của cửa hàng khác khi sửa gán cửa hàng. Đây là khoảng trống Backend cần phối hợp.
- `POST /admin/users` có thể tạo tài khoản ngay cả khi `activationEmailSent=false`; người dùng không thể tự đặt mật khẩu qua email khi SMTP chưa cấu hình.

## Checklist nghiệm thu (chỉ thực hiện với tài khoản và database test)
1. `npm run build` trong `frontend-admin`.
2. Truy cập `/admin/users`, kiểm tra 200 với tài khoản có `SYSTEM_USER_MANAGE` và 403 với tài khoản không có.
3. Kiểm tra lọc, tìm kiếm, phân trang, xử lý danh sách rỗng.
4. Tạo nhân viên, kiểm tra thông báo email kích hoạt được gửi / chưa gửi theo Backend.
5. Đổi vai trò và trạng thái; thử mở lại phiên người dùng bị khóa.
6. Gán cửa hàng đúng UUID, thử UUID sai và UUID không tồn tại.
7. Thử quyền `ORDER_POS_CREATE`, `PAYMENT_COLLECT` theo trạng thái Kế thừa/Cấp thêm/Thu hồi và đăng nhập lại để xác nhận quyền hiệu lực.
8. Kiểm tra tránh tự thu hồi quyền, trường hợp API trả 400/403/409.
9. Kiểm tra responsive ở 390px / 768px / 1280px, modal, bảng có cuộn ngang.

**Trạng thái:** Đã viết code và tạo PR; chưa có bằng chứng build local/E2E. Chưa nghiệm thu.
