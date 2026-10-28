# Dữ liệu demo GlowUp

Bổ sung dữ liệu vận hành cho catalog 350 sản phẩm, 5 cửa hàng và 1 kho.
Không seed lại role/permission. Tài khoản, khách hàng và sản phẩm có sẵn được
đối chiếu với snapshot trước khi chạy.

Đã chạy ngày 27/10/2026: 19 phép đối soát đạt; chạy lại foundation và scenario
không tăng số bản ghi. Catalog vẫn đủ 350 sản phẩm/1.037 biến thể/975 ảnh.
Đợt bổ sung kết thúc ngày 28/10/2026: có 29 danh mục (4 cha, 25 con),
102 thương hiệu; 85 có website, 79 có quốc gia, 47 có logo và 36 có banner.
Ảnh thương hiệu và 3 banner GlowUp đã lưu trên R2.
350/350 sản phẩm có tag (1.404 liên kết); 215 sản phẩm có thành phần
(831 dòng), trong đó 23 dòng có nồng độ được công bố.

26 phụ kiện/vật liệu không gán công thức mỹ phẩm. 109 sản phẩm còn lại chưa
có thông tin thành phần xác thực trong nguồn đã kiểm tra; tên, URL nguồn,
trường thiếu và lý do nằm trong `.demo-data/enrichment-gaps.json`.
Các trường chưa đủ bằng chứng được giữ `null`, không suy đoán xuất xứ/nồng độ,
không lấy logo công ty mẹ hoặc ảnh sản phẩm thay logo thương hiệu.

Xem tổng quan: chạy `node scripts/demo/build-preview.cjs`, sau đó
`npm run catalog:serve` và mở `http://localhost:4010/demo`.

## Nguồn và cách tạo dữ liệu

| Nhóm bảng | Cách bổ sung |
| --- | --- |
| `products`, `product_variants`, `product_images`, `product_ingredients`, `product_tags`, `categories` | Pipeline `scripts/catalog`: dữ liệu công khai Beauty Box; ảnh studio tải cục bộ rồi upload R2; mỗi sản phẩm có nhiều ảnh. |
| `brands` | Website hãng được rà từ `brand-sources.json`, lưu bản đọc tại `.demo-data/official-brands.json`. Logo hãng được duyệt trực quan và khóa SHA-256 trong `logo-review.json`. Xuất xứ có nguồn trong `reviewed-origins.json` hoặc phần giới thiệu thương hiệu của Beauty Box. Phân biệt nơi sáng lập thương hiệu với nơi sản xuất/trụ sở hiện nay. |
| `stores`, `inventory`, `batches`, `inventory_transactions` | Catalog seed tạo 5 cửa hàng + 1 kho và tồn đầu kỳ; demo ghi thêm biến động từ bán hàng, nhận hàng và trả hàng. |
| `users`, `user_stores`, `customers`, `customer_addresses` | 34 tài khoản demo riêng, gồm 14 nhân viên và 20 khách; 25 địa chỉ giả lập. Email thuộc `demo.glowup.test`. |
| `employees`, `departments`, `shifts`, `attendance` | 14 nhân viên, 4 phòng ban, 12 ca và 98 dòng chấm công. |
| `suppliers` | 5 nhà cung cấp giả lập, tên ghi rõ demo; không lấy danh tính hoặc tài khoản ngân hàng thật. |
| `settings`, `loyalty_tiers` | 5 cấu hình đúng schema service; tái sử dụng 4 hạng thành viên có sẵn. |
| `pages`, `faqs`, `blog_categories`, `blog_posts`, `banners` | Nội dung GlowUp tự soạn: 8 trang, 15 FAQ, 3 chuyên mục, 8 bài, 3 banner hồng dùng ảnh catalog. Không sao chép chính sách của nhà bán lẻ nguồn. |
| `promotions`, `promotion_variant_quotas`, `coupons` | 4 chương trình, 3 quota flash sale, 5 coupon cơ sở; có cả chương trình hết hạn và coupon cá nhân. Một quota có ngân sách 2 suất, cả 2 đã tiêu thụ qua đơn demo: còn 0, checkout không áp dụng ưu đãi đã hết suất. |
| `promotion_allocations`, `promotion_order_usages`, `coupon_usage` | Sinh qua checkout và vòng đời đơn; bộ đếm khớp sử dụng thực tế, không tự đặt used_count. |
| `orders`, `order_items`, `order_item_batches`, `order_status_history`, `payments` | 20 đơn online/nhận tại cửa hàng, 10 đơn POS, 2 đơn đổi hàng; đủ trạng thái và truy vết lô FEFO. Thanh toán tiền mặt/COD giả lập. |
| `pos_sessions`, `commissions` | 5 ca POS đã đóng/đối soát, hoa hồng phát sinh qua service bán hàng. |
| `purchase_orders`, `purchase_order_items`, `supplier_payments` | 5 PO: nháp, gửi, xác nhận, nhận đủ, nhận một phần; thanh toán nhà cung cấp chờ xử lý. |
| `inventory_transfers`, `inventory_transfer_items`, `stocktakes`, `stocktake_items` | 5 yêu cầu điều chuyển, 3 phiếu kiểm kê nháp. Chưa tạo biến động kho vì module xử lý chưa triển khai. |
| `shipments`, `shipment_events` | Vận đơn DEMO và sự kiện từ trạng thái đơn; không gọi hãng vận chuyển. |
| `return_orders`, `return_order_items`, `return_status_history`, `refunds` | 4 yêu cầu: hoàn một phần đã xử lý, hoàn chờ duyệt, hai ca đổi hàng; nhập lại đúng lô gốc khi kiểm tra đạt. |
| `exchange_items`, `exchange_settlements`, `exchange_funding` | Hai trường hợp tín dụng đủ và cần thu thêm COD; chạy quote, accept, giao hàng và quyết toán qua service. |
| `loyalty_points_transactions`, `loyalty_redemptions` | Điểm mở đầu ghi sổ, điểm mua/hoàn/hủy và 3 lần đổi thưởng; số dư đối chiếu sổ điểm. |
| `carts`, `cart_items`, `wishlists`, `reviews` | 10 giỏ/20 dòng, 40 yêu thích, 8 đánh giá gắn đơn đã mua (6 duyệt, 2 chờ). Nội dung đánh giá ghi rõ giả lập. |
| `invoices`, `invoice_items` | 5 hóa đơn nháp DEMO; chưa phát hành, chưa gọi nhà cung cấp hóa đơn điện tử. |
| `notifications`, `command_receipts`, `audit_logs`, `email_outbox`, `catalog_index_jobs`, `public_cache_revision` | Sinh theo thao tác/service; email demo được CANCELLED ngay trong transaction để không gửi ra ngoài. |
| `roles`, `permissions` | Giữ nguyên. |
| `user_sessions`, `user_devices`, `user_oauth_accounts`, `oauth_pending_identities`, `verification_tokens` | Chỉ sinh từ đăng nhập, thiết bị hoặc OAuth thật; không seed thông tin xác thực giả. |
| `payment_charges`, `payment_webhook_inbox` | Chờ giao dịch/webhook sandbox thật; không giả chứng từ từ cổng thanh toán. |
| `broadcast_sends`, `broadcast_recipients`, `push_deliveries` | Chỉ sinh khi người dùng thực hiện chiến dịch/gửi push; không tạo lịch sử gửi giả. |
| `return_attachments` | Chờ tệp đính kèm thật; không dùng ảnh catalog làm bằng chứng trả hàng. |
| `_prisma_migrations` | Prisma quản lý. |

## Chạy

Từ thư mục `backend`, dùng `.env` hiện có với Database/R2. Catalog phải đã seed.

```powershell
npm run demo:brands
npm run demo:assets
npm run demo:upload
npm run seed:foundation
npm run seed:scenarios
npm run demo:test
npm run demo:verify
```

Để bổ sung catalog hiện có, chạy từ `backend`:

```powershell
npm run demo:brands:official
npm run demo:ingredients:official
npm run demo:logos:review
# Mở .demo-data/official-logo-review.png; chỉ giữ logo thật của đúng thương hiệu.
# Khi nguồn ảnh thay đổi, cần duyệt lại và cập nhật SHA-256 trong logo-review.json.
npm run demo:upload
npm run catalog:enrich:preview
npm run catalog:enrich
npm run seed:quota:exhausted
npm run catalog:enrich:verify
npm run demo:verify
npm run catalog:verify
node scripts/demo/build-preview.cjs
```

`catalog:enrich` bổ sung metadata còn trống, đồng bộ thành phần/tag do pipeline
quản lý và sửa 3 sản phẩm phụ kiện đang nằm sai danh mục. Thêm danh mục
**Bông tẩy trang**, ảnh đại diện và metadata cho cây danh mục. Không đổi ID/SKU,
biến thể, ảnh sản phẩm, tồn kho hoặc đơn đã có. Dữ liệu trước khi sửa được lưu
ở `.demo-data/enrichment-before.json` và `catalog-before-enrichment.json`.

Các bảng thành phần từ hãng nằm trong `official-ingredients.json` và
`reviewed-product-ingredients.json`; phần trích xuất ghi lại câu bằng chứng,
URL và phạm vi trong `.demo-data/enrichment-manifest.json`.
Thông tin thành phần nổi bật không được coi là công thức INCI đầy đủ.
Một trường hợp nồng độ mâu thuẫn trong mô tả được giữ `null`; không đổi ppm
sang phần trăm khi nguồn không công bố trực tiếp.

Kết quả `.demo-data/enrichment-verification.json`: 16 kiểm tra đạt, cộng kiểm tra
chạy lặp so sánh SHA-256 toàn bộ metadata/ingredients/tags/category/quota.
Chạy lại không thay đổi bản ghi. `seed:quota:exhausted` không bịa bộ đếm mà
đối chiếu hai suất đã tiêu thụ với allocation từ đơn demo, rồi gọi checkout
để xác nhận không áp dụng flash sale đã hết quota.

`demo:assets` cần Playwright trong frontend. Collector cache dữ liệu và ảnh,
upload dùng SHA-256; seed dùng ID cố định, receipt và checkpoint để chạy tiếp
sau lỗi. Không xóa checkpoint `.demo-data/scenarios.json` khi dữ liệu demo vẫn
còn trong DB. Không truncate bảng hoặc reset số dư khi chạy lại.

Tài khoản/mật khẩu ngẫu nhiên nằm trong `.demo-data/credentials.json` (gitignore).
Không commit hoặc phục vụ tệp này qua HTTP. Báo cáo tại
`.demo-data/verification-report.json`; snapshot bảo vệ dữ liệu cũ tại
`.demo-data/protected-before.json`.

Các khoản thu/hoàn tiền là mô phỏng nội bộ, không chuyển tiền. Runner chỉ nạp
service cần dùng, không khởi động worker hoặc adapter vận chuyển/thanh toán.
Kiểm thử đối soát tồn kho/lô/sổ kho, hàng giữ chỗ, dòng tiền, điểm thưởng,
coupon/khuyến mãi, đánh giá và hóa đơn nháp. Bộ dữ liệu phục vụ phát triển/demo.

Trong khi chạy scenario đã sửa lỗi kiểm tra thanh toán đơn đổi hàng: khoản COD
chờ thu được tính khi xử lý/giao hàng, được ghi nhận khi DELIVERED; COMPLETED
vẫn yêu cầu tiền đã thu cộng tín dụng đổi hàng đủ tổng đơn. Có kiểm thử hồi quy
tại `exchange-cod-status.spec.ts`; hai suite liên quan đạt 13 kiểm thử.
