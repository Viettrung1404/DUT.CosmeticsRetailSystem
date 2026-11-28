# Mobile Planning — GlowUp Cosmetics (React Native / Expo)

Tài liệu quy hoạch và kế hoạch triển khai ứng dụng di động **GlowUp Cosmetics** dành cho khách hàng cuối (End-User B2C Mobile App).

---

## 1. Mục tiêu tài liệu
* **Đối chiếu toàn diện** giữa phiên bản Frontend Web (Next.js - 41 màn Stitch Design + 5 blueprint) và ứng dụng Mobile (React Native / Expo).
* **Phát hiện các khoảng cách (Gaps)**: Màn hình còn thiếu, luồng người dùng (user flow) chưa chuẩn, và các điểm lệch giao thức kết nối API so với Backend NestJS.
* **Xác định lộ trình đạt MVP Demo**: Các bước hành động cụ thể, ưu tiên tính năng cốt lõi để chạy demo trơn tru trên thiết bị thật và giả lập.

---

## 2. Cấu trúc tài liệu quy hoạch

| Tập tin | Nội dung chính |
|---|---|
| [01_architecture_and_tech_stack.md](01_architecture_and_tech_stack.md) | Kiến trúc ứng dụng, State Management (Zustand), Navigation Architecture, Axios Interceptor, Guest Session vs Auth Session, Theme tokens. |
| [02_screen_inventory_and_gap_analysis.md](02_screen_inventory_and_gap_analysis.md) | Danh mục đối chiếu 1:1 màn hình Web vs Mobile, phân tích chi tiết các màn hình thiếu và các luồng cần nắn chỉnh. |
| [03_api_integration_contracts.md](03_api_integration_contracts.md) | Đặc tả Contract kết nối API Backend NestJS: DTO mapping, Wrapper response, Header Session/Idempotency, xử lý lỗi & Refresh Token. |
| [04_mvp_delivery_plan.md](04_mvp_delivery_plan.md) | Kế hoạch triển khai theo từng giai đoạn (Phase 1 → Phase 5) để có bản MVP Demo hoàn chỉnh. |
| [05_testing_and_tdd_strategy.md](05_testing_and_tdd_strategy.md) | Chiến lược kiểm thử hướng kiểm thử (TDD), cấu hình Vitest, danh mục Test cases (Auth, Cart, Address, Checkout, Store Locator). |
| [06_mvp_demo_script.md](06_mvp_demo_script.md) | Kịch bản thuyết trình và Demo MVP hoàn chỉnh (Golden Demo Path 7 bước, Resilience Testing, Quality Metrics). |

---

## 3. Tóm tắt hiện trạng Mobile (Đã hoàn thiện MVP 100%)
* **Framework:** Expo SDK 52 / React Native 0.88 / React 19 / TypeScript / Zustand / Vitest.
* **UI/UX Design:** Định hình phong cách thương hiệu cao cấp GlowUp Cosmetics với tông màu Rose Berry (`#C85A70`) và Blush Pink (`#F9ECEE`), an toàn với Safe Area trên cả Android & iOS.
* **Màn hình hoàn chỉnh:** 24 màn hình bao gồm Auth, Trang chủ, Danh mục, Chi tiết SP biến thể động, Giỏ hàng, Checkout, Đặt hàng thành công, Đơn hàng, Đổi trả (RMA), Theo dõi vận chuyển, Khách hàng thân thiết (Loyalty), Hồ sơ cá nhân, Sổ địa chỉ (CRUD), Showroom cửa hàng, Trung tâm trợ giúp (FAQ).
* **Chất lượng kiểm thử:** 11 Test Suites / 37 Unit Tests PASSED (100% Green), TypeScript Strict 0 errors.
* **Kết nối Backend NestJS:** Kết nối API thực tế, cơ chế tự cấp UUID Guest Session, tự động Refresh Token, Idempotency-Key chống lặp đơn, và banner xử lý rớt mạng kèm nút "Thử lại".

