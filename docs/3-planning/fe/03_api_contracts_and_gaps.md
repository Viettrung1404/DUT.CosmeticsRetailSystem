# 03 — API hiện có, API thiếu và kế hoạch sửa backend

Ngày cập nhật: 26/10/2026. Base backend: `/api/v1`. Phân loại dựa trên OpenAPI **và source**, chưa kiểm chứng runtime/provider trong lượt lập kế hoạch.

**Người dùng đã chốt:** bản đầu phải có **VNPAY + COD**; lên kế hoạch sửa cả nhóm **O01/O02/O03/O05 trước tích hợp**; bỏ CTA phụ chưa có API. Đây là kế hoạch và thứ tự thực hiện, lượt này không sửa backend.

## 1. Mapping API đã có

Mọi path dưới đây có prefix `/api/v1`; không dùng endpoint từ FR cũ nếu khác source hiện tại.

| ID | Luồng | Endpoint hiện có | Điều cần giữ đúng |
|---|---|---|---|
| A01 | Auth/email | POST `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/refresh-token`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`; GET `/auth/me` | Verify `{token}`, không OTP đăng ký; reset 30 phút; backend trả token JSON, Next giữ phiên server-side |
| A01 | OAuth | POST `/auth/oauth/google`, `/auth/oauth/facebook`, `/auth/oauth/email`, `/auth/oauth/complete`, `/auth/oauth/link` | Nonce/challenge + email proof, `/link` cần Bearer user đích; provider token khác GlowUp access token |
| A02 | Catalog/search | GET `/customer/products`, `/customer/products/search`, `/customer/products/suggest`, `/customer/products/{slug}`, `/customer/products/{id}/related`; GET `/categories/tree` | Slug cho detail, UUID cho related/reviews. Filter đơn categoryId/brandId, giá, rating, tag, page/limit/sortBy |
| A03 | Cart | GET `/cart`; POST `/cart/items`; PUT/DELETE `/cart/items/{id}`; POST `/cart/merge` | Guest `X-Session-Id`; add dùng `productVariantId`, update/delete dùng cart-item ID; checkout items dùng `variantId` |
| A04 | Profile/address | GET/PUT `/customers/me`; GET/POST `/customers/me/addresses`; PUT/DELETE `/customers/me/addresses/{id}`; PATCH `/{id}/default` | Không phải `/users/me` hoặc `/user/addresses` trong mock. Max 10 địa chỉ; form không gửi field không có DTO |
| A05 | Pricing/order | POST `/coupons/validate`, `/orders/preview`, `/orders`; GET `/customers/me/orders`, `/orders/{id}`; PUT `/orders/{id}/cancel` | Preview lấy quote; create cần `quoteVersion` và `Idempotency-Key`; hiện COD-only; cancel chỉ PENDING |
| A06 | Wishlist | GET `/wishlists`; PUT `/wishlists/{productId}`; POST `/wishlists/toggle` | Ưu tiên PUT `{selected}` có trạng thái đích; product-level, không lưu màu/variant yêu thích |
| A06 | Loyalty/rewards | GET `/customers/me/loyalty`, `/customers/me/loyalty/rewards`; POST `/customers/me/loyalty/redeem` | Reward `{rewardCode}`; thiếu policy có thể 503; redeem cần idempotency, refetch balance |
| A07 | Reviews | GET `/customer/products/{id}/reviews`; POST `/reviews` | Review đã duyệt; mua đơn COMPLETED; một review/product/customer. DTO không có ảnh/video/helpful |
| A07 | Returns/exchange | GET/POST `/returns`; GET `/returns/{id}`; POST `/returns/{id}/exchange/accept` | 7 ngày từ COMPLETED; quoteVersion đổi hàng là **number**, khác chuỗi SHA256 checkout; không tự tạo order thay thế ở FE |
| A07 | Evidence/tracking | POST `/uploads/return-images`; GET `/uploads/return-images/{id}`; GET `/orders/{id}/tracking` | Evidence private tối đa 5 MB/file, attachmentId và URL ngắn hạn; tracking có nhiều shipments, không có live map tài xế |
| A08 | Notifications | GET `/notifications`; PUT `/notifications/{id}/read`; POST `/users/me/devices`; DELETE `/users/me/devices/{id}` | Có unreadCount; không có read-all/category filter. Web push là phần riêng cần permission/FCM config, không tự bật |
| A09 | Marketing | GET `/banners?position=...`, `/promotions/active`, `/promotions/flash-sale` | Banners theo position enum; active có lịch; flash có serverTime/quota, `reservation:false`; campaign không phải coupon cá nhân |
| A10 | CMS/blog/FAQ | GET `/pages/{slug}`, `/blog/posts`, `/blog/posts/{slug}`, `/blog/categories`, `/faqs` | Nội dung published; blog list filter categoryId và có pagination ở source, dù spec chưa đủ query params |
| A11 | SEO/health | GET `/sitemap.xml`, `/sitemaps/{source}/{page}.xml`, `/robots.txt`, `/health/live`, `/health/ready` | SEO raw XML/text, không JSON unwrap. Health ready không chứng minh VNPAY/SMTP/OAuth đã hoạt động |

### Quy ước adapter cần khóa trước tích hợp

- Response ngoài là `{statusCode, success, message, data, timestamp}`. Catalog có PageDto lồng `data/meta`, các API khác có `items/total/page/limit`; adapter theo từng endpoint, không một đoạn unwrap đệ quy đoán mọi response.
- Error phân loại bằng HTTP status và `code` khi có, giữ `details` và `Retry-After`; không parse message tiếng Việt để điều khiển flow.
- Tiền có cả number/Decimal string. Dùng parser/type rõ ràng để format; không sửa làm tròn nghiệp vụ hoặc tính tổng authoritative từ card phía FE.
- Tách `productId`, `productVariantId/variantId`, `cartItemId`, `orderId`, `orderNumber`, `returnId`, `paymentId`, `quoteVersion` bằng tên type rõ. Không dùng orderNumber gọi API `{id}`.
- Request DTO whitelist: không gửi thêm UI fields như confirmPassword, addressNote, skinType, shippingMethod khi backend chưa nhận.
- Generated types hỗ trợ compile-time; các response generic phải có schema adapter/runtime parse và fixture từ contract được BE xác nhận. Không cast `any` để bỏ qua phần thiếu.
- Catalog có giá theo hạng và wishlist theo user: anonymous response và private response không dùng chung cache. Không biến `@Public()` thành giả định mọi response đều giống nhau.

## 2. API gaps và cách xử lý bản đầu

“Đề xuất contract” không có nghĩa endpoint đã tồn tại. Không gọi thử endpoint tưởng tượng trong code chính.

| ID | Thiếu gì / ảnh hưởng | Phương án trong kế hoạch | Trạng thái / phụ thuộc |
|---|---|---|---|
| G01 | Payment initiation/status/retry, VNPAY IPN/return/query/refund | Bổ sung backend payment và UI return; mục 4 bên dưới | **Bắt buộc VNPAY + COD**, chặn nghiệm thu FE-03/release |
| G02 | Public store list/detail/tọa độ; stock từng chi nhánh/pickup/booking | Lập contract public store read tối thiểu để làm hai page thật. Stock/booking/pickup CTA bỏ trong bản đầu | Store reads cần BE bàn giao hoặc nội dung cửa hàng được duyệt; không dùng admin API. Chưa chốt endpoint cụ thể |
| G03 | Public brand list/slug detail/logo | Đề xuất public read có id/slug/name/logo/description và active visibility, để directory/brand filter/home hoạt động | Nằm trong phạm vi đủ blueprint; BE cần thiết kế contract. Không crawl toàn catalog để suy ra toàn bộ brands |
| G04 | Change-password, avatar upload, beauty profile, 2FA, quản lý phiên | Bỏ CTA/form chưa hỗ trợ. Giữ profile fields có API, security page có thông tin và đường dẫn forgot/reset | Đã được phép bỏ CTA; không chặn release nếu không còn lời hứa tính năng |
| G05 | Danh mục địa giới hành chính cho select phụ thuộc | Form dùng field text hợp lệ theo DTO trước; chưa có dữ liệu chính thức thì không dựng dropdown giả | API address CRUD vẫn có. Không tự gọi dịch vụ địa giới ngoài khi chưa chọn dataset/contract |
| G06 | Ví coupon sở hữu, số lượng/hạn dùng, save coupon; đổi quà vật lý | Sidebar “Ví voucher” dẫn rewards; dùng rewards/redeem thật, bỏ count/save/gift CTA thiếu dữ liệu | Đã chốt không cần ví riêng trong bản đầu |
| G07 | Promotion detail, upcoming campaigns, product cards theo campaign | Bổ sung cùng O03 phần detail/products; bỏ tab upcoming nếu chưa được bàn giao | Không đọc duy nhất trang 1 active rồi kết luận 404 cho campaign khác |
| G08 | Notification read-all/category filter/preferences | Dùng list/read từng item, bỏ các control còn thiếu | Không tải hết inbox hoặc bắn hàng loạt PUT để giả một bulk action |
| G09 | Guest order lookup, live rider map/phone/ETA, VAT invoice download | Tra cứu cần login; tracking timeline + trackingUrl thật; có thể in tóm tắt đơn, không gắn nhãn hóa đơn thuế | Bỏ control không được hỗ trợ; không lộ thông tin đơn qua public orderNumber |
| G10 | Newsletter, support ticket/chat, virtual try-on, image search, maintenance subscribe/progress | Bỏ CTA/tương tác và số liệu không có nguồn; help dùng FAQ/CMS/contact được duyệt | Đã được người dùng cho phép bỏ |
| G11 | Review images/video/helpful/report và số liệu review nâng cao | Dùng rating/title/content + review public list/histogram thực; bỏ upload/helpful/report chưa có contract | Không tái sử dụng upload evidence private cho ảnh review public |

Store/brand page thiếu data vẫn phải có skeleton/empty/error và fixture review trong development. Để nghiệm thu **tích hợp thật toàn bộ page**, G02/G03 cần contract public hoặc nguồn nội dung đã được chủ dự án chốt; việc cho bỏ CTA không cho phép bịa dữ liệu cửa hàng/thương hiệu.

## 3. API cần sửa/tối ưu trước hoặc trong tích hợp

### Nhóm đã được người dùng chốt đưa vào kế hoạch sửa trước tích hợp

| ID / mức | Bằng chứng source | Vấn đề với frontend | Thay đổi cần bàn giao và tiêu chí kiểm tra |
|---|---|---|---|
| **O01 — P0: public catalog mang giá vốn** | [ProductVariantResponseDto](../../../backend/src/modules/products/presentation/dtos/product-variant-response.dto.ts) gán `costPrice`; [PublicCatalogService.present](../../../backend/src/modules/products/application/services/public-catalog.service.ts) spread variant vào public response | Public detail/list/related có đường code đưa field nội bộ ra ngoài. Đây là phát hiện từ source, chưa gọi live để khẳng định response môi trường | Tách public projection/DTO allowlist, bỏ costPrice khỏi response và public OpenAPI, giữ nhu cầu admin riêng. Test anonymous lẫn signed-in tất cả public catalog; BFF allowlist chỉ là lớp phụ, không thay sửa backend |
| **O02 — P0: OpenAPI chưa đủ chính xác** | [openapi.json](../../../backend/docs/api/openapi.json), [openapi wrapper](../../../backend/src/core/common/openapi.ts), [CreateOrderDto](../../../backend/src/modules/orders/presentation/dtos/create-order.dto.ts), [experience.dto](../../../backend/src/modules/customer-experience/presentation/experience.dto.ts) | Profile/order/preview còn generic; nullable string/number thành object; quoteVersion decorator optional nhưng commerce service bắt buộc; page/limit kế thừa của blog/reviews/promotions thiếu trong spec | Typed response DTO phù hợp runtime, nullable/decimal/required/error headers đúng; bổ sung inherited query params. Export lại spec, generate FE types và contract fixtures; test wrapper không bị lồng sai. Payment contract bổ sung sau G01 |
| **O03 — P1: flash/promotion thiếu dữ liệu dựng page** | [PromotionsService.active](../../../backend/src/modules/customer-experience/presentation/promotion.controller.ts) flash chỉ có `variantId/remaining/effectivePrice/conditional`, product detail lookup là slug; active có applicable ID nhưng không product cards | Không có cách hiệu quả lấy name/image/slug theo các variant ID; thiếu detail, paging danh sách eligible products. Không thể hứa % đã bán khi chỉ có remaining | Public promotion detail + products page hoặc card projection trong flash, có product/variant ID/slug/name/image/price/availability tối thiểu và điều kiện campaign. Không trả coupon riêng; có total/pagination, giới hạn quota rõ thay vì âm thầm cắt 500. Test campaign hết hạn/ẩn, variant bị tắt, không N+1 phía FE |
| **O05 — P1: GET blog detail tự tăng views** | [ContentService.post](../../../backend/src/modules/customer-experience/application/content.service.ts) gọi `updateMany` increment trước đọc | Metadata + page/prefetch/retry có thể làm sai lượt xem; cache làm views không theo số lần đọc thực | Tách GET nội dung read-only và event view riêng có dedupe/rate limit, hoặc thống nhất lại định nghĩa analytics. FE chỉ ghi view khi bài thực sự được xem. Test prefetch/metadata không tăng count; cache content không che update |

Không coi O03 đã hoàn tất bằng cách frontend fan-out hàng trăm lookup hoặc tải tất cả sản phẩm. Chốt payload và pagination với BE trước làm data adapter.

### Đề xuất bổ sung, chưa tự coi là người dùng đã chốt sửa

| ID | Bằng chứng / vấn đề | Cách làm bản đầu và lựa chọn tối ưu sau |
|---|---|---|
| O04 | [ProductFilterDto](../../../backend/src/modules/products/presentation/dtos/product-filter.dto.ts) nhận một categoryId/brandId/tag; thiếu multi-select, facets/counts, sort discount, skin taxonomy | UI chỉ bật filter được API hỗ trợ. Nếu muốn giữ nguyên các facet trong mock, cần BE contract arrays/AND-OR/facet counts; không filter riêng một trang kết quả |
| O06 | [Address DTO](../../../backend/src/modules/customers/presentation/dtos/customer-address.dto.ts) không có ghi chú và cần city/district/ward; [delete-address](../../../backend/src/modules/customers/application/use-cases/delete-customer-address.use-case.ts) cho xóa default | Người dùng chốt UI theo backend: bỏ note riêng, cho delete/default theo response. Chuẩn hóa địa giới/field model là đề xuất độc lập, không tự sửa DB hoặc giả quận/huyện |
| O07 | Order query chỉ page/limit/status; dashboard không có coupon count/status counts; wishlist không lưu variant | Bỏ filter/count không có nguồn; gọi vài API song song có giới hạn. Chỉ làm summary/batch endpoint nếu đo được latency hoặc thật sự cần UI đó |
| O08 | [PublicCatalogService.suggest](../../../backend/src/modules/products/application/services/public-catalog.service.ts) gọi list đầy đủ rồi map suggestion | Có khả năng overfetch/tính giá nặng; chưa có benchmark mới nên không khẳng định chậm. Debounce/cancel FE trước; đo payload/query time rồi chốt compact query/projection với BE |
| O09 | BFF có thể khiến throttler backend nhìn mọi khách như cùng một IP | Thiết kế trusted-proxy/network boundary và rate-limit key trước staging; không forward X-Forwarded-For tùy ý từ client. Cần test hai session/client và các header giả |
| O10 | Backend đã version-cache CMS/category/FAQ, còn payload catalog động theo user | Baseline không cache bền catalog; nếu muốn cache metadata, cần split contract + invalidation. Không giải bằng public CDN cache có Authorization chung |

## 4. VNPAY + COD: phần bắt buộc phải bổ sung

### 4.1. Phân trách nhiệm

- Backend tạo payment attempt, ký URL VNPAY bằng secret server, xác minh callback, đối soát, quyết định paid/failed/expired/refund và đồng bộ reservation/quota/points/order. Không viết những việc này trong Next.
- Next BFF chuyển tiếp request/session/idempotency. UI chỉ chọn COD/VNPAY, chuyển hướng URL đã được backend cấp và kiểm tra allowlist, đọc trạng thái backend.
- Bỏ lựa chọn MoMo và cổng thẻ riêng trong bản đầu. Các kênh được VNPAY hiển thị trên hosted checkout phụ thuộc cấu hình merchant; FE không hứa có mọi loại thẻ, không nhập/lưu thông tin thẻ.
- Return URL đưa browser trở lại và IPN thông báo server là hai kênh riêng; không xem query `vnp_ResponseCode=00` là quyền tự chuyển đơn sang đã trả tiền. Xem [mô hình kết nối VNPAY](https://sandbox.vnpayment.vn/apis/docs/mo-hinh-ket-noi/) và [tài liệu tích hợp thanh toán](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

### 4.2. Contract đề xuất để BE thiết kế và đóng băng

**Các endpoint dưới đây chưa tồn tại trong OpenAPI hiện tại.** Tên là đề xuất; BE review với module/branch payment đang làm để tránh dựng trùng.

| Khả năng | API backend đề xuất | Contract tối thiểu |
|---|---|---|
| Tạo attempt cho đơn chưa trả | POST `/orders/{id}/payments` | Body `{provider:'VNPAY'}`, Idempotency-Key; response `{paymentId,orderId,status,redirectUrl,expiresAt}`; amount do backend lấy từ order |
| Xem trạng thái | GET `/payments/{id}` hoặc `/orders/{id}/payment-status` | Ownership, payment/order status, amount/currency, serverTime, expiresAt, allowedActions; không lộ secret/raw private provider data |
| Return từ provider | Route backend VNPAY return → redirect về Next `/payment/return` | Xác minh tham số theo protocol, map paymentId opaque đã lưu; URL kết quả không chứa token/session/proof |
| IPN từ VNPAY | Route backend public theo protocol VNPAY đã đăng ký | Verify chữ ký/tham số, đúng merchant/ref/amount/currency, idempotent durable update; không cần session browser |
| Retry payment | POST command payment với attempt mới khi backend cho phép | Không tạo order mới; không retry khi attempt cũ còn unknown/pending hoặc đã paid |
| Query/reconcile và refund | Backend worker/service, customer chỉ đọc kết quả | Đối soát attempt treo; gắn refund RMA/cancel vào adapter provider đã có hoặc bổ sung |

Endpoint status đọc là private; IPN public theo chữ ký provider, không đi qua customer-only guard. Nhận/ack IPN theo đúng protocol VNPAY đang tích hợp và commit bền vững/idempotent; không áp máy móc ví dụ webhook Stripe/PayPal. Query/refund theo [tài liệu VNPAY tương ứng](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html). Merchant credential/version và callback domain phải kiểm tra lại lúc tích hợp.

### 4.3. Flow bắt buộc

1. Chọn items/address/coupon/points → `POST /orders/preview` → render quote thật.
2. Confirm → `POST /orders` với quoteVersion và command key. BE mở hỗ trợ VNPAY trong service đang chặn `ONLINE_PAYMENT_MODULE_REQUIRED`, không chỉ thêm enum DTO.
3. Lưu `orderId` response. COD chuyển success “Đặt hàng thành công, thanh toán khi nhận”. VNPAY tạo attempt từ cùng order rồi redirect.
4. Tạo attempt lỗi sau khi order đã tạo: UI giữ orderId, cho mở chi tiết/retry được phép; không POST tạo đơn lại.
5. Provider return/IPN có thể đến theo bất kỳ thứ tự. Trang return hỏi backend; nếu chưa có kết quả, hiển thị “Đang xác nhận thanh toán”, polling có backoff/giới hạn rồi chuyển khách về chi tiết đơn.
6. Đóng tab/mất mạng/đăng nhập lại: order detail đọc lại trạng thái; không cần localStorage payment success. Return thiếu cookie phải login rồi quay về resource đã kiểm tra ownership.
7. Backend chỉ cho một kết quả settled hợp lệ cho đơn; duplicate callback/retry không trừ tồn/điểm/quota hoặc ghi payment thêm lần nữa. Payment timeout phải đối soát trước quyết định retry/cancel.
8. Backend cần định nghĩa giữ hàng/điểm/coupon khi awaiting payment, TTL, hoàn trả reservation khi hết hạn, và thanh toán đến muộn sau release. FE hiển thị allowedActions; không tự hủy đơn khi countdown bằng 0.
9. RMA/refund của đơn VNPAY phải đọc trạng thái xử lý thật. Gắn adapter refund/reconciliation backend; không hiện “Hoàn tiền thành công” chỉ vì yêu cầu refund được nhận.

### 4.4. Bằng chứng nghiệm thu G01

- Sandbox merchant + callback/IPN HTTPS có thể truy cập; secret chỉ backend, tách sandbox/production config; chưa có credential không đồng nghĩa thử bằng mock là đã xong.
- COD và VNPAY thành công, hủy, thất bại, pending/timeout, callback trước/sau return, không quay về site, duplicate IPN, sai signature/amount/ref, retry submit, refresh trang và login account khác đều có kết quả đúng.
- Timeout sau tạo order/attempt không tạo order hay charge trùng. 409 quote changed phải được xác nhận lại trước command mới.
- Refund/cancel sau đã trả tiền, late payment sau reservation expiry, worker restart/reconcile được test phía BE; UI thể hiện pending/failure trung thực.
- Capture trạng thái backend trước/sau và màn hình, không log credential hoặc PII. Bộ kiểm thử provider mock phục vụ regression, cần thêm một vòng sandbox thật trước nghiệm thu.

## 5. Handoff và dependencies môi trường

Theo [handoff 25/10](../../../backend/docs/api/nextjs-expo-handoff.md): Next cổng 3001, backend 3000; DB shared có migration chưa triển khai tại lúc probe, SMTP thiếu thông tin đăng nhập, private return bucket chưa cấu hình, OAuth chưa có test user token thật. Trước FE integration phải **kiểm chứng lại**, không mặc định các lỗi ấy vẫn còn hoặc đã hết.

BE bàn giao cho mỗi feature: endpoint/schema/errors/sample dữ liệu ẩn danh; capability flags/policy; môi trường test; account Guest/Customer phù hợp; nội dung CMS; image host allowlist. Không migrate/seed DB dùng chung chỉ để chạy FE test. Không gọi API admin từ customer browser để bù khoảng trống.

Mẫu ticket backend: ID → màn hình bị ảnh hưởng → source evidence → request/response/errors đề xuất → backwards compatibility → kiểm thử → owner → quyết định người dùng → trạng thái bàn giao. Trạng thái hiện tại của O01/O02/O03/O05 là **đã chốt lên kế hoạch sửa, chưa triển khai**; G01 là **bắt buộc triển khai VNPAY**, không phải API ready.
