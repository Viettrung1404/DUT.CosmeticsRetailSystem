# Sprint 5 — Backend end-user

Triển khai trên `feat/be-sprint5`, kế thừa commit Sprint 4 `5e157d4`. Phạm vi theo [planning Sprint 5](../../docs/3-planning/10_sprint_5_viet_trung_backend_enduser.md). Module mới: `customer-experience`; checkout dùng `CommerceCheckoutService`; migration mới: `20261025000000_customer_sprint5`.

Runtime tối thiểu **Node.js 22.12.0**, đã kiểm chứng trên 22.14.0. Sanitizer khóa ở `sanitize-html@2.18.1`; Jest chỉ transform thêm nhóm dependency HTML parser ESM bằng ts-jest `allowJs`, không nới allowlist HTML của ứng dụng.

Đây là đầu ra triển khai backend và kiểm chứng local. Chưa thay thế nghiệm thu Admin/POS, Web/Mobile, FCM/Elasticsearch thật hoặc thanh toán sandbox. Nhánh Sprint 4 hiện chưa chứa module thanh toán Sprint 3; checkout Sprint 5 cho COD, phương thức online trả `503 ONLINE_PAYMENT_MODULE_REQUIRED`, không tạo giao dịch giả.

## Chính sách đã được người dùng chốt

- Giá gốc lấy từ `ProductVariant.price`. `Product.salePrice` nhập tay không tham gia tính giá; response catalog trả lại `salePrice` theo engine để client cũ không hiển thị giá nhập tay sai.
- Mỗi dòng chọn mức tốt hơn giữa tier và promotion đủ điều kiện; hòa chọn tier, giữa các promotion hòa chọn ID nhỏ hơn. Không cộng tier với promotion. Tier thắng không giữ quota.
- `minOrderAmount` của campaign xét trên subtotal gốc toàn đơn. Discount/cap campaign phân bổ một lần trên tổng dòng hợp lệ, không áp cap lại cho từng dòng. Phạm vi là OR của danh sách product/category; cả hai rỗng nghĩa là toàn catalog. Danh mục là ID chính xác; không ngầm mở rộng campaign sang danh mục con.
- Sau giảm dòng, tối đa một coupon, rồi dùng điểm. Coupon có cap riêng, kể cả cap bằng 0. Coupon liên kết campaign phải còn hiệu lực/đủ minimum/phạm vi; không kế thừa cap campaign. Coupon gắn Flash Sale bị từ chối, tránh dùng coupon như một đường bỏ qua quota variant.
- Phí giao hàng 30.000đ, miễn từ 500.000đ trên giá trị hàng sau toàn bộ giảm giá/điểm; campaign FREE_SHIPPING chỉ giảm phí giao hàng. Tax bằng 0 theo luồng hiện có. Điểm dùng giá trị đã cấu hình ở Sprint 4, chỉ trừ số nguyên thực sự sử dụng.
- Quota giữ lúc tạo đơn, consume khi CONFIRMED; hủy trước fulfillment hoàn cả RESERVED/CONSUMED đúng một lần. RMA không mở lại quota đã tiêu thụ. Campaign usage tính một lượt/order/campaign, kể cả nhiều dòng cùng campaign.
- Tiền dùng Prisma Decimal, làm tròn giảm xuống 2 chữ số thập phân; phân bổ phần lẻ theo helper Sprint 4, giữ tổng coupon/điểm/cash và số điểm nguyên. Snapshot giữ `version: 1` để tương thích RMA, thêm `policy: SPRINT5`, original/effective price, promotion/tier/coupon/point breakdown và quote hash.

## API và tích hợp client

Prefix `/api/v1`, envelope `{statusCode, success, message, data}`. Swagger `/api/docs`; request, response và errors được khai báo trong source. Customer cần user ACTIVE, role Customer và customer profile. Public response không trả email/phone/orderId của reviewer, giá vốn hoặc device token.

| Method/path | Nội dung |
|---|---|
| `POST /reviews` | productId, optional orderId, rating 1–5, title/content; chỉ đơn COMPLETED của owner có product; review pending, duplicate 409 |
| `GET /customer/products/:id/reviews` | page/limit/rating/sort; review approved, histogram, totalReviews, avgRating; id UUID |
| `GET /pages/:slug` | Chỉ page published; sanitize HTML cũ trước trả |
| `GET /blog/posts`, `/blog/posts/:slug`, `/blog/categories` | Chỉ PUBLISHED đã tới publishedAt; category có bài public; detail tăng views atomic |
| `GET /faqs` | FAQ active nhóm category; null là Chung; tối đa 200 |
| `GET /banners?position=HOME_HERO` | Active, start inclusive/end exclusive; start/end null được phép; tối đa 50 |
| `GET /promotions/active` | Campaign còn hiệu lực và lượt dùng; phân trang, điều kiện; không trả coupon code |
| `GET /promotions/flash-sale` | Marker Flash Sale rõ ràng, variant và remaining quota; serverTime/reservation=false; tối đa 500 variant trong một trang campaign |
| `POST /coupons/validate` | code, items[{variantId,quantity}], optional usePoints; cùng engine, chỉ đọc; trả valid/reasonCode/breakdown |
| `GET /customer/products`, `/search`, `/suggest`, `/:slug`, `/:id/related` | Giá variant active, effective range, rating, điều kiện promotion và wishlist theo owner |
| `POST /orders/preview` | QuoteVersion và breakdown, không giữ quota/coupon/điểm |
| `POST /orders` | Cần quoteVersion từ preview và Idempotency-Key 8–128 ký tự; kiểm tra lại trong transaction |

Review sort: `newest`, `rating_asc`, `rating_desc`. Banner positions: `HOME_HERO`, `HOME_SECONDARY`, `CATEGORY`, `PRODUCT`, `SIDEBAR`. HTML chỉ giữ tập tag/attribute an toàn; không giữ script/event handler/iframe/SVG/style hoặc ảnh remote trong rich text. Banner/image chỉ HTTPS, không credentials; link nội bộ giới hạn namespace public, không nhận URL order/private tùy ý. Backend không tải URL do request cung cấp.

Luồng mua: preview → hiển thị điều kiện/tổng tiền → gửi lại quoteVersion và Idempotency-Key. Nếu giá/ưu đãi/quota thay đổi, `409 ORDER_PRICE_CHANGED` kèm `details.pricing` và quoteVersion mới; client yêu cầu khách xác nhận. Không tự mua với giá cao hơn. Retry cùng key/payload trả cùng order; payload khác trả `IDEMPOTENCY_PAYLOAD_MISMATCH`. Request thiếu quote trả `PRICE_QUOTE_REQUIRED`, thiếu key trả `IDEMPOTENCY_KEY_REQUIRED`.

Giá catalog dùng một đơn vị, chưa áp điều kiện giỏ/coupon/điểm (`priceBasis=SINGLE_UNIT_WITHOUT_CART_CONDITIONS`). Campaign có minimum được trả riêng với `conditional=true`; giá đó chỉ chốt tại preview. Min/max/sort effective price thực hiện trong PostgreSQL trước LIMIT/OFFSET. Một giá sản phẩm là mức thấp nhất của variant active; client phải chọn variant trước mua. Quantity hoặc nhiều dòng có thể làm thay đổi phân bổ cap; catalog không phải reservation.

## Transaction và hợp đồng Admin/POS

`CommercePricingModule` độc lập với controllers, export `CommercePricingService`. Khóa theo thứ tự customer → coupon → campaign ID → quota ID → variant/product → inventory ID. Mọi cấp quota/coupon/điểm lấy PostgreSQL làm nguồn quyết định. Receipt, order/items, tồn/quota, usage, điểm, snapshot/history, notification/outbox và cart cleanup commit cùng transaction.

Admin phải xác thực quyền/store scope trước gọi các helper; không expose chúng thành API customer:

| Integration | Contract |
|---|---|
| `CommercePricingService.quote(selection, tx, true)` | Tính từ dữ liệu backend đã khóa; dùng chung pricing cho Admin/POS; preview dùng lock=false |
| `reservePromotionBenefits(tx, orderId, lines, extraPromotionIds)` | Sau ghi order/items, caller đã khóa; reserve quota + một campaign usage/order; transaction rollback khi hết quota/lượt |
| `transitionPromotionAllocations(tx, orderId, status)` | Gọi trước lock inventory; CONFIRMED consume, CANCELLED release. Đã nối vào customer/admin cancellation và admin confirmation |
| DB trigger `sprint5_order_promotions` | Bảo vệ lifecycle khi writer khác chuyển status, gồm module payment sau khi được tích hợp; thao tác lặp không hoàn quota hai lần |
| `ReviewsService.moderate(tx, reviewId, approved, adminReply?)` | Khóa product, đổi review, tính lại approved AVG/COUNT, ghi aggregate và indexing event trong cùng transaction; Admin không tự cộng/trừ aggregate |
| `publicHtml()` | CMS Admin dùng trước lưu/publish; read API vẫn sanitize dữ liệu lịch sử. CRUD/publish workflow Admin thuộc nhánh Admin |
| `BroadcastService.freeze(tx, input)` | Admin xác thực và chọn audience trước; campaignId/sendVersion/userIds/title/message/route/resourceId; freeze tối đa 10.000 users ACTIVE Customer; retry cùng version/payload idempotent |

EXCHANGE của Sprint 4 đã dùng engine mới ở cả chuẩn bị quote và accept. Credit đơn cũ luôn lấy cash snapshot lịch sử; replacement dùng giá hiện tại, quoteVersion mới khi giá đổi, allocation/quota mới nếu hưởng Flash Sale. Phí EXCHANGE giữ setting `return_policy.exchangeShippingFee`, khác chính sách giao hàng của checkout thường. Không cho áp coupon/điểm mới khi đổi hàng trong contract hiện tại.

## Upstash, broadcast và Elasticsearch

Giá trị Upstash được giữ trong `.env`; `.env.example` chỉ chứa placeholder. REST adapter dùng `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; `REDIS_URL` TCP không bắt buộc. `REDIS_KEY_PREFIX` phải khác giữa môi trường. Cache JSON có TTL; reset xoay namespace cache, không FLUSHDB. Cache miss/lỗi đọc chuyển về DB; không fallback sang dữ liệu tiền/quota trong Redis. Cache hiện phục vụ public category DTO; giá động/catalog lấy DB để không làm sai filter/pagination hoặc rò tier/wishlist qua cache.

Coupon validate: local throttle 10/phút và Upstash atomic INCR+PEXPIRE cho user 10/phút, IP 30/phút. Không ghi PII vào key; Redis configured nhưng lỗi thì trả 503 thay vì bỏ qua giới hạn. Adapter timeout 2 giây, không follow redirect, không log credential. Kiểm chứng Upstash thực: SET key tạm TTL → GET → DEL thành công ngày 2026-10-25.

`BROADCAST_WORKER_ENABLED=true` bật fan-out từ audience frozen. Mỗi notification có key `CAMPAIGN:campaignId:sendVersion:userId`; mỗi device có delivery riêng, tái dùng FCM worker/retry của Sprint 4. Route allowlist PRODUCT/PROMOTION/BLOG và resource UUID; push payload chỉ notificationId/type/route/resourceId cùng các resource ID đã có ở Sprint 4. Không gửi email marketing qua đường broadcast này. `NOTIFICATION_DELIVERY_ENABLED` và FCM credentials vẫn cần để gửi push thực; consumer xác thực lại khi mở resource riêng.

`CATALOG_INDEX_WORKER_ENABLED=true` bật durable indexing. DB triggers ghi job cùng transaction khi product/variant/review và metadata campaign/brand/category thay đổi; không gửi HTTP khi giữ lock. Bootstrap chỉ bổ sung checkpoint còn thiếu; `CatalogIndexWorker.reindexAll()` tăng version/đánh dấu reindex toàn bộ. Worker claim/lease, retry/backoff, ES external version và DB version/token fencing ngăn kết quả cũ ghi đè revision mới. Job giữ indexedVersion để version không reset sau khi hoàn tất. ES chưa kết nối được thử lại mỗi 30 giây; DB fallback vẫn hoạt động. Không index giá động; DB enrich giá, nên bắt đầu/kết thúc campaign có hiệu lực mà không cần cron sửa salePrice.

## Migration, preflight và rollback

Không chạy migration lên DB dùng chung trong lần triển khai này. Trước deploy: backup, kiểm tra migration status và rà dữ liệu trên DB thử nghiệm. Migration dừng ngay nếu trùng review `(customer_id,product_id)`, không tự xóa lịch sử. Dùng truy vấn sau để xuất/audit bản trùng và quyết định bản giữ trước khi chạy lại:

```sql
SELECT customer_id, product_id, count(*) AS total,
       count(*) FILTER (WHERE is_approved) AS approved,
       array_agg(id ORDER BY created_at,id) AS review_ids
FROM reviews GROUP BY customer_id,product_id HAVING count(*) > 1;
```

Migration chuẩn hóa FIXED → FIXED_AMOUNT, bổ sung coupon cap, tái tính aggregate approved, unique/index review, bảng quota/allocation/campaign usage, durable catalog jobs và broadcast receipts/recipients. CHECK từ chối discount type/value/cap/dates sai, quota âm/vượt trần và trạng thái allocation sai. Các constraint handwritten cũ, generated inventory.available_quantity và snapshots Sprint 4 được giữ nguyên. Không backfill promotion/quota/credit giả cho đơn cũ.

```powershell
npm ci
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npm run build
```

Rollback ưu tiên tắt hai worker, dừng checkout mới và rollback application sau khi drain request; giữ schema/snapshot/allocation. Không drop bảng quota khi còn order hoặc đếm lượt đã phát sinh. Schema rollback chỉ thực hiện trên backup đã kiểm chứng, sau đối soát counter với allocations/usages; không sửa migration đã phát hành. Migration mới bọc transaction để lỗi preflight/constraint không để lại nửa schema.

Đối soát quota và usage:

```sql
SELECT q.id,q.reserved_quantity,q.consumed_quantity,
  COALESCE(sum(a.quantity) FILTER (WHERE a.status='RESERVED'),0) AS reserved_ledger,
  COALESCE(sum(a.quantity) FILTER (WHERE a.status='CONSUMED'),0) AS consumed_ledger
FROM promotion_variant_quotas q LEFT JOIN promotion_allocations a ON a.quota_id=q.id
GROUP BY q.id;
SELECT p.id,p.used_count,count(u.id) FILTER (WHERE u.status<>'RELEASED') AS new_usage_ledger
FROM promotions p LEFT JOIN promotion_order_usages u ON u.promotion_id=p.id GROUP BY p.id;
```

Campaign đã có usedCount lịch sử trước migration cần đối soát cùng phần baseline đó; không gán counter về ledger mới nếu đã có lượt sử dụng cũ.

## Kiểm chứng và bàn giao

Kết quả local ngày 2026-10-25: build và `prisma validate` PASS; **431/431 unit tests** trong 67 suites; **19/19 integration tests Sprint 4** và **19/19 integration tests Sprint 5**. Upstash REST smoke test thực PASS. Migration được áp dụng trên các schema thử nghiệm riêng, không áp dụng lên DB trong `.env`.

Unit matrix bao phủ tier/promotion/cap/minimum/quota/coupon/points/shipping/Decimal allocation, HTML/URL và Upstash timeout/rate limit. PostgreSQL/HTTP tests kiểm tra unique/purchase proof/aggregate, race suất cuối/coupon/điểm, idempotency, rollback tại receipt cuối, consume/release, snapshot RMA và exchange có promotion, CMS publication/views, filter/sort trước phân trang, hidden ES hit, durable job retry/fencing, broadcast dedup và Swagger.

Chạy từ `backend`, dùng schema mới trong PostgreSQL local riêng; harness từ chối host không local hoặc schema sai prefix. Không dùng `.env` làm DB test; không gửi push/email/ES/Redis thật trong harness:

```powershell
$env:SPRINT4_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint4_s5_regression_new'
$env:SPRINT5_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint5_acceptance_new'
node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand
node node_modules/jest/bin/jest.js --runInBand
npm run build
```

Local evidence được ghi trong `.tmp/sprint5-unit-results.json`, `.tmp/sprint5-e2e-results.json` (regression chung cuối) và `.tmp/sprint5-upstash.json`. Đây là dữ liệu local không chứa credentials. EXPLAIN query review được thực thi trên DB fixture; số lượng fixture nhỏ nên không tuyên bố benchmark production. Cần đo lại query giá theo cardinality/dữ liệu production trước tăng tải.

Skill áp dụng: backend-architect; database-design, prisma-expert, database-migration; api-design-principles, nestjs-expert, api-security-best-practices; sql-optimization-patterns; unit-testing-test-generate và code-review-checklist. Bằng chứng tương ứng: module pricing chung, lock/receipt/allocation, migration/preflight/index, public field whitelist/HTML allowlist, OpenAPI, PostgreSQL tests và query EXPLAIN. Tài liệu provider: [Upstash REST](https://upstash.com/docs/redis/features/restapi), [sanitize-html](https://github.com/apostrophecms/sanitize-html).

Nghiệm thu còn cần: Admin dùng các integration helper trong CRUD/moderation/publish/POS và audience thực; Web/Mobile hiển thị quote conflict/điều kiện giá và deep link; provider FCM/ES thực; merge/tích hợp nhánh payment Sprint 3 trước bật online. Không gắn nhãn toàn Sprint 5 đã nghiệm thu chỉ dựa trên tests local.
