# Chiến dịch Flash Sale GlowUp 2026–2030

Chiến dịch bắt đầu lúc 00:00 ngày 26/11/2026 và kết thúc lúc 00:00 ngày 01/01/2031, theo múi giờ `Asia/Ho_Chi_Minh`. Khoảng thời gian áp dụng là nửa mở `[start, end)`.

## Khung giờ và sản phẩm nổi bật

Mỗi ngày có 12 khung liên tiếp, gồm 00–02, 02–04, 04–06, 06–08, 08–10, 10–12, 12–14, 14–16, 16–18, 18–20, 20–22 và 22–24 giờ. DB lưu 12 lịch lặp hằng ngày cùng bảng giá biến thể, nên lịch vẫn chạy đến hết năm 2030 mà không phải seed thêm mỗi tuần.

Toàn bộ 350 sản phẩm và 1.039 biến thể đang bán có giá thường và giá nổi bật riêng trong từng khung. Trong mỗi khung, đúng 20 sản phẩm cha được chọn cho giá nổi bật. Tất cả biến thể của sản phẩm nổi bật dùng giá nổi bật của chính biến thể đó. Các sản phẩm còn lại dùng giá sale thường.

Danh sách sản phẩm được sắp theo ID ổn định. Với ngày thứ `D` tính từ 26/11/2026 và khung thứ `S` từ 0 đến 11, nhóm nổi bật bắt đầu ở chỉ số `(D × 12 + S) × 20 mod 350`, lấy 20 sản phẩm liên tiếp và vòng lại khi tới cuối danh sách. Mọi sản phẩm đều có lượt nổi bật trong vòng hai ngày. Trang chủ lấy 10 sản phẩm, trang flash sale lấy tối đa 20 sản phẩm nổi bật, mỗi sản phẩm cha một card. Chỉ sản phẩm có tồn kho và còn quota mới được đưa vào card mua hàng.

## Tham khảo Beauty Box và cách chọn giá

Script nghiên cứu đọc dữ liệu công khai của các trang sản phẩm Beauty Box theo danh mục nguồn có sẵn của dự án, rồi đối chiếu mã biến thể `GU-V-<source variant ID>`. Báo cáo lưu URL và thời điểm lấy giá của từng biến thể.

`referencePrice` và `referenceOriginalPrice` là các trường giá của đúng biến thể trên nguồn. `referenceProductPrice` và `referenceProductDiscount` là mức giá hiện tại và phần trăm giảm ở cấp sản phẩm trên Beauty Box. Giá cấp sản phẩm có thể là mức thấp nhất trong nhiều biến thể, nên được lưu riêng để đọc đúng ngữ cảnh. Ví dụ [Amuse Lip & Cheek Healthy Balm 3g](https://beautybox.com.vn/products/son-moi-ma-hong-amuse-lip-cheek-healthy-balm-3g) có mức giảm ở cấp sản phẩm, trong khi trường giá từng biến thể có thể vẫn bằng giá niêm yết.

Mức giảm mục tiêu thường dựa trên mức giảm quan sát được từ nguồn, trừ 8 điểm phần trăm, chặn trong khoảng 12–30%, rồi phân bổ thêm 0–8 điểm theo sản phẩm, biến thể và khung. Nếu nguồn không có mức giảm, mốc tham chiếu là 15%. Mức nổi bật giảm thêm khoảng 14 điểm phần trăm so với mục tiêu thường. Đây là thiết kế ưu đãi của GlowUp dựa trên nguồn tham khảo. Giá bán gốc trong DB được giữ làm cơ sở tính mức giảm thực tế.

Giá cuối được chọn từ các mức đuôi 5.000đ hoặc 9.000đ gần mục tiêu nhất. Bộ phân bổ đảm bảo giá khác nhau giữa các biến thể trong cùng sản phẩm, riêng cho từng chế độ thường/nổi bật. Giá nổi bật luôn thấp hơn giá thường, và giá thường thấp hơn giá gốc ít nhất 12%. Phần trăm thực tế được tính ngược từ giá cuối.

Ngoại lệ được đánh dấu `1000-low-price-many-variants` trong CSV. Những sản phẩm có nhiều biến thể và giá thấp không có đủ mức đuôi 5.000đ/9.000đ để phân bổ riêng, nên dùng bước 1.000đ. Ví dụ nhóm mặt nạ 24.000–29.000đ có bảy biến thể. Trường `referenceStatus` phân biệt dữ liệu nguồn trực tiếp, snapshot lịch sử và biến thể chưa tìm được tham chiếu.

Giá vốn trong dữ liệu demo là ước tính từ seed cũ, nên báo cáo này chưa xác nhận biên lợi nhuận từ giá nhập thực tế.

## Tệp chi tiết

- [variant-prices.csv](variant-prices.csv) chứa 12.468 dòng, đủ từng sản phẩm, từng biến thể và từng khung giờ, với giá thường, giá nổi bật, phần trăm giảm, quy tắc làm tròn và nguồn tham khảo.
- [plan.json](plan.json) chứa dữ liệu đầy đủ và thứ tự 350 sản phẩm dùng để tính luân phiên.
- [verification.json](verification.json) ghi kết quả đối chiếu SQL, checkout và lịch 7 ngày.
- [product-summary.md](product-summary.md) tổng hợp phạm vi giá của từng sản phẩm.

## Hiển thị, thanh toán và quota

DB lưu giá đích trên `promotion_variant_quotas`. Hàm `sprint5_variant_price` và bộ máy checkout cùng chọn khung, cùng tính nhóm nổi bật và dùng đúng giá đích. Checkout tính giảm theo số lượng từng dòng, giữ quota bằng cơ chế allocation hiện có và kiểm tra lại `quoteVersion` khi tạo đơn. Đơn đã tạo giữ snapshot giá đã xác nhận. Khi đổi khung, giá mới được kiểm tra ở lần preview/checkout tiếp theo.

Mỗi quota lịch được đặt ngân sách 100.000.000 đơn vị cho toàn thời hạn để lịch demo không hết lượt sau vài giao dịch. Đây là ngân sách chiến dịch, không phải tồn kho hay số lượng đã bán. Tồn kho thật vẫn giới hạn số lượng mua được. Seed không tạo số đã bán giả, không reset số đã giữ/đã sử dụng và không xóa lịch sử allocation. Campaign cũ theo giờ và campaign nền của demo được tắt khi áp dụng lịch mới.

Coupon, điểm và quyền lợi hạng khách hàng tiếp tục được tính theo quy tắc checkout hiện có. Giá cuối đơn hàng còn có thể thay đổi theo các quyền lợi này và phí vận chuyển.

## Chạy lại

Trong thư mục `backend`, sau khi áp dụng migration và sinh Prisma Client, chạy lần lượt

```powershell
node scripts/demo/research-flash-prices.cjs
node scripts/demo/seed-recurring-flash-sale.cjs
node scripts/demo/seed-recurring-flash-sale.cjs --apply
node --env-file=.env scripts/demo/verify-recurring-flash.cjs
```

Lệnh seed không có `--apply` chỉ xuất bảng giá để xem trước. Nếu thêm sản phẩm/biến thể, cần chạy lại kế hoạch để đưa chúng vào lịch và cập nhật số lượng sản phẩm dùng cho luân phiên. Khởi động lại backend sau khi seed để xóa cache giá cũ. `seed-rich-promotions.cjs` và `extend-flash-sale.cjs` được giữ làm lệnh tương thích, cùng áp dụng seed lịch mới.
