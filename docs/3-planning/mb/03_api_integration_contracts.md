# 03 — Đặc Tả Kết Nối API & DTO Mapping (API Contracts)

Tài liệu này chuẩn hoá giao thức kết nối mạng giữa **React Native Mobile App** và **Backend NestJS**, đồng thời chỉ ra các điểm lệch DTO hiện tại trong mã nguồn mobile để khắc phục triệt để.

---

## 1. Chuẩn Hoá Response Wrapper từ Backend

Mọi API của Backend NestJS đều trả về theo định dạng vỏ bọc (envelope) chuẩn:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Thao tác thành công",
  "data": {
    /* Payload thực tế nằm ở đây */
  },
  "timestamp": "2026-11-12T10:00:00.000Z"
}
```

> [!WARNING]
> **Điểm lệch DTO trong mã nguồn Mobile hiện tại:**
> 1. Trong `useAuthStore.ts`: `const { access_token, user } = res.data;` → **SAI**. Backend trả về `res.data.data.accessToken` (camelCase) và `res.data.data.refreshToken`.
> 2. Trong các API client: Nhiều hàm đang gọi `res.data` trực tiếp thay vì bóc tách `res.data.data`, dẫn đến lỗi `undefined` các trường hoặc hiển thị rỗng.
> 3. Cần cấu hình Axios Response Interceptor tự động bóc tách `response.data.data` để code ở component/store gọn gàng và không bị lặp lại.

---

## 2. Danh Sách Endpoint Cốt Lõi Cho Mobile MVP

### 2.1. Nhóm Xác thực & Người dùng (`/auth`, `/users`)

| Phương thức | Endpoint | Headers | Body / Query | Mô tả |
|---|---|---|---|---|
| `POST` | `/auth/login` | — | `{ email, password }` | Đăng nhập tài khoản |
| `POST` | `/auth/register` | — | `{ email, password, fullName, phone? }` | Đăng ký tài khoản |
| `POST` | `/auth/refresh-token` | — | `{ refreshToken }` | Cấp lại cặp token mới khi hết hạn |
| `POST` | `/auth/forgot-password` | — | `{ email }` | Gửi email yêu cầu đặt lại mật khẩu |
| `POST` | `/auth/reset-password` | — | `{ email, otp, newPassword }` | Cập nhật mật khẩu mới |
| `POST` | `/auth/logout` | Bearer | `{ refreshToken }` | Thu hồi token và đăng xuất |
| `GET` | `/users/me` | Bearer | — | Lấy thông tin cá nhân hiện tại |
| `PATCH` | `/users/me` | Bearer | `{ fullName, phone, dateOfBirth, gender }` | Cập nhật thông tin cá nhân |
| `PATCH` | `/users/me/password` | Bearer | `{ currentPassword, newPassword }` | Đổi mật khẩu tài khoản |

### 2.2. Nhóm Sổ địa chỉ (`/users/me/addresses`)

| Phương thức | Endpoint | Headers | Body / Query | Mô tả |
|---|---|---|---|---|
| `GET` | `/users/me/addresses` | Bearer | — | Danh sách địa chỉ nhận hàng đã lưu |
| `POST` | `/users/me/addresses` | Bearer | `{ recipientName, phone, addressLine, city, district?, ward?, isDefault }` | Thêm địa chỉ mới |
| `PUT` | `/users/me/addresses/:id` | Bearer | `{ recipientName, phone, addressLine, city, district?, ward?, isDefault }` | Sửa địa chỉ |
| `DELETE` | `/users/me/addresses/:id` | Bearer | — | Xóa địa chỉ |
| `PATCH` | `/users/me/addresses/:id/default` | Bearer | — | Đặt làm địa chỉ nhận hàng mặc định |

### 2.3. Nhóm Sản phẩm & Danh mục (`/products`, `/categories`)

| Phương thức | Endpoint | Headers | Params / Query | Mô tả |
|---|---|---|---|---|
| `GET` | `/products` | — | `page, limit, categoryId, search, sortBy, order` | Danh sách sản phẩm kèm phân trang |
| `GET` | `/products/:slug` | — | — | Chi tiết sản phẩm, danh sách biến thể (SKU), đánh giá |
| `GET` | `/categories` | — | — | Cây danh mục sản phẩm (Skincare, Make up...) |

### 2.4. Nhóm Giỏ hàng (`/cart`)

| Phương thức | Endpoint | Headers | Body | Mô tả |
|---|---|---|---|---|
| `GET` | `/cart` | `X-Session-Id` hoặc Bearer | — | Lấy nội dung giỏ hàng hiện tại |
| `POST` | `/cart/items` | `X-Session-Id` hoặc Bearer | `{ productVariantId, quantity }` | Thêm sản phẩm vào giỏ |
| `PATCH` | `/cart/items/:id` | `X-Session-Id` hoặc Bearer | `{ quantity, isSelected? }` | Cập nhật số lượng hoặc tích chọn mua |
| `DELETE` | `/cart/items/:id` | `X-Session-Id` hoặc Bearer | — | Xóa sản phẩm khỏi giỏ hàng |
| `POST` | `/cart/merge` | Bearer + `X-Session-Id` | — | Đồng bộ giỏ hàng khách vào user sau login |

### 2.5. Nhóm Đơn hàng & Thanh toán (`/orders`)

| Phương thức | Endpoint | Headers | Body | Mô tả |
|---|---|---|---|---|
| `POST` | `/orders/quote` | Bearer | `{ shippingAddressId, couponCode?, pointsToRedeem? }` | Xem trước chi phí (tính ship, giảm giá, tổng tiền) |
| `POST` | `/orders` | Bearer + `Idempotency-Key` | `{ shippingAddressId, paymentMethod: 'COD' \| 'SEPAY', note }` | Tạo đơn hàng chính thức |
| `GET` | `/orders` | Bearer | `status, page, limit` | Danh sách đơn hàng theo trạng thái |
| `GET` | `/orders/:id` | Bearer | — | Chi tiết một đơn hàng cụ thể |
| `POST` | `/orders/:id/cancel` | Bearer | `{ reason }` | Hủy đơn hàng (khi còn PENDING) |
| `GET` | `/orders/:id/tracking` | Bearer | — | Lấy thông tin & timeline vận chuyển |

### 2.6. Nhóm Hậu mãi, Điểm thưởng & Cửa hàng

| Phương thức | Endpoint | Headers | Body / Query | Mô tả |
|---|---|---|---|---|
| `GET` | `/loyalty/me` | Bearer | — | Điểm thưởng, hạng thành viên, lịch sử giao dịch |
| `POST` | `/loyalty/redeem` | Bearer | `{ rewardId }` | Đổi voucher ưu đãi bằng điểm |
| `GET` | `/wishlist` | Bearer | — | Danh sách sản phẩm yêu thích |
| `POST` | `/wishlist/:productId` | Bearer | — | Thêm sản phẩm vào danh sách yêu thích |
| `DELETE` | `/wishlist/:productId` | Bearer | — | Xóa khỏi danh sách yêu thích |
| `POST` | `/returns` | Bearer | `{ orderId, items, reason, images, solution }` | Tạo yêu cầu đổi trả (RMA) |
| `GET` | `/returns/:id` | Bearer | — | Theo dõi tiến độ duyệt đổi trả |
| `GET` | `/stores` | — | `search, city` | Danh sách showroom / cửa hàng GlowUp |

---

## 3. Chiến Lược Kết Nối Backend Thật (Pure Real Backend Strategy)

Theo quyết định thống nhất cho bản MVP Demo:
* Ứng dụng **chỉ kết nối trực tiếp với API Backend NestJS thật** (`http://<IP_LAN>:3000/api/v1` hoặc `EXPO_PUBLIC_API_URL`).
* Khi gặp sự cố mạng hoặc Backend chưa khởi động: Ứng dụng hiển thị thông báo lỗi rõ ràng (Network Error / Error State) kèm nút "Thử lại", không sử dụng mock data ẩn.
* Để kiểm tra trạng thái hoạt động của Backend trước khi chạy: Kiểm tra endpoint `/health/live` từ trình duyệt hoặc thiết bị.
