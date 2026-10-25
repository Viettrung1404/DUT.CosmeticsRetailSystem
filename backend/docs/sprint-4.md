# Sprint 4 — Backend end-user

Triển khai theo [planning Sprint 4](../../docs/3-planning/09_sprint_4_viet_trung_backend_enduser.md). Module chính: `src/modules/customer-commerce`; migration: `20261024000000_customer_sprint4`.

Runtime: Node.js **22 trở lên**, theo yêu cầu của Firebase Admin SDK được khóa trong package-lock. Kiểm chứng ngày **2026-10-25**: build thành công, **410/410 unit tests** (64 suites), **19/19 PostgreSQL/HTTP integration tests**, gồm wiring toàn AppModule và Swagger. Gateway/SMTP/FCM/storage thật và Web/Mobile chưa được nghiệm thu bằng các kết quả test này.

## API và hành vi

Prefix `/api/v1`. Các API mới yêu cầu JWT của user ACTIVE, role Customer và customer profile đã liên kết. Lookup chỉ đọc; đăng ký tạo user + customer trong cùng nested write. Migration bổ sung profile cho customer user cũ còn thiếu, **không tự merge khách POS theo số điện thoại chưa xác minh**.

| Method/path | Nội dung |
|---|---|
| `POST /returns` | REFUND/EXCHANGE; orderId, reason, items, attachmentIds, replacements |
| `GET /returns`, `GET /returns/:id` | Phiếu của owner, history public, quote, settlement và trạng thái refund |
| `POST /returns/:id/exchange/accept` | quoteVersion, optional paymentMethod; giữ tồn, tạo một đơn thay thế và settlement |
| `POST /uploads/return-images` | Multipart field `file`, tối đa 5 MB; decode/re-encode JPEG, trả attachmentId |
| `GET /uploads/return-images/:id` | Signed URL 300 giây, chỉ owner |
| `GET /orders/:id/tracking` | Nhiều shipment, event timeline và order history; thiếu shipment trả [] |
| `GET /customers/me/loyalty` | Balance, tier, nextTier, history phân trang |
| `GET /customers/me/loyalty/rewards` | Rewards được cấu hình, không tự dựng phần thưởng |
| `POST /customers/me/loyalty/redeem` | rewardCode → coupon riêng, redemption ID, balance |
| `GET /wishlists`, `POST /wishlists/toggle` | Danh sách và toggle yêu thích |
| `PUT /wishlists/:productId` | Body `{ "selected": true/false }`, đặt trạng thái đích |
| `GET /notifications`, `PUT /notifications/:id/read` | List/unread count, đánh dấu đã đọc |
| `POST /users/me/devices`, `DELETE /users/me/devices/:id` | Đăng ký token/rotate/đổi tài khoản, hủy thiết bị trước logout |

Các command tạo RMA, accept exchange, redeem và wishlist yêu cầu `Idempotency-Key` dài 8–128 ký tự (`A-Z a-z 0-9 _ . : -`). Retry cùng key và payload trả cùng kết quả; khác payload trả 409 `IDEMPOTENCY_PAYLOAD_MISMATCH`. Receipt và thay đổi nghiệp vụ commit cùng transaction. Public catalog `/customer/products` được enrich `isWishlisted` theo batch, tạo object mới để không làm bẩn public cache.

Read list có `page/limit`, mặc định 1/20, tối đa 100, thứ tự mới nhất trước và ID ổn định. Response ở ứng dụng chính được bọc `{statusCode,success,message,data}`. Các trường tiền Prisma Decimal trong RMA/settlement/coupon trả JSON string; quote và public ProductResponse dùng number. Không gửi `unitCost`, ghi chú Admin, carrierMetadata hoặc device token trong response public. Swagger tại `/api/docs` chứa request/response/error và header của các API mới.

Ví dụ tạo đổi hàng, sau khi có đơn COMPLETED thuộc tài khoản:

```json
{
  "orderId": "<order UUID>",
  "type": "EXCHANGE",
  "reason": "WRONG_ITEM",
  "items": [{ "orderItemId": "<original item UUID>", "quantity": 1 }],
  "attachmentIds": [],
  "replacements": [{ "productVariantId": "<replacement variant UUID>", "quantity": 1 }]
}
```

## Giá, điểm và đổi/trả

- Hạn 7 ngày tính từ lần chuyển COMPLETED đầu tiên; không dùng updatedAt. Mỗi phiếu khóa order gốc, tổng lượng trong phiếu chưa REJECTED không vượt lượng mua.
- Checkout lưu `pricingSnapshot` của order và từng dòng; tách coupon discount, point value, point units và cash value. Coupon owner/date/limit, điểm, giá/active variant và tồn kho được kiểm tra lại trong transaction.
- CouponUsage chỉ lưu khoản giảm coupon. Điểm thực trừ bị giới hạn bởi khoản đủ cấn, không trừ toàn bộ số khách nhập nếu phần dư không sử dụng. Định giá point value ở production cần `loyalty_config.point_value_vnd` hợp lệ.
- Cart cleanup cùng transaction tạo order, kiểm tra đúng owner/selection/quantity; cart thay đổi trả 409, không xóa nhầm hàng chưa mua. Sequence DB cấp order number, tránh race count + 1.
- Tiền được phân bổ theo đơn vị nhỏ nhất. Return lưu riêng cash credit và giá trị giảm bằng điểm; điểm chỉ hoàn dạng số nguyên ở bước finalization dựa trên tổng lượng **đã hoàn tất**. Không làm tròn từng phiếu độc lập để nhận thừa điểm.
- Quote được Admin chuẩn bị sau INSPECTED, có version/TTL và policy version. Khách accept sẽ kiểm tra lại giá, khóa variant và tồn, snapshot giá hiện tại, tạo settlement và một đơn ONLINE thay thế.
- Credit là đối trừ, không tạo payment giả. Chỉ phần chênh phải thu mới tạo payment; phần chênh cần hoàn được reserve vào Refund của payment gốc. Hủy đơn thay thế trước fulfillment release tồn và chuyển applied credit sang yêu cầu refund gốc, một lần.
- Khi chưa có module thanh toán online từ Sprint 3, accept có chênh phải trả chỉ chạy được nếu policy cho phép COD và client chọn COD. Trường hợp online trả 503 `ONLINE_PAYMENT_MODULE_REQUIRED_FOR_DIFFERENCE`; không giả lập giao dịch thành công.
- Đơn lịch sử chưa có snapshot trả `LEGACY_ORDER_REQUIRES_PRICING_REVIEW`. Migration không suy đoán giá/điểm đã sử dụng. Đơn thay thế có snapshot mới và `exchange_funding` truy nguồn credit tới payment thực: vòng RMA tiếp theo chỉ được hoàn/chuyển phần funding còn khả dụng, không tạo tiền mới từ credit. Refund giữ `orderId` của payment nguồn và `returnOrderId` của phiếu đang xử lý để truy vết qua nhiều lần đổi.

## Cấu hình nghiệp vụ — chưa tự seed giá trị production

Các lựa chọn tiền còn đang chờ người dùng xác nhận. Dữ liệu trong integration test chỉ là fixture kiểm thử. Các setting thiếu/sai trả 503 `POLICY_NOT_CONFIGURED` hoặc `POINT_VALUE_NOT_CONFIGURED`, transaction không trừ điểm/phát voucher.

| `settings.key` | JSON cần cấu hình |
|---|---|
| `loyalty_config` | `point_rate` hiện dùng cho EARN; `point_value_vnd` là số nguyên dương, dùng cho checkout tiêu điểm |
| `loyalty_rewards` | `rewards[]`: code duy nhất, version, pointsCost nguyên dương, discountType FIXED_AMOUNT/PERCENTAGE, discountValue, minOrderAmount, validityDays nguyên dương |
| `return_policy` | version; allocation PROPORTIONAL; refundPointsAs POINTS; exchangeShippingFee >= 0; quoteMinutes nguyên 1–1440; allowDifferenceCod boolean |
| `return_accounting` | earnedPointsReversal PROPORTIONAL; allowPointDebt true; stats NET_CASH_VALUE; totalOrdersMode KEEP_COMPLETED_PURCHASES hoặc REMOVE_FULLY_RETURNED_ORDERS |
| `carrier_tracking_urls` | Map carrierCode → HTTPS template chứa `{trackingCode}`; chỉ Admin cấu hình, không lấy template từ khách |

Policy kế toán đang hỗ trợ thu hồi điểm EARN tương ứng cash value được trả, cho phép số dư âm nếu điểm đã tiêu, đối soát totalSpent và lựa chọn giữ/giảm totalOrders khi trả toàn bộ. Nếu muốn quy tắc khác, cần thống nhất và bổ sung policy/logic/test trước enable; không đổi tên setting để lách validation. Điểm hết hạn chưa được bật; cần lot/allocation trước khi chạy EXPIRE theo planning.

Phí giao hàng checkout thường và mốc miễn phí hiện vẫn là chính sách code trước Sprint 4 (30.000/500.000); chưa thay thành chính sách mới khi chưa được chốt. Promotion/tier pricing engine và quota Flash Sale thuộc Sprint 5. Upstash Redis là provider đã chốt; adapter cache/rate limit phân tán thực hiện ở Sprint 6, không dùng Redis thay PostgreSQL để quyết định số dư/tồn/credit.

## Hợp đồng tích hợp với Thành Lập

Import `CustomerCommerceModule` để sử dụng providers đã export. Tất cả helper dưới đây nhận **transaction client của caller**, không tự commit và không gọi provider HTTP khi đang giữ lock. Admin controller phải kiểm tra quyền và store scope trước gọi; không expose các helper này thành API public.

| Provider/method | Caller cần làm trước | Helper làm |
|---|---|---|
| `ReturnsService.prepareExchangeQuote(tx, returnId)` | Duyệt/nhận/kiểm định đúng flow; status INSPECTED; từng dòng có RESALEABLE/DAMAGED | Tạo quote version/TTL từ lựa chọn thay thế và policy, gửi notification quote ready |
| `CustomerEventIntegration.returnStatusChanged(tx, returnId, actorId, eventId, publicNote?)` | Ghi trạng thái hợp lệ theo state machine và actor được cấp quyền | Public history và notification có event key; từ chối actor Customer |
| `shipmentChanged(tx, event)` | Xác minh carrier/webhook; map status và event identity ổn định | Lưu timeline/dedupe; sự kiện cũ không kéo lùi current shipment hoặc gửi thông báo lỗi thời |
| `reserveRefund(tx, returnId, amount)` | Phiếu đã đủ điều kiện, amount được tính từ snapshot đã kiểm định | Khóa order và reserve refund trên completed payments còn khả dụng; retry cùng amount không tạo thêm refund |
| `refundCompleted(tx, refundId)` | Kết quả provider đã được xác thực; lưu refund COMPLETED + processedAt + reference | Kiểm tra payment gốc/trần hoàn; chỉ lúc này gửi thông báo thành công, idempotent |
| `completeReturn(tx, returnId, actorId)` | Đã nhận/kiểm định; RESALEABLE có restockStoreId/restockBatchId; refund thật đã hoàn tất; policy đã chốt | Ledger hoàn/thu hồi điểm, xét hạng, điều chỉnh customer totals, hoàn tất RMA/history, idempotent |

State machine Admin, restock lô/traceability và gateway refund adapters vẫn do BE Admin/nhánh payment cung cấp. Helper kiểm tra payment/condition không thay cho xác minh chữ ký provider hoặc phân quyền Admin. Đã tích hợp notification đơn và điểm vào order transitions hiện có; STORE_PICKUP dùng cùng reservation lifecycle với ONLINE. Luồng hủy settlement đã được nối vào customer/admin order cancellation và cron hiện tại.

## Migration, triển khai và rollback

1. Sao lưu DB mục tiêu và xác nhận migration hiện có trước triển khai; kiểm tra không có return item trùng `(return_order_id,order_item_id)`, condition sai enum hoặc dữ liệu âm. Giữ migration cũ nguyên trạng.
2. Chạy `npx prisma generate`, `npx prisma migrate deploy` trên DB thử nghiệm trước. Migration additive, thêm nullable snapshots, new tables/index/check và sequence; giữ generated available_quantity và SQL constraints/index cũ.
3. Review/backfill các đơn lịch sử bằng nguồn giá/điểm đã kiểm chứng trước mở RMA cho các đơn đó. Không tự cập nhật history hoặc gửi lại notification/EARN quá khứ.
4. Cấu hình setting và provider, triển khai code, smoke test ownership/checkout/RMA/settlement trên staging; chỉ enable worker sau khi cấu hình đã được kiểm chứng.
5. Rollback ưu tiên giữ schema additive, tắt delivery và chặn write RMA/accept/redeem trước quay về build cũ. Nếu đã phát sinh settlement/voucher/điểm, phải đối soát các job và giữ bản ghi tài chính; không drop bảng để “undo”. Nếu cần rollback dữ liệu, khôi phục bản sao DB đã kiểm chứng và xử lý các giao dịch provider phát sinh sau backup trước mở lại. Không sửa `_prisma_migrations` hoặc xóa lịch sử tài chính bằng script tự động.

## Storage và delivery

`.env.example` có các biến mới. Bằng chứng RMA dùng `RETURN_STORAGE_BUCKET` riêng và `RETURN_STORAGE_PRIVATE=true` sau khi bucket đã thực sự private; dùng credentials STORAGE_* server-side. Không dùng bucket catalog public. Ảnh staging chỉ được attach trong 24 giờ; cleanup sau 25 giờ, giữ record để retry nếu xóa provider thất bại. Nên có lifecycle policy riêng để dọn object orphan khi tiến trình chết sau upload trước ghi DB.

Email: SMTP_HOST/PORT/USER/PASS/FROM. Push: FCM_SERVICE_ACCOUNT_JSON server-side. `NOTIFICATION_DELIVERY_ENABLED=false` mặc định; cấu hình xong mới bật true. Worker claim bằng SKIP LOCKED + lease/claimToken, gửi sau commit, retry/backoff tối đa 8 attempts rồi FAILED. Không biến lỗi provider thành SENT. Dedupe receipt/notification không bảo đảm provider gửi đúng một lần sau crash; client dedupe bằng notificationId. Push chỉ chứa title/message và ID resource trong allowlist.

Tài liệu SDK đã đối chiếu: [Firebase Admin send](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk), [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html).

## Kiểm thử tái lập

Không dùng credentials `.env` trong E2E. Cần PostgreSQL thử nghiệm riêng và `SPRINT4_TEST_DATABASE_URL` trỏ localhost, schema tên `sprint4_*`. Harness từ chối hostname hoặc schema khác và tự apply toàn bộ migrations vào schema được chỉ định. Không gửi email/push thật trong tests.

```powershell
# Chạy trong backend; database/port này phải là môi trường thử nghiệm riêng.
$env:SPRINT4_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint4_new_run'
node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand
node node_modules/jest/bin/jest.js --runInBand
npm run build
```

Dùng schema mới khi kiểm tra lại migration chưa phát hành sau chỉnh sửa. Unit tests cover tiền/policy, provider errors, claim hết hạn, device đổi chủ, ảnh private. PostgreSQL tests cover ownership HTTP, retry receipt, lượng trả/điểm/coupon/tồn cuối, quote đổi giá, đổi đắt/rẻ/ngang, hủy credit, refund dedup, rollback và hoàn điểm phân số qua nhiều lần trả.

Skill áp dụng: backend-architect, database-design, prisma-expert, database-migration, api-design-principles, nestjs-expert, api-security-best-practices, payment-integration, unit-testing-test-generate và code-review-checklist trong `.agents/skills`. Bằng chứng là transaction/lock/receipt, migration có bảo toàn invariant, contract Swagger, integration tests và runbook này.
