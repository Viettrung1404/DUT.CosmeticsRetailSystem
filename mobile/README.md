# 📱 GlowUp Mobile App — Khách Hàng (End-user)

GlowUp Mobile là ứng dụng mua sắm mỹ phẩm trên thiết bị di động, thuộc hệ sinh thái **Hệ thống quản lý bán lẻ mỹ phẩm GlowUp**. Ứng dụng cung cấp trải nghiệm mua sắm mượt mà, quản lý đơn hàng, theo dõi điểm thưởng (Loyalty) và tích hợp các phương thức thanh toán trực tuyến dành riêng cho khách hàng (End-user).

---

## 🚀 Công nghệ sử dụng (Tech Stack)

Dự án được xây dựng với ưu tiên tốc độ, tính ổn định và trải nghiệm người dùng (UX) cao nhất:

*   **Core Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (SDK 57) - Viết một lần, chạy trên cả iOS & Android.
*   **Navigation:** [React Navigation v6](https://reactnavigation.org/) (Sử dụng `Native-Stack` cho luồng Auth/Chi tiết và `Bottom-Tabs` cho điều hướng chính).
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand) - Quản lý trạng thái toàn cục nhẹ, nhanh và không có boilerplate dư thừa.
*   **HTTP Client:** [Axios](https://axios-http.com/) - Xử lý gọi API, tích hợp Interceptors để tự động đính kèm JWT Token.
*   **UI/Icons:** Tự custom bằng `StyleSheet` của React Native kết hợp bộ icon `@expo/vector-icons` (Ionicons).

---

## 🎯 Phạm vi chức năng (Sprint 1)

Dựa trên tài liệu Đặc tả Yêu cầu (FR) và Sprint Plan, phiên bản hiện tại đã hoàn thiện các tính năng P0 nền tảng:

### 🔐 1. Module Auth (Xác thực người dùng)
*   **Đăng nhập (Login):** Form validation, xử lý Async state (Loading/Error), lưu trữ trạng thái đăng nhập.
*   **Đăng ký (Register):** Kiểm tra tính hợp lệ của dữ liệu (Họ tên, SĐT, Email, Khớp mật khẩu).
*   **Quên mật khẩu (Forgot Password):** Giao diện yêu cầu cấp lại mật khẩu.

### 🛒 2. Module Mua hàng (Commerce)
*   **Trang chủ (Home):** Hiển thị danh sách sản phẩm dạng Grid 2 cột, tối ưu với `FlatList`.
*   **Chi tiết sản phẩm (Product Detail):** Ảnh Carousel lớn, hiển thị trạng thái tồn kho, bộ chọn biến thể (Variant Picker - dung tích/màu sắc).
*   **Call-to-Action (CTA):** Thanh "Thêm vào giỏ hàng" luôn bám đáy (Sticky Bottom Bar) để tăng tỷ lệ chốt đơn.

---

## 📂 Cấu trúc thư mục định hướng

*Lưu ý: Trong Sprint 1, để ép tiến độ, logic đang được gộp tạm thời tại `App.js`. Ở các Sprint tiếp theo, dự án sẽ được refactor theo cấu trúc chuẩn sau:*

```text
mobile/
├── assets/                 # Chứa hình ảnh tĩnh, fonts, icon app
├── src/
│   ├── components/         # Các UI component dùng chung (Button, Card, Input)
│   ├── navigation/         # Cấu hình routes (AuthStack, MainTabs)
│   ├── screens/            # Giao diện chính (LoginScreen, HomeScreen, ProductDetailScreen,...)
│   ├── services/           # Chức năng gọi API (api.js thiết lập Axios interceptors)
│   ├── store/              # Quản lý state bằng Zustand (authStore, cartStore)
│   └── utils/              # Các hàm hỗ trợ (format giá tiền, validate regex)
├── App.js                  # Entry point của ứng dụng
├── app.json                # Cấu hình cấu trúc Expo app
└── package.json            # Quản lý phiên bản thư viện

🛠️ Hướng dẫn Cài đặt & Chạy dự án (Local Development)
1. Yêu cầu môi trường
Node.js: Phiên bản 18.x trở lên.

Điện thoại: Cài đặt sẵn ứng dụng Expo Go (có trên App Store & Google Play).

⚠️ LƯU Ý QUAN TRỌNG: Máy tính chạy Backend và Điện thoại test app BẮT BUỘC phải kết nối chung một mạng Wifi.

2. Cài đặt các gói thư viện
Mở Terminal, di chuyển vào thư mục mobile và chạy lệnh: npm install

3. Cấu hình kết nối API Backend
Vì chạy trên điện thoại thực tế, bạn không thể sử dụng localhost để gọi API. Hãy làm theo bước sau:

Mở Terminal (cmd) trên máy tính, gõ ipconfig để lấy địa chỉ IPv4 (VD: 192.168.1.5).

Mở file App.js (hoặc src/services/api.js), sửa hằng số API_URL:

// Đổi IP dưới đây thành IPv4 của máy bạn
const API_URL = '[http://192.168.1.5:3000/api/v1](http://192.168.1.5:3000/api/v1)';

4. Khởi động ứng dụng
Chạy lệnh sau tại thư mục mobile: npx expo start

Một mã QR code sẽ xuất hiện trên Terminal.

Mở Expo Go (Android) hoặc Camera (iOS) để quét mã QR.

App sẽ tự động build và hiển thị trên điện thoại.

(Mẹo: Trong lúc code, nhấn phím r trên Terminal để ép app reload giao diện ngay lập tức).