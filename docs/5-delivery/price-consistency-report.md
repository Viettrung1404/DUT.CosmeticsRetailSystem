# Báo cáo đồng bộ giá và xác nhận lại checkout

Ngày: 26/11/2026 (Asia/Saigon).

## Kết quả triển khai

- Catalog/PDP/danh sách/tìm kiếm/gợi ý/sản phẩm liên quan đọc giá hiện tại từ PostgreSQL. Bỏ cache kết quả chứa giá 45–60 giây; OpenSearch chỉ hỗ trợ độ liên quan khi tìm kiếm, không quyết định giá, lọc giá hay sắp xếp giá.
- Wishlist dùng cùng nguồn giá catalog, có tính hạng thành viên. Danh sách, wishlist và cart lấy lại dữ liệu khi mở lại hoặc quay lại tab. PDP lấy giá mới khi tải lại; đồng hồ flash sale hiện có làm mới khi hết phiên. Không triển khai đẩy giá qua WebSocket/SSE cho mọi trang đang mở.
- Cart tính giá theo số lượng và điều kiện của các dòng được chọn. Dòng không chọn được báo giá riêng, không làm các dòng được chọn đạt ngưỡng khuyến mãi. Giữ tổng tiền dòng chính xác thay vì nhân lại đơn giá trung bình đã làm tròn.
- Flash sale còn một phần quota: chỉ giảm cho số lượng còn quota, phần còn lại giá thường. Lưu `quotaQuantity` vào báo giá/snapshot và chỉ giữ chỗ đúng số suất giảm giá.
- Giá gạch ngang và % giảm trên card/PDP lấy từ đúng variant đang được báo giá, tránh so giá variant rẻ với giá gốc variant đắt.
- Checkout dùng báo giá server để hiển thị dòng hàng, kể cả Mua ngay; không tiếp tục dùng giá lưu trong session cho số tiền thanh toán.
- Khi backend trả giá/ưu đãi/quota thay đổi, mở popup so báo giá cũ → mới: dòng hàng, đơn giá gốc nếu đổi, tiền hàng, giảm giá, xu, phí ship và tổng thanh toán. Làm mới phần báo giá bằng API; giữ địa chỉ và phương thức thanh toán; không tải lại trang và không tự gửi lại lệnh đặt hàng.
- Voucher hết điều kiện hoặc số xu không còn hợp lệ được bỏ khỏi lần tính lại; khách xem lại báo giá trước khi đặt tiếp. Tải giá mới lỗi thì báo giá cũ không dùng được; có nút thử tải lại. Giá thay đổi lần nữa vẫn được backend kiểm tra ở lần đặt tiếp theo.
- Phí hãng vận chuyển kết hợp ưu đãi của cửa hàng: trừ mức hỗ trợ tương ứng; không âm; miễn phí vận chuyển vẫn bằng 0. Backend và frontend cùng áp dụng quy tắc này, kể cả khi giá hàng vượt/rớt ngưỡng ưu đãi.
- Khóa các promotion đang áp dụng, kể cả chương trình không giới hạn lượt, khi kiểm tra giá cuối trong transaction. Variant/product và quota vẫn được khóa cùng luồng tạo đơn hiện có.
- Giữ cơ chế snapshot đơn hàng, phân bổ giảm giá và idempotency hiện có. Không tính lại giá đơn cũ từ catalog. Đã demo bằng API chi tiết đơn và tra cứu đơn sau khi đổi giá, cũng như retry cùng lệnh đặt hàng.
- Request thay đổi dữ liệu luôn `no-store`; giới hạn xu trên frontend tôn trọng cấu hình `minimumBalance`.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Frontend unit suite | 112 passed, 14 skipped; 19 file passed, 1 skipped |
| Backend các nhóm liên quan | 68 test passed, 9 suite; gồm pricing, quota reservation, cart, wishlist, guest checkout, shipping và PDP freshness |
| Typecheck frontend | PASS |
| Typecheck backend mã ứng dụng (`tsconfig.build.json`, no emit) | PASS |
| ESLint checkout và các tiện ích giá/transport mới | PASS |
| API tăng giá 191.000 → 208.000; giảm xuống 180.000 | PDP/cart cập nhật; báo giá cũ trả 409 `ORDER_PRICE_CHANGED`; tìm kiếm vẫn tìm thấy sản phẩm |
| Sửa từng dòng nhưng tổng không đổi | Unit test xác nhận quoteVersion thay đổi |
| Đổi giá sau khi tạo đơn | API account order và tracking giữ nguyên tiền hàng, giảm giá, tổng thanh toán |
| Retry cùng idempotency key sau khi giá đổi | Trả lại đúng đơn đã tạo |
| Trình duyệt desktop/mobile với backend thật | Popup, giữ địa chỉ, không điều hướng, không tự đặt lại, đổi giá lần hai, tải giá lỗi/thử lại đều PASS |
| Thêm promotion trực tiếp DB; sửa % qua API admin | Báo giá mới nhận được thay đổi; popup hoạt động; promotion thử đã xóa |
| Chỉ còn một phần quota | Test tính tiền dòng và giữ chỗ đúng số suất giảm giá PASS |
| Phí ship sau ưu đãi | Test backend/frontend cho mức phí chính sách 30k/15k/5k/0 PASS |

Không công bố toàn bộ backend suite/lint toàn dự án sạch: typecheck bao gồm test còn 7 lỗi tại các test product admin/variant, returns epic 17/18/19/21 và shipping epic 06; lint các đoạn PDP khác còn lỗi React về effect cập nhật state và `Date.now`. Các lỗi này không thuộc thay đổi kiểm tra giá. Typecheck mã ứng dụng backend và frontend đã qua. Chưa nghiệm thu giao dịch ngân hàng thật, hoàn tiền thật hoặc benchmark tải cao.

## Demo và hoàn tác

- API demo: `frontend/scripts/accept-price-changes.mjs`.
- UI demo: `frontend/scripts/demo-price-review.mjs` (Playwright, backend/BFF thật; giả lập lỗi 503 chỉ cho bước kiểm tra tải lại giá).
- Bằng chứng API: [price-changes-api.json](evidence/price-changes-api.json).
- Bằng chứng UI: [price-changes-ui.json](evidence/price-changes-ui.json).
- Ảnh: [desktop](evidence/price-review-desktop.png), [mobile](evidence/price-review-mobile.png).
- Nhật ký hoàn tác: [API](evidence/price-changes-restore.json), [UI](evidence/price-changes-ui-restore.json).
- Đọc lại DB xác nhận giá về **191.000**, đơn thử `c39cf50f-528a-403a-9e29-65457b267049` ở trạng thái **CANCELLED**, không còn promotion `Temporary price freshness demo`. Dòng hàng trong giỏ guest thử đã xóa. Đơn hủy và lịch sử thao tác thử được giữ để kiểm tra, không xóa lịch sử đơn hàng.

Demo chạy mã nguồn mới tại backend **3310**, frontend **3311**, dùng DB đang cấu hình của workspace. Dừng các tiến trình demo sau nghiệm thu. Backend có sẵn ở **3000** chạy `dist/src/main` và không bị dừng/thay tiến trình; cần build rồi khởi động lại backend đó để sử dụng code mới trên cổng 3000.

Đã khôi phục các đường dẫn type Next.js tạm trong `tsconfig.json`/`next-env.d.ts`. Cơ chế duyệt tự động từ chối lệnh xóa thư mục build `frontend/.next-price-demo` với lý do `blocked by policy`; cache này được giữ lại và thêm vào `.gitignore`. Đây không phải dữ liệu DB thử chưa hoàn tác.

## Quy ước và điểm cần lưu ý

- Giá giao dịch hiện tại lấy từ **`product_variants.price`**, promotion, hạng thành viên, voucher và xu. `products.base_price`/`sale_price` là trường cấp sản phẩm; sửa riêng hai trường này không tự ghi đè giá các variant. Khi sửa giá bán thực tế qua admin/API/DB cần sửa variant tương ứng.
- Giá catalog là giá một đơn vị, chưa có điều kiện của cả giỏ hàng; checkout quyết định khoản thanh toán cuối. Sự khác nhau do số lượng, điều kiện voucher hoặc hạng thành viên phải được đánh giá trong cùng ngữ cảnh.
- Bỏ cache chứa giá và khóa promotion làm tăng lượt đọc DB/khả năng chờ khóa. Giỏ nhiều dòng không chọn được báo giá theo nhóm giới hạn 5 tác vụ đồng thời. Chưa đo benchmark tải cao; không khẳng định độ trễ không thay đổi.
- Không thêm migration DB cho phần triển khai này. Workspace đã có các thay đổi/migration flash sale từ trước; giữ nguyên chúng.
