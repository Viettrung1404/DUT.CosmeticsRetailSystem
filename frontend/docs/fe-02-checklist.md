# FE-02 — Home, catalog, search và PDP

Ngày cập nhật: 28/10/2026.

## Đã triển khai

- Home theo thứ tự và bố cục của `docs/4-stitch_design/trang_ch_glowup/code.html`: hero, cam kết, danh mục, flash sale, bán chạy, editorial, thương hiệu, nhu cầu da, bài viết. Dữ liệu lấy từ API; ảnh editorial giữ từ thiết kế Stitch.
- `/products`, `/categories/[slug]`, `/new-arrivals`, `/search` dùng listing chung, phân trang và sắp xếp bằng URL. Bộ lọc giá, rating, nhiều thương hiệu và nhiều tag tình trạng da có facet đếm từ backend.
- `/products/[slug]` hiển thị ảnh, biến thể, giá, số lượng, thêm giỏ, tồn kho theo cửa hàng, đánh giá và sản phẩm liên quan. Các link trên home có trang `/brands`, `/flash-sale`, `/blog` và bài viết.
- Thử màu son dùng camera trên trình duyệt với MediaPipe FaceLandmarker; khung hình không gửi lên server. Backend lưu mã màu HEX riêng cho từng variant và có API quản trị để cập nhật. Khi variant chưa có mã màu, người dùng có thể chọn màu minh họa bằng color picker.
- API mới: `GET /brands`, `GET /promotions/flash-sale/cards`, `GET /customer/products/facets`, mở rộng query sản phẩm (`categoryIds`, `brandIds`, `tags`), `GET /customer/products/:id/availability`, `GET /customer/products/:id/try-on`, `PATCH /admin/variants/:id/try-on-color`.

## Tương tác bổ sung

- Danh mục và deal trên home tự trượt ngang theo vòng lặp; thương hiệu tự trượt dọc từ trên xuống. Cả ba dùng nút trái/phải ở hai mép khung; không có thanh điều khiển bên dưới. Carousel tạm dừng khi rê chuột hoặc focus và tôn trọng `prefers-reduced-motion`. Nền deal dùng tông đào, nền thương hiệu dùng tím lilac theo màu pill navbar.
- Home có hiệu ứng xuất hiện khi cuộn, hover trên danh mục/thương hiệu/deal, và đồng hồ deal cập nhật mỗi giây từ `endDate` thật. Hiệu ứng chuyển động tắt theo `prefers-reduced-motion`.
- PDP chọn được ảnh chính/ảnh phụ, mở ảnh lớn bằng dialog, chuyển ảnh bằng nút hoặc phím mũi tên. Nút **Mua ngay** thêm biến thể vào giỏ rồi mở `/cart`.
- Listing dùng React Query và BFF để chỉ cập nhật danh sách/kết quả khi thay bộ lọc, sắp xếp hoặc phân trang; URL vẫn đồng bộ cho chia sẻ và Back/Forward. Thẻ sản phẩm có viền nổi khi hover/focus.
- Search box gợi ý từ khóa, thương hiệu và sản phẩm từ API `GET /customer/products/search-hints`; hỗ trợ bàn phím và hiển thị focus bao quanh cả ô tìm kiếm.

## Điều kiện để dùng màu son theo sản phẩm thật

Migration `backend/prisma/migrations/20261028000000_product_try_on_color/migration.sql` chưa áp dụng lên Neon. Sau khi áp dụng, cần điền mã HEX đã duyệt cho các variant son qua API quản trị. Chưa có bảng màu gốc trong dữ liệu hiện tại nên không suy đoán màu từ tên hoặc ảnh sản phẩm. Trước migration, API trả danh sách variant với `colorHex: null`; camera vẫn mở và cho phép chọn màu minh họa.

## Kiểm tra

- Backend `npm run build`; frontend `npm run lint`, `npm run typecheck`, `npm run build`.
- Smoke bằng Playwright trên HTTPS local: home, tất cả sản phẩm, hàng mới, tìm kiếm, PDP trả 200; camera giả lập mở mô hình và vẽ canvas 640×480.
- Smoke tương tác ngày 28/10/2026: đổi sắp xếp giữ nguyên document và trả 20 card mới; autocomplete hiện đủ 3 nhóm; PDP chọn thumbnail/phóng to; đồng hồ deal giảm từng giây.
- API local: lọc `da khô` 91, `da dầu` 63, kết hợp 126; lọc hai thương hiệu 47; facet 102 thương hiệu và 39 tag. Số lượng phụ thuộc dữ liệu hiện tại.

## Giới hạn hiện tại

- Màu son theo variant cần migration nói trên. Chưa có mã màu thật được duyệt.
- Ảnh và nội dung sản phẩm, blog, banner phụ thuộc dữ liệu CMS hiện có. Ảnh thiết kế Stitch dùng cho cụm editorial để giữ bố cục của HTML mẫu.
