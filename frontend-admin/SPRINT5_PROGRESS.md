# Sprint 5 — FE Admin: triển khai và tiêu chí nghiệm thu

> Nhánh: `feat/admin-sprint5-analytics-marketing` (tách từ `feat/admin-sprint4-users`).
> Chỉ sửa `frontend-admin/`. Không sửa Backend, Web hay Mobile. Không tạo PR vào `develop`.

## Các chức năng đã viết mã

| Nhóm | Route | Kết nối API |
|---|---|---|
| Dashboard Analytics | `/admin/dashboard` | `GET /admin/dashboard`: KPI, 7 ngày, sản phẩm bán chạy, kênh Online/POS, cảnh báo đơn/tồn |
| Báo cáo doanh thu | `/admin/reports/revenue` | `GET /admin/reports/revenue`, `GET /admin/reports/export?type=revenue` (PDF/XLSX) |
| Báo cáo sản phẩm | `/admin/reports/products` | `GET /admin/reports/products`, `GET /admin/reports/export?type=products` |
| Khuyến mãi | `/admin/promotions` | GET/POST/PUT; activate/deactivate |
| Voucher | `/admin/coupons` | GET/POST, POST bulk, activate/deactivate |
| Đánh giá | `/admin/reviews` | GET; approve/reject/reply |
| Trang tĩnh | `/admin/pages` | CRUD, rich text, SEO |
| Blog | `/admin/blog` | CRUD, publish/schedule/archive, danh mục Blog |
| FAQ | `/admin/faqs` | CRUD, nút đổi thứ tự |
| Banner | `/admin/banners` | CRUD, vị trí, lịch và thứ tự |
| Push Notification | `/admin/notifications/push` | GET /admin/campaigns, POST /admin/notifications/push; xác nhận trước gửi |
| Product tags | form `/admin/products` hiện tại | GET /admin/product-tags và trường tags khi tạo/sửa |
| Import Excel/CSV | `/admin/products/import` | GET import-template, POST import?dryRun=true → POST import?dryRun=false |

**Đã viết mã trên GitHub không có nghĩa là đã build/đã kiểm thử tích hợp.** Chưa xác nhận TypeScript build, API thực tế, quyền và database test.

## Các khoảng trống cần xử lý trước khi nghiệm thu đầy đủ

- Dashboard/Báo cáo hiện dùng **SVG chart tự viết**, chưa dùng Recharts như tài liệu; không thêm package để tránh lệch lockfile trong khi chưa có build.
- Báo cáo hiện lọc theo **UUID cửa hàng nhập tay**, chưa có store selector với tên; cần endpoint danh bạ cửa hàng phù hợp quyền Reports.
- Promotions: chọn sản phẩm/danh mục bằng UUID tags, chưa có picker đa lựa chọn từ danh bạ; cần polish UX.
- FAQ/banner: nút ↑↓ sắp xếp, chưa hỗ trợ kéo-thả (drag-and-drop).
- **Banner image upload:** Backend upload `/admin/uploads/images` chỉ cho `products/brands/categories`, không nhận folder banner. FE nhập URL ảnh đã có; phải phối hợp Backend để có upload banner chuẩn hoặc thống nhất nguồn ảnh ngoài. Không dùng folder sai mục đích.
- Product import: xem trước kết quả `dryRun`, highlight danh sách lỗi Backend; chưa có preview tabular toàn bộ file Excel trước submit.
- Backend quyền: `REPORT_VIEW_BASIC`, `REPORT_REVENUE`, `REPORT_EXPORT`, `MARKETING_PROMO_VIEW/MANAGE`, `MARKETING_BLOG_MANAGE`, `MARKETING_BANNER_MANAGE`, `CUSTOMER_FEEDBACK_MANAGE`, `PRODUCT_IMPORT_EXPORT` và `PRODUCT_VIEW` tùy chức năng.

## Kiểm thử (chỉ trên dữ liệu thử nghiệm)

1. Trong `frontend-admin`: `npm run build` — yêu cầu 0 TypeScript errors.
2. Chạy FE/BE; đăng nhập tài khoản test có quyền; Network trả HTTP 200 và danh sách lấy từ API, không phải mock.
3. Dashboard: 4 KPI, 7-day line, top products, pie channels, đơn chờ, tồn thấp. Trường hợp dữ liệu rỗng vẫn có empty state.
4. Revenue: ngày/tuần/tháng, đổi khoảng thời gian, xuất PDF/XLSX; kiểm tra nội dung tải về hợp lệ.
5. Products report: top sellers, slow movers, export PDF/XLSX.
6. Promotions: tạo, sửa, deactivate/reactivate; xác thực loại giảm, thời gian, điều kiện.
7. Coupons: tạo mã, sinh bulk nhỏ (ví dụ 2 mã), thử mã trùng và trạng thái.
8. Reviews: duyệt/ẩn/đáp trả tài khoản test; xác nhận rating cập nhật.
9. CMS: thêm/sửa/ẩn trang, blog nháp + hẹn lịch; FAQ và banner đổi thứ tự.
10. Push: **chỉ gửi tới 1 tài khoản test**, kiểm tra deep-link route.
11. Products: gán tag, reload form vẫn giữ tags.
12. Import: file hợp lệ dryRun → import thật; file sai kiểm tra bảng lỗi và backend không ghi dữ liệu.
13. Kiểm tra trạng thái 401/403, loading, empty, mobile/tablet.

## Lưu ý Git

Repo local người dùng đang có rất nhiều `backend/` được **staged chưa commit** từ đợt tích hợp Sprint 3. Không dùng `git reset --hard`, `git clean -fd`, `git checkout` tùy tiện hoặc pull tự động trước khi kiểm tra trạng thái.
