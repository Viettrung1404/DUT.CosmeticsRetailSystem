# FE-04 — Tài khoản và đơn hàng

Ngày cập nhật: 29/10/2026.

## Đã triển khai

- S33 `/account`: tổng quan từ hồ sơ và trang đầu lịch sử đơn, không tạo số voucher hoặc ETA giả.
- S36 `/account/profile`: đọc/sửa họ tên, điện thoại, ngày sinh, giới tính theo DTO backend; email chỉ đọc.
- S23 `/account/orders`: phân trang và lọc trạng thái qua API; S08 `/account/orders/[id]` xem snapshot hàng/tổng tiền/địa chỉ, hủy khi PENDING; S38 tracking hiển thị từng kiện và lịch sử thật.
- S02 `/account/security`: dẫn đến luồng reset mật khẩu sẵn có; chưa bật 2FA hay quản lý phiên khi không có API.
- BFF kiểm tra UUID/query/body, dùng broker phiên, `private, no-store`; backend bảo vệ quyền sở hữu đơn/tracking.

## Kiểm tra

- Frontend lint, typecheck, unit test, build production, inventory/contracts check.
- Chưa có kiểm chứng E2E với DB và ảnh đối chiếu Stitch cho S02/S08/S23/S33/S36/S38. Các màn hiện UI-ready, chưa Verified.

## Phụ thuộc

- Môi trường backend/session thật và dữ liệu có nhiều kiện để kiểm chứng tracking; O02 OpenAPI response vẫn còn generic ở một số endpoint.
