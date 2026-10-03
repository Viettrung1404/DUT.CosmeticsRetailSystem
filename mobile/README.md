# 💄 GlowUp Cosmetics - Mobile Application (React Native / Expo)

Ứng dụng di động mua sắm mỹ phẩm đa kênh **GlowUp Cosmetics**, thuộc hệ thống quản lý bán lẻ và phân tích kinh doanh mỹ phẩm.

* **Phụ trách phát triển:** Văn Kim (Mobile App Lead)
* **Công nghệ sử dụng:** React Native, Expo (SDK 57), TypeScript, React Navigation, Zustand, Axios, Expo SecureStore, Expo LocalAuthentication.
* **Tông màu chủ đạo:** Rose Berry (`#C85A70`) & Blush Pink (`#F9ECEE`).

---

## 📱 Các tính năng hoàn thành trong Sprint 1 (Foundation)

### 1. Xác thực & Tài khoản (Auth Flow)
* **Đăng nhập (`LoginScreen`):** Đăng nhập qua Email & Mật khẩu, lưu JWT Access Token an toàn vào `SecureStore`.
* **Đăng nhập Sinh trắc học:** Hỗ trợ xác thực vân tay / Face ID nhanh qua `expo-local-authentication`.
* **Đăng ký (`RegisterScreen`):** Form đăng ký tài khoản khách hàng mới.
* **Quên mật khẩu (`ForgotPasswordScreen`):** Form gửi liên kết/OTP khôi phục mật khẩu.

### 2. Trang chủ & Catalog sản phẩm (Product Catalog)
* **Trang chủ (`HomeScreen`):** 
  * Header chào mừng cá nhân hóa tên người dùng.
  * Hero Banner Flash Sale giảm giá -40%.
  * Bảng trượt danh mục sản phẩm nổi bật (Skincare, Son môi, Chống nắng...).
  * Lưới sản phẩm gợi ý 2 cột (`FlatList`) tích hợp nút thả tim Yêu thích.
* **Danh mục sản phẩm (`CatalogScreen`):** Hiển thị danh sách sản phẩm theo danh mục và bộ lọc.
* **Chi tiết sản phẩm (`ProductDetailScreen`):** Trình chiếu hình ảnh, bộ chọn biến thể dung tích (30ml, 50ml), hiển thị thành phần chi tiết và thanh nút bấm cố định "Thêm vào giỏ".
* **Tìm kiếm (`SearchScreen`):** Thanh tìm kiếm từ khóa mỹ phẩm và lịch sử tìm kiếm gần đây.

### 3. Khung chờ cho Sprint 2 (Placeholders)
* Đã cấu hình sẵn bộ tab điều hướng `MainTabs` cho các màn hình: `CartScreen`, `OrderScreen`, `ProfileScreen`.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
* Node.js >= 18.x
* Ứng dụng **Expo Go** trên điện thoại thật (iOS/Android) hoặc Trình giả lập (Android Emulator / iOS Simulator).

### 2. Cài đặt các gói phụ thuộc
```bash
cd mobile
npm install

###3. Cấu hình kết nối Backend Local
*Mở file src/api/apiClient.ts và điều chỉnh BASE_URL tương ứng với môi trường chạy của bạn:
Android Emulator: http://10.0.2.2:5000/api/v1
iOS Simulator / Điện thoại thật qua Wi-Fi: http://<IP_LAN_MÁY_TÍNH>:5000/api/v1
###4. Khởi chạy ứng dụng
npx expo start
*Quét mã QR hiển thị ở Terminal bằng ứng dụng Expo Go trên điện thoại.
##📂 Cấu trúc thư mục mã nguồn (mobile/)
mobile/
├── assets/                      # Hình ảnh tĩnh, logo, icon ứng dụng
│   ├── adaptive-icon.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash.png
├── src/
│   ├── api/                     # Quản lý kết nối HTTP Request (Axios Services)
│   │   ├── apiClient.ts         # Axios Interceptor tự động gắn JWT Token từ SecureStore
│   │   ├── authApi.ts           # Service gọi API /auth/login, /auth/register
│   │   └── productApi.ts        # Service gọi API /products, /products/:slug
│   ├── components/              # UI Components tái sử dụng (Reusable Components)
│   │   ├── common/              # Component cơ bản
│   │   │   ├── Header.tsx       # Thanh tiêu đề top bar
│   │   │   ├── CustomButton.tsx # Nút bấm Rose Berry tiêu chuẩn
│   │   │   └── CustomInput.tsx  # Ô nhập liệu có icon & validation
│   │   ├── product/             # Component chuyên biệt cho Sản phẩm
│   │   │   ├── ProductCard.tsx  # Thẻ hiển thị sản phẩm 2 cột
│   │   │   ├── CategoryChip.tsx # Nút chip danh mục cuộn ngang
│   │   │   └── VariantPicker.tsx# Bộ chọn dung tích (30ml, 50ml)
│   │   └── home/                # Component chuyên biệt cho Trang chủ
│   │       ├── HeroBanner.tsx   # Banner Flash Sale -40%
│   │       └── SearchBar.tsx    # Thanh tìm kiếm nhanh
│   ├── constants/               # Hằng số, Bảng màu Theme, Typography
│   │   └── theme.ts             # Khai báo COLORS (Rose Berry, Blush Pink), SPACING, RADIUS
│   ├── navigation/              # Cấu hình Điều hướng (React Navigation)
│   │   ├── AppNavigator.tsx     # Root Navigator tự động chuyển AuthStack / MainTabs
│   │   ├── AuthStack.tsx        # Stack điều hướng luồng Xác thực
│   │   └── MainTabs.tsx         # Bottom Tabs chứa 5 trang chính
│   ├── screens/                 # Toàn bộ màn hình UI chính
│   │   ├── auth/                # Nhóm màn hình Xác thực
│   │   │   ├── LoginScreen.tsx          # Đăng nhập Email/Pass + Face ID / Vân tay
│   │   │   ├── RegisterScreen.tsx       # Đăng ký tài khoản
│   │   │   └── ForgotPasswordScreen.tsx # Quên / Khôi phục mật khẩu
│   │   ├── home/                # Nhóm Trang chủ
│   │   │   └── HomeScreen.tsx           # Trang chủ với Banner, Category, Grid gợi ý
│   │   ├── product/             # Nhóm Sản phẩm & Danh mục
│   │   │   ├── CatalogScreen.tsx        # Danh mục sản phẩm & Bảng lọc
│   │   │   └── ProductDetailScreen.tsx  # Chi tiết sản phẩm, Biến thể, Giá, Nút Mua
│   │   ├── search/              # Nhóm Tìm kiếm
│   │   │   └── SearchScreen.tsx         # Tìm kiếm từ khóa & Lịch sử
│   │   ├── cart/                # Nhóm Giỏ hàng (Sprint 2 Placeholder)
│   │   │   └── CartScreen.tsx
│   │   ├── order/               # Nhóm Đơn hàng (Sprint 2 Placeholder)
│   │   │   └── OrderScreen.tsx
│   │   └── profile/             # Nhóm Hồ sơ cá nhân (Sprint 2 Placeholder)
│   │       └── ProfileScreen.tsx
│   ├── store/                   # Quản lý State toàn cục bằng Zustand
│   │   ├── useAuthStore.ts      # Lưu thông tin User, Token, hàm Login/Logout
│   │   └── useCartStore.ts      # (Sẵn sàng cho Sprint 2) Quản lý giỏ hàng
│   ├── types/                   # Định nghĩa TypeScript Interfaces
│   │   ├── auth.types.ts        # Type cho User, TokenResponse, LoginDTO
│   │   └── product.types.ts     # Type cho Product, Variant, Category
│   └── utils/                   # Các hàm tiện ích bổ trợ
│       └── formatters.ts        # Hàm định dạng tiền tệ (Ví dụ: 350.000đ)
├── .gitignore
├── App.js                       # File khởi chạy chính của Expo
├── app.json                     # Cấu hình ứng dụng Expo (Name, Icons, Splash)
├── package.json                 # Khai báo thư viện phụ thuộc
├── tsconfig.json                # Cấu hình TypeScript
└── README.md                    # Tài liệu hướng dẫn cài đặt & chạy Mobile App