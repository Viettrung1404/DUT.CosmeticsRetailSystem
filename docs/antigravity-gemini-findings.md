# GlowUp — Đánh giá độc lập & Phản biện Báo cáo Muse

- **Người rà soát:** Agent Antigravity (Gemini Flash) — Antigravity IDE.
- **Thời gian rà soát:** 14/11/2026.
- **Phạm vi kiểm tra:** Toàn bộ mã nguồn `D:\VS_Code\DUT\PBL6` (Backend NestJS, Frontend Next.js, Mobile Expo) và chạy thử nghiệm live trên 3 server:
  - Backend NestJS (`http://localhost:3000/api/v1/health/ready` → HTTP 200 `ready`)
  - Frontend Next.js Storefront (`http://localhost:3001` → HTTP 200)
  - Mobile Expo Web (`http://localhost:8081` → HTTP 200)
  - Đối chiếu 8 ảnh chụp màn hình trong `C:\Temp\shots\`.

---

## 1. Phản biện và đối chiếu với bản rà soát của Muse (Câu hỏi a)

### 1.1. Đánh giá từng điểm P0 của Muse (Đồng ý / Không đồng ý + Bằng chứng file/dòng)

| Điểm P0 của Muse | Nhận định | Bằng chứng file & dòng trong code | Nhận xét chi tiết của Antigravity |
| :--- | :---: | :--- | :--- |
| **P0.1: Thống nhất ngưỡng freeship** (Header 129k/359k/459k vs Promo 300k vs Engine 500k) | **ĐỒNG Ý (và thực tế còn nghiêm trọng hơn)** | - `frontend/src/widgets/site-shell.tsx:118`: Header announcement hardcode: *"Đơn từ 129k→ Freeship 15k · Đơn từ 359k → Freeship 25k · Đơn từ 459k → Freeship toàn quốc"*.<br>- `frontend/src/features/checkout/checkout-page.tsx:385-386`: Hiển thị chính sách quote: *"Phí tiêu chuẩn 30.000₫. Miễn phí từ 500.000₫"*. <br>- `backend/src/modules/customer-experience/domain/pricing-engine.ts:10-11`: `STORE_SHIPPING_POLICY = { fee: 30000, freeFrom: 500000 }`.<br>- `backend/src/modules/orders/application/services/order-pricing.service.ts:68, 89`: `FREE_SHIPPING_THRESHOLD = 500000`.<br>- `backend/scripts/demo/seed-foundation.cjs:122`: Campaign `FREE_SHIPPING` có `minOrderAmount: 300000`.<br>- `mobile/src/screens/cart/CartScreen.tsx:57`: `FREESHIP_TARGET = 1000000` (1 triệu đồng!).<br>- `mobile/src/screens/cart/CheckoutScreen.tsx:39`: `shippingFee = 0` (Freeship 0đ mọi đơn). | Muse chỉ nêu ra **3 con số**, nhưng thực tế dự án có tới **5 con số freeship mâu thuẫn nhau** trên cùng hệ sinh thái. Người dùng xem header một đằng (129k-459k), vào giỏ hàng web thấy tính theo 500k, giỏ hàng mobile thấy thanh tiến trình 1 triệu đồng, sang checkout mobile lại thấy miễn phí 0đ, còn khuyến mãi demo lại ghi 300k. Cần thống nhất gấp về 1 con số chuẩn duy nhất. |
| **P0.2: Xoá dữ liệu giả trên mobile** (OrderScreen/PDP/Search khởi tạo hardcode, lỗi mạng hiện đơn giả) | **ĐỒNG Ý** | - `mobile/src/screens/order/OrderScreen.tsx:79-140`: Khởi tạo state bằng đơn mẫu `ord-1` (`GLOW-89241`, GHN Express, Shipper Nguyễn Văn Bình). Dòng 207: `if (Array.isArray(list) && list.length > 0)` mới ghi đè. Khách hàng mới tinh không có đơn hoặc mất mạng vĩnh viễn thấy đơn giả như thật.<br>- `mobile/src/screens/product/ProductDetailScreen.tsx:40-53`: Khối `catch` khi API lỗi fallback gán sản phẩm mock `GlowUp Vitamin C Glow Serum` (rating 4.9, 128 review, `variants: []`). Vì `variants: []` rỗng, dòng 116 văng alert *"Sản phẩm hiện chưa có biến thể hợp lệ"* khi bấm thêm giỏ.<br>- `mobile/src/screens/search/SearchScreen.tsx:42, 143, 208-224`: `MOCK_SEARCH_PRODUCTS` được đặt làm state ban đầu và fallback filter khi tìm kiếm rỗng/offline. | Hoàn toàn chính xác. Việc giữ mock data trong state khởi tạo tạo cảm giác app "chắp vá" và gây lỗi logic nghiêm trọng khi test tài khoản thật hoặc offline. Cần thay bằng empty state component (State rỗng kèm icon và nút quay lại mua sắm) và error boundary. |
| **P0.3: Flash sale không thật** (Web đếm ngược đến 2027, mobile đếm ngược 04:23:08 giả không deal) | **ĐỒNG Ý** | - `backend/scripts/demo/fixtures.cjs:5`: `const ACTIVE_END=new Date('2027-10-27T00:00:00Z');` khiến chiến dịch flash sale (`backend/scripts/demo/seed-foundation.cjs:123`) kéo dài hàng nghìn giờ tới tận năm 2027.<br>- `frontend/src/features/catalog/home-motion.tsx:36-75`: Web countdown tính từ `endDate`, dẫn đến đồng hồ đếm ngược hiển thị con số vô lý (hơn 340 ngày/giờ).<br>- `mobile/src/screens/home/HomeScreen.tsx:396`: Hardcode `const [secs, setSecs] = useState(3600 * 4 + 23 * 60 + 15);` (đúng 04:23:15). Dòng 770 bấm vào chỉ gọi `onPress={goToCatalog}` chứ không kết nối với bất kỳ deal flash sale backend nào. | Hoàn toàn chính xác. Cần cập nhật `endDate` trong seed về cuối ngày demo (23:59:59 hôm nay) và đấu nối banner mobile với API `/promotions/flash-sale/cards` để hiển thị đồng bộ. |
| **P0.4: Mobile hardcode IP LAN `192.168.110.249`** | **ĐỒNG Ý** | - `mobile/src/api/apiClient.ts:22`: `return 'http://192.168.110.249:3000/api/v1';`<br>- `mobile/.env.example:5`: `EXPO_PUBLIC_API_URL=http://192.168.110.249:3000/api/v1`<br>- `mobile/.env:3`: `# EXPO_PUBLIC_API_URL=...` (đang bị comment out). | Hoàn toàn chính xác. IP `192.168.110.249` là IP máy trạm cục bộ của Muse. Khi chạy app trên thiết bị thật (Expo Go) hoặc chuyển mạng Wi-Fi khác, mobile sẽ mất kết nối hoàn toàn tới backend. Cần dùng tunnel (ngrok/localtunnel) hoặc cấu hình IP động theo máy chủ. |

---

### 1.2. Những điểm Muse nhận định SAI hoặc LỖI THỜI so với code hiện tại

1. **Nhầm lẫn Next.js Dev Indicator thành lỗi giao diện ứng dụng (P2 #10):**
   - *Muse viết:* *"Web mobile: hero carousel desktop bị cắt chữ... nút tròn 'N' góc dưới-trái che nội dung mô tả trên PDP mobile."*
   - *Kiểm tra thực tế:* Nút tròn chữ "N" ở góc dưới màn hình không phải là code hay icon của GlowUp, mà là **Next.js Dev Indicator** (biểu tượng của framework Next.js trong chế độ phát triển `npm run dev`). Mã nguồn trong `frontend/src/` hoàn toàn không có component hay nút "N" nào. Khi ứng dụng được build và chạy ở môi trường production (`npm run build && npm run start`), Next.js sẽ tự động loại bỏ indicator này. Đây là nhận định nhầm lẫn của Muse.

2. **Chưa thấy được nguyên nhân gốc rễ vì sao SePay Mobile "dở dang" (P2 #12):**
   - *Muse viết:* *"SePay trên mobile dở dang (chọn SEPAY xong không hiện QR/mã chuyển khoản)."*
   - *Kiểm tra thực tế:* Vấn đề trên Mobile nghiêm trọng hơn nhiều việc "thiếu QR". Luồng checkout trên Mobile (`mobile/src/screens/cart/CheckoutScreen.tsx:65-74`) **hoàn toàn không gọi API `/orders/preview` để lấy `quoteVersion`**. Trong khi đó, Backend NestJS (`backend/src/modules/orders/application/services/commerce-checkout.service.ts:294`) bắt buộc:
     ```typescript
     if (!input.quoteVersion) throw new BadRequestException("PRICE_QUOTE_REQUIRED");
     ```
     Điều này đồng nghĩa với việc: Khi người dùng bấm "Đặt hàng" trên Mobile (cho dù chọn COD hay SePay), backend sẽ **từ chối ngay lập tức với mã lỗi HTTP 400 `PRICE_QUOTE_REQUIRED`**. Đơn hàng thực tế chưa hề được tạo thành công trong cơ sở dữ liệu, nên Mobile không thể có mã đơn thật hay thông tin thanh toán thật để sinh mã QR.

3. **Nghi ngờ chưa đúng về rủi ro deadlock Flash Sale và Webhook Duplication (§4):**
   - *Muse viết:* *"Rủi ro cần soi thêm trước khi kết luận: chống duplicate webhook (đã có PaymentWebhookInbox nhưng chưa kiểm tra handler), row-lock khi giữ quota flash sale, worker huỷ đơn treo..."*
   - *Kiểm tra thực tế:*
     - **Flash Sale Concurrency:** Backend GlowUp xử lý cực kỳ chuẩn xác tại `backend/src/core/services/promotion-lifecycle.ts:28-47`. Hệ thống sử dụng câu lệnh SQL UPDATE nguyên tử có điều kiện trừ tồn kho trực tiếp:
       ```sql
       UPDATE promotion_variant_quotas SET reserved_quantity=reserved_quantity+$line.quantity
       WHERE id=$line.quotaId AND quota-reserved_quantity-consumed_quantity>=$line.quantity
       ```
       Đồng thời, danh sách quota được sắp xếp theo thứ tự `quotaId` (`sort((a, b) => a.quotaId.localeCompare(b.quotaId))`), loại trừ hoàn toàn nguy cơ deadlock khi nhiều người dùng cùng tranh mua flash sale.
     - **Idempotency Webhook:** `backend/src/modules/payments/application/services/payments.service.ts:317` lưu vào `payment_webhook_inbox` có hash kiểm tra trùng lặp (`payload_hash`), xác thực chữ ký HMAC-SHA256 và giới hạn thời gian 300 giây (`sepay-adapter.ts:114-122`), có integration test chứng minh webhook gọi lại không bị duplicate charge.
     - **Hủy đơn hết hạn:** `CancelExpiredOrdersUseCase` chỉ hủy đơn COD pending quá 30 phút. Đơn online do `PaymentWorker` quản lý độc lập với thời hạn 15 phút + 60s ân hạn (grace period) nếu có chứng từ chuyển tiền hợp lệ, và tự động tạo giao dịch hoàn tiền thủ công nếu tiền về trễ sau khi đơn đã hủy. Kiến trúc thanh toán backend thực tế rất chặt chẽ.

4. **Nhận định "Không có xu kiểu Shopee" (§1 P1 #8):**
   - *Muse viết:* *"không có xu kiểu Shopee (chỉ có điểm loyalty đổi voucher)"*.
   - *Kiểm tra thực tế:* Hệ thống Loyalty Points trong backend đã hỗ trợ cơ chế trừ tiền trực tiếp vào đơn hàng (`point_value_vnd: 1` tức 1 điểm = 1 VNĐ tại `backend/src/core/utils/loyalty-policy.util.ts`). Trong `CommerceCheckoutService` (dòng 338-348 và 403-418), điểm được quy đổi thành tiền mặt (`pointsDiscount`) và trừ thẳng vào tổng tiền thanh toán của đơn hàng giống hệt Shopee Xu, chứ không chỉ dùng để đổi voucher. Web checkout cũng đã tích hợp cơ chế này (`effectivePoints`).

---

## 2. Các điểm chưa hợp lý quan trọng mà Muse bỏ sót (Câu hỏi b)

Qua rà soát độc lập chuyên sâu, Antigravity phát hiện thêm **6 điểm bất hợp lý lớn** mà Muse chưa đề cập:

### Phát hiện mới 1: Đứt gãy hoàn toàn hợp đồng Checkout trên Mobile (`PRICE_QUOTE_REQUIRED`)
- **Vị trí code:**
  - `mobile/src/screens/cart/CheckoutScreen.tsx:65-74`
  - `backend/src/modules/orders/application/services/commerce-checkout.service.ts:294`
- **Chi tiết:** Mobile `CheckoutScreen` gọi trực tiếp `orderApi.createOrder()` mà không gọi `orderApi.previewOrder()`. Do đó payload gửi lên backend không có trường `quoteVersion`. Backend commerce ném ra ngoại lệ `BadRequestException("PRICE_QUOTE_REQUIRED")`.
- **Hậu quả:** Toàn bộ chức năng Đặt hàng trên Mobile hiện đang bị chặn đứng 100% khi backend chạy `CommerceCheckoutService`.

### Phát hiện mới 2: Lỗi logic hiển thị kết quả tìm kiếm rỗng trên Mobile (`SearchScreen`)
- **Vị trí code:** `mobile/src/screens/search/SearchScreen.tsx:206-215`
- **Chi tiết:** Khi người dùng nhập một từ khóa tìm kiếm không tồn tại trên hệ thống (hoặc gõ chuỗi ngẫu nhiên không có sản phẩm nào), code xử lý:
  ```typescript
  } else {
    // Fallback filter trên mock data
    const filtered = MOCK_SEARCH_PRODUCTS.filter(...);
    setResults(filtered.length > 0 ? filtered : MOCK_SEARCH_PRODUCTS);
  }
  ```
- **Hậu quả:** Thay vì hiển thị thông báo "Không tìm thấy sản phẩm phù hợp", app lại lấy toàn bộ 4 sản phẩm mock hiển thị ra màn hình! Người dùng tìm "áo thun" hay chuỗi rác "asdfg" đều thấy son kem lì và serum vitamin C.

### Phát hiện mới 3: Mobile hoàn toàn không có tính năng xem hoặc gửi Đánh giá (Reviews)
- **Vị trí code:** `mobile/src/screens/product/ProductDetailScreen.tsx:187`
- **Chi tiết:** Trong khi backend có module Reviews rất công phu (histogram sao, kiểm duyệt, gắn đơn hàng đã mua) và Web có tab review + form gửi review, thì trên Mobile:
  - Hoàn toàn không gọi API `GET /customer/products/:id/reviews`.
  - Không có danh sách đánh giá của khách hàng trên PDP.
  - Không có chức năng đánh giá đơn hàng sau khi hoàn tất (Delivered).
  - PDP chỉ hiển thị một dòng text tĩnh fallback `5.0 (0 đánh giá)`.

### Phát hiện mới 4: Ràng buộc hoàn thành đơn hàng tại 1 chi nhánh duy nhất (Fulfillment Bottleneck)
- **Vị trí code:** `backend/src/modules/orders/application/services/store-resolver.service.ts:79-93`
- **Chi tiết:** Khi đặt hàng online có nhiều sản phẩm, `StoreResolverService` duyệt từng cửa hàng/kho và kiểm tra:
  ```typescript
  if (isSufficient) { return store.id; }
  // ...
  throw new BadRequestException('Rất tiếc, sản phẩm trong đơn hàng hiện không còn đủ tồn kho tại bất kỳ chi nhánh nào để giao hàng');
  ```
- **Hậu quả:** Nếu khách mua 2 món A và B: Kho Tân Bình chỉ có món A, Kho Quận 1 chỉ có món B, thì đơn hàng sẽ bị từ chối với thông báo hết hàng, mặc dù toàn hệ thống vẫn đủ hàng. Hệ thống không có cơ chế chuyển kho nội bộ hoặc tách đơn (split order) như Shopee/Hasaki.

### Phát hiện mới 5: Bất đồng bộ trạng thái giữa hai route Wishlist trên Web
- **Vị trí code:**
  - `frontend/src/app/(site)/(storefront)/wishlist/page.tsx`
  - `frontend/src/app/(site)/(account)/account/wishlist/page.tsx`
- **Chi tiết:** Frontend tồn tại 2 trang riêng biệt cho Wishlist sử dụng 2 cách quản lý state và cache khác nhau. Khi người dùng bấm lưu yêu thích ở trang chủ hoặc PDP, dữ liệu trên Drawer cập nhật nhưng trang `/account/wishlist` không đồng bộ realtime nếu không tải lại trang.

### Phát hiện mới 6: Giỏ hàng khách vãng lai (Guest Cart) và nguy cơ mất dấu vết đơn hàng
- **Vị trí code:** `backend/src/modules/orders/application/services/commerce-checkout.service.ts:157-190`
- **Chi tiết:** Khách vãng lai được phép đặt hàng qua `sessionId`. Tuy nhiên, sau khi hoàn tất đơn hàng, hệ thống không gửi mã tra cứu bảo mật qua SMS/Email hoặc liên kết với số điện thoại để tra cứu công khai. Nếu người dùng xóa cache trình duyệt hoặc đổi thiết bị, họ hoàn toàn mất khả năng theo dõi đơn hàng đã đặt.

---

## 3. Top 5 việc ưu tiên cần sửa trong 1 tuần trước buổi Demo / Bảo vệ (Câu hỏi c)

Nếu chỉ có quỹ thời gian **1 tuần** để chuẩn bị cho buổi demo/bảo vệ dự án, đây là 5 hạng mục mang tính sống còn cần sửa ngay:

### 1. Khắc phục luồng Checkout trên Mobile: Tích hợp Preview lấy `quoteVersion` & Bổ sung VietQR SePay
- **Lý do chọn:** Luồng thanh toán là trái tim của ứng dụng E-commerce. Hiện tại bấm đặt hàng trên Mobile bị lỗi 400 `PRICE_QUOTE_REQUIRED` do thiếu `quoteVersion`. Đồng thời chọn SePay không hiện thông tin tài khoản hay mã VietQR. Sửa lỗi này giúp buổi demo có thể diễn ra trọn vẹn từ bước chọn hàng đến thanh toán thành công trên cả Web và Mobile.
- **Cách sửa nhanh:**
  - Trong `mobile/src/screens/cart/CheckoutScreen.tsx`: Trước khi submit, gọi `orderApi.previewOrder()` lấy `quoteVersion` và phí ship thật; truyền `quoteVersion` vào payload `createOrder`.
  - Trong `mobile/src/screens/cart/OrderSuccessScreen.tsx`: Khi phương thức là `SEPAY`, hiển thị ảnh VietQR động (`https://vietqr.app/img/...` theo mẫu của Web tại `frontend/src/features/checkout/sepay-transfer.ts`) kèm STK, tên chủ tài khoản và cú pháp chuyển khoản.

### 2. Thống nhất chính sách Freeship xuyên suốt 3 tầng (Web, Mobile, Backend)
- **Lý do chọn:** Điểm mâu thuẫn này đập ngay vào mắt người dùng và hội đồng phản biện. Hiện có tới 5 con số khác nhau (129k-459k trên header web, 500k trên engine, 300k trên promo seed, 1 triệu trên mobile cart, 0đ trên mobile checkout).
- **Cách sửa nhanh:**
  - Thống nhất chọn một quy chuẩn rõ ràng: **"Miễn phí giao hàng cho đơn từ 300.000₫, phí tiêu chuẩn 30.000₫"**.
  - Cập nhật text tại `frontend/src/widgets/site-shell.tsx:118`.
  - Đồng bộ `STORE_SHIPPING_POLICY.freeFrom = 300000` trong `pricing-engine.ts:11` và `order-pricing.service.ts:68`.
  - Đổi `FREESHIP_TARGET = 300000` trong `mobile/src/screens/cart/CartScreen.tsx:57` và tính phí ship thật trên `mobile/src/screens/cart/CheckoutScreen.tsx`.

### 3. Xoá bỏ toàn bộ mock data trên Mobile và thay bằng Empty State / Error State chuẩn
- **Lý do chọn:** Khi ban giám khảo yêu cầu tạo tài khoản mới và thao tác, nếu vào tab "Đơn hàng" lại thấy sẵn đơn của "Nguyễn Văn Bình - GHN", hoặc search từ khóa không có lại văng ra 4 sản phẩm mock, sẽ bị đánh giá là ứng dụng chạy demo giả lập (hardcoded prototype) chứ không phải sản phẩm thật.
- **Cách sửa nhanh:**
  - `mobile/src/screens/order/OrderScreen.tsx`: Đặt initial state `orders = []`. Khi API trả về mảng rỗng, hiển thị component `EmptyOrdersView` ("Bạn chưa có đơn hàng nào" + nút "Khám phá sản phẩm").
  - `mobile/src/screens/search/SearchScreen.tsx`: Bỏ mảng `MOCK_SEARCH_PRODUCTS`. Khi kết quả tìm kiếm bằng 0, hiển thị giao diện "Không tìm thấy sản phẩm cho từ khóa '{keyword}'".
  - `mobile/src/screens/product/ProductDetailScreen.tsx`: Xóa mock product trong `catch`, thay bằng thông báo lỗi kết nối và nút "Thử lại".

### 4. Đấu nối Flash Sale thật cho Mobile & Cập nhật thời hạn chiến dịch trong ngày Demo
- **Lý do chọn:** Tính năng Flash Sale là điểm nhấn hấp dẫn nhất của sàn thương mại điện tử. Hiện Web đếm ngược đến năm 2027 (347 ngày), còn Mobile đếm ngược con số giả 04:23:15 không có API.
- **Cách sửa nhanh:**
  - Trong dữ liệu demo (`backend/scripts/demo/fixtures.cjs` hoặc seed): Đặt `endDate` của promotion Flash Sale kết thúc vào 23:59:59 của chính ngày diễn ra buổi demo bảo vệ. Khi đó đồng hồ trên Web sẽ đếm lùi chân thực (ví dụ: Còn 5 giờ 30 phút).
  - Trong `mobile/src/screens/home/HomeScreen.tsx`: Đấu nối `FlashDealBanner` gọi API `GET /promotions/flash-sale/cards` để lấy thời gian kết thúc thật và dẫn người dùng sang màn hình xem các sản phẩm flash sale giảm giá thật.

### 5. Bổ sung Script Seed dữ liệu chân thực cho Đánh giá & Số lượng đã bán (`totalSold`, `avgRating`, `totalReviews`)
- **Lý do chọn:** Toàn bộ 350 sản phẩm hiện tại đều có `0.0 (0 đánh giá)` và `0 đã bán`. Giao diện tìm kiếm, danh mục và chi tiết sản phẩm trông như một website mới tạo chưa có hoạt động mua bán, làm giảm hẳn tính thuyết phục của buổi bảo vệ.
- **Cách sửa nhanh:**
  - Viết một script seed bổ sung (hoặc cập nhật trực tiếp DB demo) để cập nhật trường `total_sold` (từ 20 - 1.500 sản phẩm), `avg_rating` (từ 4.2 - 5.0), và `total_reviews` (từ 5 - 150 đánh giá) cho khoảng 50 sản phẩm nổi bật.
  - Tạo sẵn 30-50 đánh giá mẫu (kèm nội dung phản hồi của admin) ở trạng thái `is_approved = true`.
  - Hiển thị thông số `totalSold` lên `ProductCard` trên web và mobile (ví dụ: "Đã bán 1.2k"). Điều này làm giao diện sống động và chuyên nghiệp như Shopee/Hasaki ngay lập tức.
