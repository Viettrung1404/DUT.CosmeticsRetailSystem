# Kiểm kê asset FE-00

Nguồn: `docs/4-stitch_design`, 41 cặp HTML/screenshot và ba thư mục image.png_1/2/3. Manifest [asset-inventory.json](asset-inventory.json) ghi từng thư mục, kích thước/bytes PNG, URL img/script/CSS và trạng thái review. Script đếm cả script references để phát hiện CDN runtime cần loại; không coi mọi URL là ảnh.

- `trang_ch_glowup_beauty_retail`: chuẩn navbar/footer; FE-01 chuyển thành component chung, không copy script/HTML runtime.
- `s_a_ch_glowup`: chuẩn sidebar; menu đã khóa ở navigation.ts.
- `image.png_1`: logo G tham khảo, cần export kích thước header/favicon đúng; chưa tự tạo logo khác.
- `image.png_2`: bảng nhận diện, reference để chuẩn hóa.
- `image.png_3`: screenshot Beauty Box, chỉ tham khảo, tuyệt đối không đưa vào public asset.
- Ảnh remote trong Stitch chưa kiểm tra quyền, độ bền URL và nội dung chính thức. Không tự tải hàng loạt/hotlink vào sản phẩm; `images.remotePatterns` hiện rỗng. Khi duyệt host/file mới phải kiểm tra nguồn, dimensions, alt, responsive sizes và tối ưu.
- `public/` chưa có ảnh production đã duyệt; trang bootstrap chỉ typography. Font dùng next/font, không CDN client. Primary #C85A70 ghi đè primary cũ trong Stitch.

Chạy `npm run inventory:generate` khi thay Stitch/route plan, review manifest diff. `inventory:check` đối chiếu file thật nếu có. Thư mục Stitch bị gitignore của repository: trên clone/CI không có source, script ghi rõ chỉ kiểm tra manifest đã commit và vẫn đối chiếu screen plan. Muốn tái kiểm chứng dimensions/URL cần cung cấp bộ Stitch gốc tại đúng đường dẫn; manifest không phải giấy phép xuất bản asset.
