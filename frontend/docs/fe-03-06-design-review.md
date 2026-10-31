# Sửa UI FE-03–06 theo code.html — 29/10/2026

## Nguồn và cách kiểm tra

Render trực tiếp `docs/4-stitch_design/<screen>/code.html`; dùng desktop 1440×1000 và mobile 390×844, trình duyệt mới, giảm chuyển động. Header chuẩn S11, sidebar S29 và footer S39 theo planning; các header/sidebar khác nằm trong từng HTML không ghi đè quyết định chung. Không dùng `screen.png` cũ để nghiệm thu.

Ảnh trong `test-results/stitch-review/`: `*-source.png` là HTML Stitch; `*-actual.png` là app; `*-corrected.png` là ảnh chụp lại cart/checkout/home/policy/drawer sau sửa. Ảnh và kết quả JSON là artifact local, được gitignore. Chạy lại bằng:

```powershell
$env:NEXT_DIST_DIR='.next-ui-review'
$env:SITE_URL='http://localhost:3012'
node node_modules/next/dist/bin/next dev --port 3012
# Terminal khác, backend phải ready tại :3000
node scripts/review-stitch.mjs
node scripts/review-cart-guest.mjs
```

`FE_REVIEW_SCREENS=S23,S36` giới hạn đợt chụp. `FE_REVIEW_PLACE_ORDER=1` bật kiểm tra tạo đơn COD trên database demo local: replay cùng key, kiểm tra phiên khác bị từ chối, giữ món chưa chọn và hủy đơn kiểm thử qua admin demo. Script không in token/mật khẩu. Không chạy chế độ tạo đơn trên production.

## Các sai lệch đã sửa

| Nhóm | Sửa theo HTML |
|---|---|
| S39 Home | Bỏ banner có chữ nhúng; dùng ảnh editorial gốc và một lớp chữ. Khôi phục tỉ lệ hero 2:1, nội dung phía đáy, hai CTA, chiều rộng 1216, khoảng cách, các tile danh mục và hàng thương hiệu. Giữ tốc độ carousel 2000 ms người dùng đã sửa. |
| S14 Cart | Bỏ stepper thêm sai; h1/badge số lượng, notice chọn mua, chọn tất cả, cột đơn giá riêng, bộ số lượng dạng viên, thành tiền/xóa, hai cột 8/4, tổng đơn và thẻ cam kết riêng. Phí vận chuyển/khuyến mãi từ báo giá backend. Thêm gợi ý sản phẩm thật. |
| S24 Mini cart | Giữ drawer, hình sản phẩm, phiên bản, số lượng, xóa và tổng đơn; CTA tới cart/checkout. Không đặt bảng desktop vào drawer. |
| S37 Checkout | Các section đánh số, biểu mẫu địa chỉ hai cột, phương thức thanh toán radio card, ưu đãi/điểm và cột tổng đơn có ảnh. Guest không bị chặn bởi request sổ địa chỉ 401. |
| S32/S22 Kết quả | Icon trạng thái, mã đơn, tổng tiền, thông tin nhận hàng/sản phẩm và CTA; VNPAY phản ánh trạng thái backend, không dùng tab giả để đổi kết quả. |
| S33/S36/S23/S08/S38/S02 | Tổng quan có số liệu thật, profile identity/form, lịch sử đơn với header trắng/tab viên/search/năm, card sản phẩm và tổng đơn, tiến trình đơn, timeline vận chuyển, bảo mật bằng luồng reset thật. |
| S31/S19/S20/S16 | Wishlist có ảnh và thao tác thật, thẻ thành viên/tiến độ hạng, bảng điểm, card đổi thưởng và danh sách thông báo có trạng thái chưa đọc. |
| S12/S34/S06 | Card yêu cầu, chọn đơn/sản phẩm/số lượng, reason/evidence upload, báo giá có hạn dùng/chấp nhận, tiến trình và lịch sử xử lý. |
| S03/S04/S05/S07/S13/S18/S40 | FAQ search/tabs/accordion, campaign photo cards, hero chi tiết, sidebar chính sách/TOC, flash sale, directory showroom chờ nội dung và topic cards trợ giúp. |
| B01–B05 | Trang thương hiệu và blog dùng blueprint vì không có code.html riêng; search/alphabet/category/TOC và dữ liệu API thật. |

Lượt chụp phát hiện và sửa thêm lỗi chữ tiếng Việt thành `?`, hydration cart khi query header hoàn thành trước phần nội dung streamed, sidebar chính sách và header lọc đơn làm tràn ngang mobile.

## Khác biệt có căn cứ nghiệp vụ

- Số liệu, sản phẩm, ảnh hàng hóa, mức giảm, quota, thời gian và trạng thái lấy database; khác nội dung mẫu trong HTML.
- Không hiển thị quà tặng, VIP freeship, số đơn theo tab, ETA/bản đồ vận chuyển, điểm sẽ nhận hay bảo đảm kinh doanh khi API không xác nhận. Đổi trả theo quyết định 7 ngày.
- Voucher nhập/xác nhận ở checkout; cart giữ vị trí thẻ voucher và dẫn tới ưu đãi. Không hiển thị mã mẫu đã áp dụng. Guest mua bình thường; quyền lợi thành viên cần đăng nhập.
- Showroom vẫn chờ nội dung thật, không tái tạo địa chỉ/map pin giả từ HTML. Không có ảnh để nghiệm thu detail showroom với nội dung được duyệt.
- Callback thanh toán thật, email/storage/provider và nội dung công bố vẫn cần nghiệm thu staging. Không ghi toàn bộ màn là Verified chỉ vì HTTP 200, test hoặc build qua.

## Kiểm chứng

- Frontend: contracts/inventory/format/lint/typecheck, 40 test qua (14 test môi trường bỏ qua), production build qua.
- Backend: build qua; 11 test tập trung ownership guest, idempotency, quyền đọc đơn và lọc đơn theo customer/search/năm qua.
- Guest COD với backend thật: tạo đơn, replay trả cùng id, đọc receipt cùng phiên, phiên khác bị từ chối, món chưa chọn được giữ; đã hủy đơn kiểm thử.
- Browser: chụp desktop/mobile, kiểm tra console/hydration, overflow và thao tác chọn tất cả/tăng giảm. JSON từng lượt trong thư mục artifact nêu kết quả cụ thể; không coi screenshot tự động là sign-off thiết kế của người dùng.
