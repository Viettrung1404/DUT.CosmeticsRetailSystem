# Kế Hoạch Triển Khai Hệ Thống Gợi Ý Sản Phẩm (Product Recommendation System — v2.1)

**Dự án:** `DUT.CosmeticsRetailSystem` (NestJS + Prisma + PostgreSQL + Upstash Redis + Cloudflare Workers/Queues + Next.js/Expo)  
**Mục tiêu:** Xây dựng hệ thống gợi ý sản phẩm chuẩn thực tế E-commerce ngành mỹ phẩm, hỗ trợ đồng bộ Web (Next.js) & Mobile (Expo), an toàn trước bot/spam, đo lường CTR/CVR chính xác, tận dụng tối đa hạ tầng sẵn có và vận hành ổn định trên **100% Free Tier ($0$ USD/tháng)**.

---

## 1. Tận Dụng "Tài Sản Sẵn Có" Trong Repo

Hệ thống hiện tại đã sở hữu hầu hết nền tảng kỹ thuật mà một hệ thống gợi ý cần có, giúp giảm đáng kể khối lượng phát triển mới:

| Thành phần trong repo hiện tại | Đường dẫn / Bảng liên quan | Cách tái sử dụng cho Recommendation |
| :--- | :--- | :--- |
| **PostgreSQL + Prisma** | `backend/prisma/schema.prisma` | Lưu event log (`JSONB`), bảng gợi ý tính sẵn, bảng thống kê metric theo ngày và vector embedding (`pgvector` kiểu `halfvec`). |
| **Upstash Redis + In-Memory Cache** | `src/core/cache/upstash-redis.service.ts`<br>`src/core/cache/in-memory-cache.service.ts` | Kết hợp **L1 (RAM)** + **L2 (Upstash)** để cache gợi ý, Trending và đặt Distributed Lock cho batch job mà không đốt quota. |
| **Transactional Outbox & CF Queue** | `src/modules/async-infrastructure/outbox/`<br>`outbox_events`, `cloudflare-queue.client.ts` | Tự động bắt sự kiện `ORDER_CREATED` / `ORDER_PAID` từ phía Server làm tín hiệu `PURCHASE` chuẩn xác $100\%$ (không nhận từ client). |
| **Dữ liệu hành vi & CRM** | `search_histories`, `customer_tags`, `orders` (Online + POS), `carts` | Nguồn tín hiệu cho hồ sơ sở thích, Co-occurrence và lọc tương thích loại da (Negative Filtering). |
| **Dữ liệu đặc thù mỹ phẩm** | `ingredients`, `specifications`, `how_to_use`, `try_on_color` | Đầu vào cho Content-Based Filtering (có chuẩn hóa INCI), luật tránh xung đột hoạt chất, so khớp tông màu son và Semantic Embedding. |
| **Tồn kho theo lô & Hạn sử dụng** | `inventory_balances`, `inventory_lots`, `min_shelf_life` | Bộ lọc hậu xử lý bắt buộc: sản phẩm cha chỉ được gợi ý khi có ít nhất $1$ Variant đang bán còn hàng và đạt hạn sử dụng. |

---

## 2. Ghi Log Hành Vi Khách Hàng: PostgreSQL (`JSONB`) Hay NoSQL?

### Kết luận: Dùng **PostgreSQL + `JSONB`** (KHÔNG thêm MongoDB / NoSQL)

Với quy mô đồ án hoặc hệ thống bán lẻ mỹ phẩm nhỏ–vừa chạy trên **Free Tier**, việc giữ nguyên PostgreSQL là tối ưu nhất:

1. **Hỗ trợ dữ liệu bán cấu trúc ngang NoSQL:** Cột `metadata JSONB` cho phép lưu payload linh hoạt cho từng loại event (thời gian xem trang, từ khóa tìm kiếm, mã màu son `shadeHex`, nguồn click...) mà không phải sửa schema liên tục.
2. **JOIN trực tiếp dữ liệu nghiệp vụ:** Dễ dàng chạy SQL tổng hợp trực tiếp giữa `user_behavior_events` với `products`, `orders`, `inventory_balances` mà không cần xây pipeline ETL đồng bộ giữa 2 database.
3. **Không phân mảnh hạ tầng Free Tier:** Tránh quản lý thêm 1 kết nối DB (như MongoDB Atlas giới hạn $512\text{ MB}$), giảm độ trễ mạng và đơn giản hóa backup/migration.
4. **Hạn chế tải ghi bằng Batching + Idempotency:** Gom sự kiện ở Client + Worker, Client tự sinh UUID v4 cho từng sự kiện, sau đó thực hiện `createMany(..., { skipDuplicates: true })` xuống PostgreSQL (không đặt FK trên bảng log để tăng tốc ghi hàng loạt và không vỡ dữ liệu lịch sử khi xóa sản phẩm).

---

## 3. Triển Khai Queue, Worker & Bảo Mật Tracking 100% FREE

**Cloudflare Queues đã hỗ trợ gói Workers Free** (từ 02/2026), do đó kiến trúc `cloudflare-queue.client.ts` sẵn có hoàn toàn triển khai miễn phí được khi thiết kế đúng cơ chế đóng gói, xác thực biên và giới hạn CPU.

### 3.1. Hạn mức Cloudflare Workers & Queues (Free Plan)

| Dịch vụ | Hạn mức Free Tier | Lưu ý kỹ thuật quan trọng |
| :--- | :--- | :--- |
| **Cloudflare Workers** | $100,000$ requests/ngày<br>$10\text{ ms}$ CPU time/invocation<br>$5$ Cron Triggers/account (tối đa $3$/Worker) | Thời gian chờ mạng (`fetch()` gọi về NestJS) **không** tính vào $10\text{ ms}$ CPU time. Tuy nhiên parse JSON quá lớn sẽ chạm trần $10\text{ ms}$ CPU $\implies$ cần giữ batch size vừa phải. |
| **Cloudflare Queues** | $10,000$ operations/ngày (hard cap, không trừ tiền)<br>Message retention: $24$ giờ<br>Tối đa $10,000$ queues | Mỗi $64\text{ KB}$ dữ liệu write/read/delete = $1$ op. Một message bình thường tốn $3$ ops ($1\text{ write} + 1\text{ read} + 1\text{ delete}$).<br>$\implies$ Tối đa $\approx 3,333$ messages/ngày ($\approx 100,000$ messages/tháng). |

### 3.2. Kiến trúc luồng đề xuất (Batch-First, Edge-Auth & CPU-Safe)

```text
[Next.js Web / Expo Mobile Client]
  |-- 1. Tự sinh event.id (UUID v4) để đảm bảo Idempotency khi retry
  |-- 2. Gom cục bộ (buffering 10s hoặc đủ 10 events; dedupe VIEW 5 phút)
  |-- 3. Đính kèm bộ đếm Impression thật (impressions: [{ placement, count }]) vào cùng payload
  |-- 4. Gửi 1 HTTP POST chứa { anonymousId, events, impressions }
  |      - Web: fetch(..., { keepalive: true }) khi visibilitychange (khuyên dùng same-origin proxy hoặc CORS cache 24h)
  |      - Expo: flush khi AppState chuyển sang background/inactive
  v
[Cloudflare Worker - Ingress (Free: 100K req/day)]
  |-- 5. Trả Access-Control-Max-Age: 86400 cho OPTIONS để tránh nghẽn preflight khi đóng tab
  |-- 6. Lọc sớm Bot/Crawler theo User-Agent & kiểm tra kích thước payload (< 32 KB)
  |-- 7. Verify JWT NGAY TẠI EDGE bằng Web Crypto API / jose (< 0.5ms CPU):
  |      -> Nếu hợp lệ: trích xuất customerId đáng tin cậy
  |      -> Nếu không có / hết hạn / lỗi: fallback customerId = null (KHÔNG đánh rớt event)
  |      -> XÓA SẠCH header Authorization (tuyệt đối không đẩy raw JWT vào Queue!)
  |-- 8. Validate nhẹ cấu trúc (< 1ms CPU), đẩy nguyên payload thành 1 message vào CF Queue
  v
[Cloudflare Queue (Free: 10K ops/day ~ 3,333 batch messages/day)]
  |-- 9. Cấu hình Consumer an toàn CPU: max_batch_size = 15, max_batch_timeout = 30s
  v
[Cloudflare Worker - Consumer (Free)]
  |-- 10. Gộp tối đa 15 messages từ nhiều user khác nhau -> 1 POST duy nhất sang NestJS Internal Endpoint
  v
[NestJS Backend]
  |-- 11. Xác thực InternalTokenGuard, kiểm tra whitelist eventType hợp lệ từ Client
  |-- 12. Prisma createMany({ data, skipDuplicates: true }) ghi 1 phát vào user_behavior_events
  |-- 13. UPSERT cộng dồn impressions/clicks vào recommendation_daily_metrics (1 query gọn nhẹ)
```

**Hiệu quả nhân quota & An toàn CPU:**
* Với trung bình $10$ events/message: xử lý được **$33,330$ events/ngày** ($\approx 1,000,000$ events/tháng) chỉ trong gói Free.
* Giữ `max_batch_size` ở Consumer ở mức `10–15` giúp CPU của Worker Consumer ổn định $2$–$4\text{ ms}$, tránh lỗi vượt giới hạn $10\text{ ms}$ CPU time.
* Verify JWT ngay tại Worker Ingress giải quyết triệt để 3 lỗi: không gộp được header `Authorization` cho nhiều user trong cùng batch, không lưu raw token trong Queue 24h, và không bị rớt định danh nếu Access Token hết hạn trong lúc Queue retry.

### 3.3. Quy tắc Bảo mật, Chống Data Poisoning & Tương thích Đa nền tảng

1. **Chặn cứng các event trọng số cao từ Client DTO:** Client chỉ được phép gửi `VIEW_PRODUCT`, `SEARCH_QUERY`, `SEARCH_CLICK`, `TRY_ON_COLOR`, `ADD_TO_WISHLIST`. Các tín hiệu `PURCHASE` và `ADD_TO_CART` **chỉ được ghi từ Server-side** thông qua domain event trong module `orders` / `carts`.
2. **Không bao giờ tin `customerId` trong Request Body:** Worker Ingress bỏ qua hoàn toàn bất kỳ trường `customerId` nào do client tự gửi lên; chỉ gán từ payload của JWT đã verify thành công bằng secret/public key lưu trong Worker Secrets.
3. **Client Tracking theo mô hình Storage & Lifecycle Adapter (Web vs Expo):**
   * **Next.js (Web):**
     * Lưu `anonymousId`, `recentIds` ($5$ SP gần nhất) và bảng Attribution (`productId -> { source, expiresAt: +24h }`) trong **`localStorage`** (không dùng `sessionStorage` để tránh mất attribution khi người dùng click mở sản phẩm ở tab mới), kèm hỗ trợ đọc query param `?ref=rec_*` làm phương án dự phòng.
     * Dedupe `VIEW_PRODUCT` trong $5$ phút ở `sessionStorage` / memory Map.
     * Khi đóng tab (`visibilitychange`), dùng `fetch(..., { keepalive: true })`. Nên cấu hình Next.js Rewrite proxy qua cùng domain (hoặc bật `Access-Control-Max-Age: 86400` trên Worker Ingress) để tránh trình duyệt hủy request do CORS preflight.
   * **Expo (Mobile):**
     * Lưu `anonymousId`, `recentIds`, `attributionMap` trong **`AsyncStorage` hoặc `MMKV`**.
     * Lắng nghe `AppState` chuyển sang `background` / `inactive` để flush batch đang đệm.
4. **Reset `anonymousId` khi đăng xuất:** Khi user bấm Logout trên cả Web và Expo, Client bắt buộc sinh mới một `anonymousId` (UUID v4) để tránh lẫn lộn lịch sử khi dùng chung thiết bị.
5. **Lọc Bot ngay tại tầng biên:** Worker Ingress bỏ qua sớm các request có `User-Agent` thuộc bot/crawler/headless phổ biến trước khi chạm tới CF Queue.

### 3.4. Phân tách 2 luồng Queue & Cron Jobs Độc lập

1. **Luồng Nghiệp vụ Quan trọng (Đơn hàng, Thanh toán, Webhook, Outbox):** Đi qua `outbox_events` $\rightarrow$ CF Queue $\rightarrow$ Consumer $\rightarrow$ NestJS ($< 1,000$ ops/ngày, có retry & DLQ).
2. **Luồng Hành vi Gợi ý (Click, View, Search, Impressions):**
   * *Phương án 1 (Khuyên dùng):* Đi qua CF Worker Ingress (verify JWT) $\rightarrow$ CF Queue dạng batch message như mục 3.2.
   * *Phương án 2 (Dành $100\%$ CF Queue cho Outbox):* Client gom batch $10$–$15\text{s}$ gửi thẳng tới `POST /api/v1/recommendations/events/batch` của NestJS; NestJS verify JWT trực tiếp, đệm trong RAM $5\text{s}$ rồi `createMany` xuống Postgres (trả `202 Accepted` ngay lập tức).
3. **Cron Triggers Miễn phí (dùng 3/5 slot Cloudflare Worker Cron Free — gọi tách lẻ từng job endpoint để tránh timeout):**
   * *Cron 1 (`0 */2 * * *` — mỗi 2 tiếng):* Gọi lần lượt `POST /internal/recommendations/jobs/trending` và `.../jobs/affinities`.
   * *Cron 2 (`15 */6 * * *` — mỗi 6 tiếng, lệch pha 15 phút):* Gọi lần lượt `POST /internal/recommendations/jobs/similar` và `.../jobs/bought-together`.
   * *Cron 3 (`0 19 * * *` — 02:00 sáng giờ VN hàng ngày):* Gọi `POST /internal/recommendations/jobs/cleanup` xóa log cũ hơn $90$ ngày.
   * *(Lưu ý: Nếu backend deploy trên container persistent như VPS/Render, mỗi endpoint job có thể nhận lệnh, kiểm tra Redis Lock, trả `202 Accepted` ngay rồi thực thi nền để tránh HTTP timeout 30s của Worker.)*

---

## 4. Thẩm Định Sức Chịu Tải Free Tier: Neon & Upstash

**Kết luận:** **Hoàn toàn ổn định** cho đồ án, staging và vận hành thực tế quy mô **$\le 1,000$ active users/ngày** khi xử lý triệt để các điểm đốt quota ngầm dưới đây.

### 4.1. Neon PostgreSQL (Free Tier)

* **Hạn mức:** $1\text{ GB}$ storage | $100\text{ CU-hrs}$/tháng | $5\text{ GB}$ egress/tháng | Scale $0.25$ đến $2\text{ CU}$.
* **Ước tính Storage:** $500,000$ events ($\approx 125\text{ MB}$) + `product_recommendations` ($\approx 2\text{ MB}$) + `recommendation_daily_metrics` ($< 1\text{ MB}$) + `pgvector` kiểu `halfvec(1024)` cho $1,000$ SP ($\approx 2\text{ MB}$) $\implies$ dùng chưa tới $20\%$ dung lượng.
* **Ước tính Compute:** Ở mức $0.25\text{ CU}$, bạn có $\frac{100}{0.25} = 400$ giờ active/tháng ($\approx 13.3$ giờ/ngày). Neon tự động suspend sau $5$ phút không có query.

> **CÁI BẪY #1: Polling loop khiến Neon không bao giờ ngủ!**  
> Nếu `OutboxRelayScheduler` (hoặc bất kỳ `@Cron` nào) query DB mỗi $5$–$60$ giây, Neon chạy $24/7$ ở $0.25\text{ CU}$ sẽ đốt $0.25 \times 24 \times 30 = 180\text{ CU-hrs/tháng}$ $\implies$ chạm trần vào khoảng ngày 16 hàng tháng.
>
> **Giải pháp bắt buộc:**
> 1. Khóa `max compute` trên Neon Console ở **$0.25\text{ CU}$ hoặc $0.5\text{ CU}$**.
> 2. Chuyển `OutboxRelayScheduler` sang cơ chế **Event-driven trigger** (gọi `triggerRelayNow()` bất đồng bộ ngay sau khi transaction ghi `outbox_events` thành công), chỉ giữ sweep dự phòng mỗi **30–60 phút**.
> 3. Không cấu hình UptimeRobot / Healthcheck gọi vào endpoint thực thi `SELECT 1` xuống DB mỗi 1–5 phút.

### 4.2. Upstash Redis (Free Tier)

* **Hạn mức:** $250\text{ MB}$ storage | **$500,000$ commands/tháng** ($\approx 16,666$ commands/ngày).

> **CÁI BẪY #2: `DistributedThrottlerStorage` + Read lặp lại + `ZINCRBY` liên tục đốt cạn $500\text{K}$ commands!**
>
> **Giải pháp bắt buộc (Giảm $80\%$–$90\%$ lượng commands):**
> 1. **Cache 2 tầng (L1 RAM $\rightarrow$ L2 Upstash):** Bọc `in-memory-cache.service.ts` (TTL $60\text{s}$) bên ngoài `UpstashRedisService` cho các dữ liệu dùng chung (Trending, Similar, Bought Together, Public Catalog). $1,000$ lượt xem cùng 1 sản phẩm chỉ tốn **1 lệnh `GET` Upstash mỗi phút**.
> 2. **Bỏ `ZINCRBY` cho Trending 7 ngày:** Thay bằng Cron Job chạy 1 câu SQL gom điểm 7 ngày có Time Decay rồi ghi Top $50$ bằng **1 lệnh `SET rec:trending:7d <JSON>`** (vừa không bị biến thành "trending mọi thời đại", vừa tiết kiệm hàng chục nghìn lệnh Redis/tháng).
> 3. **Không dùng Redis để dedupe `VIEW`:** Dedupe ngay tại Client (Web/Expo) trong $5$ phút.
> 4. **Giới hạn phạm vi `DistributedThrottlerStorage`:** Dùng In-Memory Throttler cho các API đọc public (`GET`) trên single-instance NestJS; chỉ dùng Upstash Redis Throttler cho endpoint nhạy cảm (Login, OTP, Checkout, Payment) hoặc chuyển Rate Limit ra Cloudflare WAF Free.

### 4.3. Bảng tổng hợp ngân sách vận hành (Kịch bản $500$ active users/ngày)

| Tài nguyên | Tiêu thụ ước tính/tháng | Giới hạn Free Tier | Mức độ an toàn |
| :--- | :--- | :--- | :--- |
| **Neon Storage** | $\approx 150\text{ MB}$ (dọn log $90$ ngày + `halfvec`) | $1,000\text{ MB}$ | Rất an toàn ($15\%$) |
| **Neon Compute** | $\approx 50$–$65\text{ CU-hrs}$ (đã bỏ polling) | $100\text{ CU-hrs}$ | An toàn ($\approx 60\%$) |
| **Upstash Commands** | $\approx 80,000$–$150,000$ cmds (có L1 + bỏ `ZINCRBY`) | $500,000$ cmds | Rất an toàn ($\approx 25\%$) |
| **Upstash Storage** | $\approx 5$–$12\text{ MB}$ | $250\text{ MB}$ | Rất an toàn ($5\%$) |
| **CF Workers Requests** | $\approx 3,000$–$8,000$ reqs/ngày | $100,000$ reqs/ngày | Rất an toàn ($8\%$) |
| **CF Queues Ops** | $\approx 1,500$–$3,000$ ops/ngày (có batching) | $10,000$ ops/ngày | An toàn ($30\%$) |

---

## 5. Thiết Kế Cơ Sở Dữ Liệu (Prisma Schema v2.1)

### 5.1. Thêm 4 bảng mới vào `backend/prisma/schema.prisma`

```prisma
enum BehaviorEventType {
  VIEW_PRODUCT
  SEARCH_QUERY
  SEARCH_CLICK
  ADD_TO_WISHLIST
  ADD_TO_CART
  TRY_ON_COLOR
  PURCHASE
}

enum RecommendationType {
  SIMILAR_CONTENT     // Tương đồng thành phần, loại da, danh mục, giá (cấp Product cha)
  BOUGHT_TOGETHER     // Co-occurrence từ đơn hàng Online + POS (có min support)
  ROUTINE_COMPLEMENT  // Bổ trợ chu trình skincare/makeup (có lọc xung đột hoạt chất)
}

enum RecommendationPlacement {
  HOME
  PRODUCT_SIMILAR
  PRODUCT_BOUGHT_TOGETHER
  CART_ROUTINE
}

// Không đặt FK trên bảng event log để đảm bảo ghi batch tốc độ cao và giữ toàn vẹn lịch sử
model UserBehaviorEvent {
  // Client tự sinh UUID v4 để createMany({ skipDuplicates: true }) đạt chuẩn Idempotency khi retry
  id           String            @id @default(uuid())
  customerId   String?           @map("customer_id")
  anonymousId  String            @map("anonymous_id")
  eventType    BehaviorEventType @map("event_type")
  productId    String?           @map("product_id")   // Luôn chuẩn hóa về Product ID (SP cha)
  variantId    String?           @map("variant_id")   // Lưu thêm Variant ID nếu có (màu son/dung tích)
  categoryId   String?           @map("category_id")
  brandId      String?           @map("brand_id")
  weight       Float             @default(1.0)
  source       String?           // 'direct' | 'search' | 'rec_home' | 'rec_similar' | 'rec_bought_together' | 'rec_cart'
  metadata     Json?             // { dwellMs, query, shadeHex, price, orderId }
  createdAt    DateTime          @default(now()) @map("created_at")

  @@index([customerId, createdAt(sort: Desc)])
  @@index([anonymousId, createdAt(sort: Desc)])
  @@index([productId, eventType, createdAt(sort: Desc)])
  @@index([createdAt])           // Tối ưu cron job xóa log > 90 ngày
  @@map("user_behavior_events")
}

// Đặt FK + onDelete: Cascade tới bảng Product để không bao giờ tồn tại gợi ý trỏ vào SP đã xóa
model ProductRecommendation {
  id              String             @id @default(uuid())
  sourceProductId String             @map("source_product_id")
  targetProductId String             @map("target_product_id")
  type            RecommendationType
  score           Float
  reason          String?            // VD: "Cùng chứa Niacinamide • Phù hợp da dầu"
  batchVersion    String             @map("batch_version") // UUID mỗi lần chạy job -> xóa rác an toàn không lệch đồng hồ
  updatedAt       DateTime           @updatedAt @map("updated_at")

  sourceProduct   Product            @relation("RecSourceProduct", fields: [sourceProductId], references: [id], onDelete: Cascade)
  targetProduct   Product            @relation("RecTargetProduct", fields: [targetProductId], references: [id], onDelete: Cascade)

  @@unique([sourceProductId, targetProductId, type])
  @@index([sourceProductId, type, score(sort: Desc)])
  @@index([type, batchVersion])      // Tối ưu câu lệnh DELETE rác sau recompute
  @@map("product_recommendations")
}

model UserAffinityProfile {
  customerId      String   @id @map("customer_id")
  topCategories   Json     @map("top_categories")   // [{ id, score }]
  topBrands       Json     @map("top_brands")       // [{ id, score }]
  preferredTags   Json     @map("preferred_tags")   // ["da-dau", "niacinamide", "chong-nang"]
  avoidedTags     Json?    @map("avoided_tags")     // ["con-kho", "huong-lieu"] suy từ customer_tags
  avgPriceRange   Json?    @map("avg_price_range")  // { min, max }
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("user_affinity_profiles")
}

// Bảng tổng hợp nhẹ đo CTR / CVR / Revenue theo ngày (tách khỏi bảng event để tránh phình DB)
model RecommendationDailyMetric {
  id          String                  @id @default(uuid())
  metricDate  DateTime                @map("metric_date") @db.Date
  placement   RecommendationPlacement
  impressions Int                     @default(0)
  clicks      Int                     @default(0)
  addToCarts  Int                     @default(0) @map("add_to_carts")
  conversions Int                     @default(0)
  revenue     Decimal                 @default(0) @db.Decimal(14, 2)
  updatedAt   DateTime                @updatedAt @map("updated_at")

  @@unique([metricDate, placement])
  @@map("recommendation_daily_metrics")
}
```

### 5.2. Bổ sung trường Attribution & Vector vào bảng hiện có

1. **Đo lường CVR & Doanh thu chính xác (Attribution):**
   * Thêm cột `attributionSource String? @map("attribution_source")` vào `cart_items` và `order_items`.
   * Khi user click vào sản phẩm từ một block gợi ý, Client lưu `productId -> { source, expiresAt: +24h }` vào `localStorage` (Web) / `AsyncStorage` (Expo) và đính kèm khi gọi API `Add to Cart` / `Checkout`.
2. **Bổ sung Vector Embedding tối ưu RAM cho bảng `products` (Phase 4):**
   * Chốt cứng **1 model** ngay từ đầu — khuyến nghị **Cloudflare Workers AI `@cf/baai/bge-m3`** ($1,024$ chiều, hỗ trợ tiếng Việt xuất sắc, miễn phí $10,000$ Neurons/ngày).
   * Sử dụng kiểu **`halfvec(1024)`** (float16 của `pgvector` mới trên Neon) thay vì `vector(1024)` để **giảm $50\%$ dung lượng lưu trữ và RAM của HNSW index** trên gói `0.25 CU` trong khi độ chính xác giữ nguyên $\approx 99.9\%$:
     ```prisma
     embedding          Unsupported("halfvec(1024)")?
     embeddingModel     String?   @map("embedding_model")
     embeddingUpdatedAt DateTime? @map("embedding_updated_at")
     ```
   * Tạo index HNSW bằng migration SQL thuần:
     ```sql
     CREATE INDEX idx_products_embedding_hnsw
     ON products USING hnsw (embedding halfvec_cosine_ops);
     ```

### 5.3. Quy ước Trọng số Hành vi & Suy giảm theo Thời gian (Time Decay)

$$\text{EffectiveScore}(e) = w_{\text{type}} \times e^{-\lambda \cdot \Delta t}$$

Trong đó $\Delta t$ là số ngày từ lúc phát sinh sự kiện đến hiện tại, $\lambda = 0.05$ (sau $14$ ngày trọng số còn $\approx 50\%$):
* `VIEW_PRODUCT` (dwell time $\ge 4\text{s}$): $1.0$
* `SEARCH_CLICK`: $2.0$
* `TRY_ON_COLOR`: $2.5$
* `ADD_TO_WISHLIST`: $3.5$
* `ADD_TO_CART` (Server-side): $5.0$
* `PURCHASE` (Server-side): $10.0$

---

## 6. Thiết Kế Thuật Toán Hybrid Đặc Thù Ngành Mỹ Phẩm

### 6.1. Nguyên tắc phân cấp `Product` (SP cha) vs `Variant` (Màu sắc / Dung tích)

1. **Tính điểm ở cấp `Product` (SP cha):** `product_recommendations` chỉ liên kết giữa các SP cha để không bao giờ gợi ý 5 màu son của cùng 1 dòng trong mục *"Sản phẩm tương tự"*.
2. **Lọc tồn kho ở cấp `Variant`:** Một SP cha hợp lệ khi đang ở trạng thái `ACTIVE` và có **ít nhất $1$ Variant** thỏa `available_quantity > 0` cùng lô hàng đạt chuẩn `min_shelf_life`.
3. **Khai thác màu sắc `TRY_ON_COLOR`:** Khi khách thử một màu son (`metadata.shadeHex`), boost điểm cho các dòng son khác có Variant mang mã màu gần nhất theo khoảng cách màu Euclidean trong không gian RGB/Lab ($\Delta E$).

### 6.2. Bốn bề mặt hiển thị & Real-time In-Session Personalization

| Vị trí UI | Endpoint API | Thuật toán cốt lõi | Cơ chế Fallback (Cold Start) |
| :--- | :--- | :--- | :--- |
| **Trang chủ ("Dành riêng cho bạn")** | `GET /recommendations/home?recentIds=...` | **In-session Boost** (trộn `SIMILAR_CONTENT` của $3$–$5$ `recentIds`) + `UserAffinityProfile` ($60\%$) + Trending/Diversity ($20\%$) | In-session `recentIds` (khách vãng lai đã xem SP) $\rightarrow$ Trending 7 ngày + Best Sellers |
| **Trang chi tiết ("Sản phẩm tương tự")** | `GET /recommendations/products/:id/similar` | Pre-computed Content-Based (Phase 2) + `pgvector` Cosine Similarity (Phase 4) | Cùng danh mục & tầm giá $\pm 30\%$ |
| **Trang chi tiết ("Thường mua cùng")** | `GET /recommendations/products/:id/bought-together` | Item-to-Item Co-occurrence (Lift có **Minimum Support**) trên đơn Online + POS + Routine Rules | Luật Routine Skincare (VD: Sữa rửa mặt $\rightarrow$ Toner/Tẩy trang) |
| **Giỏ hàng ("Hoàn thiện chu trình")** | `GET /recommendations/cart` | Xác định bước đang có trong giỏ $\rightarrow$ gợi ý bước còn thiếu + **Lọc xung đột hoạt chất** | Sản phẩm nhỏ dễ mua kèm (bông tẩy trang, mặt nạ giấy, mini-size) |

### 6.3. Chuẩn hóa Hoạt chất INCI & Công thức Content-Based

Trước khi tính tương đồng hoặc kiểm tra xung đột, chuỗi `ingredients` đi qua bộ từ điển chuẩn hóa tĩnh (`ingredient-normalizer.dictionary.ts`, $\approx 25$–$30$ hoạt chất mỹ phẩm cốt lõi) để gộp tên INCI tiếng Anh và tên tiếng Việt về cùng khóa chuẩn:
* `salicylic acid`, `bha`, `betaine salicylate` $\rightarrow$ `bha`
* `panthenol`, `vitamin b5`, `d-panthenol` $\rightarrow$ `vitamin_b5`
* `niacinamide`, `vitamin b3`, `nicotinamide` $\rightarrow$ `niacinamide`
* `ascorbic acid`, `vitamin c`, `ethyl ascorbic acid` $\rightarrow$ `vitamin_c`
* `retinol`, `retinal`, `retinyl palmitate`, `tretinoin` $\rightarrow$ `retinoid`
* `centella asiatica`, `madecassoside`, `rau ma` $\rightarrow$ `centella`
* `alcohol denat`, `sd alcohol`, `con kho` $\rightarrow$ `drying_alcohol`

Để tránh vét cạn $O(N^2)$, `recompute-similar` chạy 2 bước: **(1) Candidate Generation** (chỉ xét cặp cùng `categoryId`, chung ít nhất 1 hoạt chất chuẩn hóa, hoặc chung tag loại da) $\rightarrow$ **(2) Scoring & Top 12**:

$$\text{Sim}(A, B) = 0.35 \cdot S_{\text{category}} + 0.25 \cdot S_{\text{ingredients}} + 0.20 \cdot S_{\text{skin\_spec}} + 0.10 \cdot S_{\text{price}} + 0.10 \cdot S_{\text{brand}}$$

Trong đó $S_{\text{price}} = 1 - \min\left(1, \frac{|P_A - P_B|}{\max(P_A, P_B)}\right)$.

### 6.4. Co-occurrence (`BOUGHT_TOGETHER`) có Minimum Support

$$\text{Lift}(A, B) = \frac{P(A \cap B)}{P(A) \cdot P(B)}$$

* **Minimum Support:** Chỉ giữ cặp $(A, B)$ có số đơn mua cùng nhau $\text{Count}(A, B) \ge k_{\min}$ (khởi đầu $k_{\min} = 3$, tăng lên $5$ khi lượng đơn lớn) để tránh cặp sản phẩm hiếm bán có Lift ảo.

### 6.5. Luật Routine & Lọc Xung đột Hoạt chất (Negative Filtering)

1. **Routine Bổ trợ (`skincare-routine.rules.ts`):**
   * `Tẩy trang` $\rightarrow$ `Sữa rửa mặt`, `Bông tẩy trang`
   * `Sữa rửa mặt` $\rightarrow$ `Toner / Nước hoa hồng`, `Tẩy tế bào chết`
   * `Toner` $\rightarrow$ `Serum / Tinh chất`, `Mặt nạ`
   * `Serum` $\rightarrow$ `Kem dưỡng ẩm`, `Kem chống nắng`
   * `Son môi` $\rightarrow$ `Son dưỡng / Tẩy tế bào chết môi`, `Tẩy trang mắt môi`
2. **Lọc Xung đột & Phạt điểm Loại da (`ingredient-conflict.policy.ts`):**
   * **Xung đột treatment trong giỏ hàng:** Nếu giỏ đã có nhóm `retinoid`, loại bỏ (hoặc giảm mạnh điểm) `bha`/`aha` nồng độ cao và `vitamin_c` tinh khiết khỏi mục *"Hoàn thiện chu trình"*; đồng thời **boost điểm** cho `vitamin_b5`, `ceramide`, `centella` và *Kem chống nắng*.
   * **Tương thích loại da (`customer_tags`):** Nếu khách có tag `da-nhay-cam` hoặc `da-kho`, nhân hệ số phạt ($\times 0.4$) với sản phẩm chứa `drying_alcohol` hoặc đặc tính `kiềm dầu mạnh`.

### 6.6. Hậu xử lý Real-time & Cơ chế Bulk Upsert + Dọn rác không lệch đồng hồ

1. **Bộ lọc Real-time (1 query `IN (...)` duy nhất):**
   * SP cha `ACTIVE` và có ít nhất $1$ Variant còn hàng (`available_quantity > 0`) đạt `min_shelf_life`.
   * Giỏ hàng / Bought Together: loại SP đã có trong giỏ.
   * Trang chủ: không gợi ý lại SP vừa mua trong $14$ ngày gần nhất (trừ sản phẩm tiêu hao nhanh hoặc đã quá chu kỳ mua lại $45$ ngày).
2. **Bulk Upsert + Dọn rác theo `batchVersion` (an toàn $100\%$ trước Clock Skew):**
   * Mỗi lần chạy job recompute cho một `RecommendationType`, sinh 1 `runId = crypto.randomUUID()`.
   * Thực thi 1 câu lệnh bulk SQL duy nhất bằng `UNNEST` (nhanh hơn hàng trăm lần so với loop `prisma.upsert` từng dòng) trong 1 transaction:
     ```sql
     INSERT INTO product_recommendations (id, source_product_id, target_product_id, type, score, reason, batch_version, updated_at)
     SELECT gen_random_uuid(), s, t, $1::"RecommendationType", sc, r, $2, NOW()
     FROM UNNEST($3::text[], $4::text[], $5::float8[], $6::text[]) AS u(s, t, sc, r)
     ON CONFLICT (source_product_id, target_product_id, type)
     DO UPDATE SET
       score = EXCLUDED.score,
       reason = EXCLUDED.reason,
       batch_version = EXCLUDED.batch_version,
       updated_at = NOW();

     DELETE FROM product_recommendations
     WHERE type = $1::"RecommendationType" AND batch_version <> $2;
     ```

### 6.7. Đo lường Impression thật & Ghi nhận Metric không mất dữ liệu

* **Tránh đếm ảo Impression tại API Serving:** Không tăng Impression mỗi khi gọi `GET /recommendations/*` (dễ bị thổi phồng do React StrictMode, TanStack Query refetch hoặc user không cuộn tới).
* **Đếm Viewable Impression tại Client:**
  * Web: dùng `IntersectionObserver` kích hoạt khi block gợi ý hiện $\ge 50\%$ diện tích trong $\ge 1\text{ giây}$ (mỗi phiên trang chỉ đếm 1 lần/placement).
  * Expo: dùng `onViewableItemsChanged` với `itemVisiblePercentThreshold: 50` và `minimumViewTime: 1000`.
* **Gửi kèm batch & Flush an toàn:** Client gửi `impressions: [{ placement, count }]` chung payload với event tracking. NestJS thực thi `UPSERT` trực tiếp theo từng batch nhận từ Consumer (hoặc nếu dùng RAM buffer để gom nhiều request trực tiếp, chỉ flush định kỳ 5 phút **khi buffer không rỗng** + gắn hook `onModuleDestroy()` để tránh mất số liệu khi container restart mà Neon vẫn ngủ bình thường lúc vắng khách).

---

## 7. Cấu Trúc Module NestJS Đề Xuất

Tuân thủ kiến trúc Clean/Modular của repo tại `backend/src/modules/recommendations/`:

```text
backend/src/modules/recommendations/
├── recommendations.module.ts
├── domain/
│   ├── behavior-weight.policy.ts             # Trọng số sự kiện & công thức Time Decay
│   ├── ingredient-normalizer.dictionary.ts   # Từ điển chuẩn hóa 25-30 hoạt chất INCI <-> Tiếng Việt
│   ├── content-similarity.scorer.ts          # Candidate Generation + Content-Based + Color Delta
│   ├── skincare-routine.rules.ts             # Luật gợi ý bổ trợ chu trình
│   └── ingredient-conflict.policy.ts         # Luật tránh xung đột hoạt chất & lọc loại da
├── application/
│   ├── services/
│   │   ├── in-session-personalizer.service.ts # Trộn nhanh recentIds cho khách vãng lai/trong phiên
│   │   └── recommendation-metrics.service.ts  # Ghi nhận Impression/Click/CVR/Revenue + onModuleDestroy()
│   ├── use-cases/
│   │   ├── ingest-behavior-batch.use-case.ts
│   │   ├── merge-anonymous-events.use-case.ts # Chỉ gộp event có customer_id IS NULL trong 30 ngày gần nhất
│   │   ├── recompute-similar-products.use-case.ts
│   │   ├── recompute-bought-together.use-case.ts
│   │   ├── recompute-user-affinities.use-case.ts
│   │   ├── refresh-trending-cache.use-case.ts # SQL 7 ngày Time Decay -> 1 lệnh SET Redis
│   │   ├── get-home-recommendations.use-case.ts
│   │   ├── get-similar-products.use-case.ts
│   │   └── get-cart-recommendations.use-case.ts
│   └── listeners/
│       └── order-purchase-event.listener.ts   # Ghi PURCHASE server-side + cập nhật CVR/Revenue Attribution
├── infrastructure/
│   ├── recommendation.repository.ts           # Prisma queries + Raw SQL UNNEST, Co-occurrence & pgvector
│   └── recommendation-cache.service.ts        # L1 In-Memory + L2 Upstash Redis + Distributed Lock
└── presentation/
    ├── recommendations.controller.ts          # Public/Customer APIs
    ├── internal-recommendations.controller.ts # Endpoints tách lẻ từng job cho CF Worker & Cron (InternalTokenGuard)
    ├── admin-recommendations.controller.ts    # API thống kê CTR, CVR, Revenue cho Admin Dashboard
    └── dtos/
        ├── ingest-events-batch.dto.ts         # Whitelist eventType, bắt buộc event.id (UUID), cấm customerId từ client
        └── recommendation-response.dto.ts
```

---

## 8. Lộ Trình Triển Khai Chi Tiết (4 Phases)

### Phase 1: Nền tảng Tracking An Toàn, Đa Nền Tảng & Tối ưu Quota (2–3 ngày)
- [ ] **Audit & tối ưu quota hạ tầng trước khi code tính năng mới:**
  - Chuyển `OutboxRelayScheduler` sang event-driven trigger + sweep fallback $30$–$60$ phút để Neon được auto-suspend.
  - Khóa `max compute` trên Neon Console ở mức `0.25 CU` (hoặc `0.5 CU`).
  - Triển khai lớp L1 In-Memory Cache bọc ngoài `UpstashRedisService`.
- [ ] Tạo Prisma migration thêm 4 bảng mới (`user_behavior_events`, `product_recommendations` có `batch_version` & FK Cascade, `user_affinity_profiles`, `recommendation_daily_metrics`) và thêm cột `attribution_source` vào `cart_items`, `order_items`.
- [ ] Triển khai Cloudflare Worker Ingress + Consumer:
  - Ingress: lọc Bot, `Access-Control-Max-Age: 86400`, verify JWT tại Edge bằng `jose`/Web Crypto (fallback `customerId = null`, xóa header `Authorization`), đẩy batch vào CF Queue.
  - Consumer: `max_batch_size = 15`, `max_batch_timeout = 30s`, đẩy về Internal Endpoint của NestJS.
- [ ] Hook sự kiện `PURCHASE` và `ADD_TO_CART` từ phía Server.
- [ ] Viết `merge-anonymous-events.use-case.ts` trong luồng login/register với điều kiện bắt buộc `AND customer_id IS NULL AND created_at >= NOW() - INTERVAL '30 days'`; cập nhật luồng Logout trên Client để sinh mới `anonymousId`.
- [ ] Xây dựng `BehaviorTracker` theo Adapter Pattern cho Next.js (`localStorage` + `visibilitychange` + `keepalive: true` + `IntersectionObserver`) và Expo (`AsyncStorage`/`MMKV` + `AppState` + `onViewableItemsChanged`).

### Phase 2: Thuật toán Hybrid & Batch Jobs Tách Nhỏ Có Lock (3 ngày)
- [ ] Xây dựng `ingredient-normalizer.dictionary.ts` chuẩn hóa 25–30 hoạt chất INCI/Tiếng Việt.
- [ ] Triển khai 4 endpoint job độc lập (mỗi job đặt **Redis Distributed Lock** `SET lock:rec:<job> 1 NX EX 600` và sử dụng Bulk Upsert `UNNEST` + `batchVersion`):
  - `POST /internal/recommendations/jobs/similar`
  - `POST /internal/recommendations/jobs/bought-together` (Minimum Support $k \ge 3$ + Lift + Routine fallback)
  - `POST /internal/recommendations/jobs/affinities` (incremental 24h + tích hợp `customer_tags`)
  - `POST /internal/recommendations/jobs/trending` (SQL 7 ngày Time Decay $\rightarrow$ 1 lệnh `SET rec:trending:7d`)
- [ ] Cấu hình 3 **Cloudflare Worker Cron Triggers (Free)**:
  - Cron 1 (`0 */2 * * *`): Trending + Affinities.
  - Cron 2 (`15 */6 * * *`): Similar + Bought Together.
  - Cron 3 (`0 19 * * *` — 02:00 sáng giờ VN): `POST /internal/recommendations/jobs/cleanup` xóa log $> 90$ ngày.

### Phase 3: Serving APIs, Lọc Xung Đột Mỹ Phẩm & Dashboard CTR/CVR (2–3 ngày)
- [ ] Triển khai 4 API serving với bộ lọc tồn kho cấp Variant (`ACTIVE`, `available_quantity > 0`, đạt `min_shelf_life`) và Cache 2 tầng (L1 $60\text{s}$ / L2 Upstash $10$ phút):
  - `GET /api/v1/recommendations/home?recentIds=...` (kèm In-Session Personalization tức thì).
  - `GET /api/v1/recommendations/products/:id/similar`
  - `GET /api/v1/recommendations/products/:id/bought-together`
  - `GET /api/v1/recommendations/cart` (kèm `ingredient-conflict.policy.ts`).
- [ ] Hoàn thiện luồng Attribution (`localStorage`/`AsyncStorage` hạn $24\text{h}$ + `?ref=rec_*` $\rightarrow$ `cart_items` $\rightarrow$ `order_items`) và API Admin Dashboard thống kê:
  $$\text{CTR} = \frac{\text{clicks}}{\text{impressions}}, \quad \text{CVR} = \frac{\text{conversions}}{\text{clicks}}, \quad \text{Attributed Revenue} = \sum \text{revenue}$$

### Phase 4 (Nâng cấp AI): Semantic Similarity với `pgvector` (`halfvec`) (2 ngày)
- [ ] Bật extension `CREATE EXTENSION IF NOT EXISTS vector;` trên Neon PostgreSQL.
- [ ] Thêm cột `embedding Unsupported("halfvec(1024)")?`, `embedding_model`, `embedding_updated_at` trên bảng `products` và tạo index HNSW `halfvec_cosine_ops`.
- [ ] Tạo job sinh/cập nhật embedding bằng **Cloudflare Workers AI `@cf/baai/bge-m3`** cho sản phẩm mới hoặc vừa sửa mô tả (`updated_at > embedding_updated_at`) từ chuỗi gộp:
  `"{name} | {category} | {brand} | Thành phần: {ingredients} | Đặc tính: {specifications} | Cách dùng: {how_to_use}"`.
- [ ] Nâng cấp `recompute-similar-products` kết hợp $60\%$ Vector Cosine Similarity (`1 - (a.embedding <=> b.embedding)`) + $40\%$ Metadata/Price Score, đồng thời mở rộng tìm kiếm ngữ nghĩa cho thanh Search.

---

## 9. Checklist Kiểm Soát Rủi Ro, Bảo Mật & Vận Hành

1. **Quota Guardrails:**
   * Bật cảnh báo email trên Upstash tại ngưỡng $70\%$ ($350\text{K}$ commands); khóa `max compute` trên Neon Console ở `0.25`–`0.5 CU`.
2. **Graceful Degradation (Lỗi Cache/Queue không làm sập Web):**
   * Nếu Upstash Redis chạm trần hoặc lỗi mạng: `RecommendationCacheService` tự động fallback sang L1 In-Memory Cache + query trực tiếp `product_recommendations`.
   * Nếu Cloudflare Queue đạt trần $10\text{K}$ ops/ngày: Worker Ingress bỏ qua nhẹ nhàng event `VIEW` (trả `202 Accepted`, không làm lỗi UI).
3. **An toàn Xác thực & Toàn vẹn Dữ liệu:**
   * Raw JWT được verify và loại bỏ ngay tại Worker Ingress, không bao giờ lọt vào Queue payload.
   * Mọi event từ Client đều mang `id` (UUID v4) để `createMany({ skipDuplicates: true })` đạt chuẩn idempotent; merge `anonymousId` luôn kèm `customer_id IS NULL` và sinh mới `anonymousId` khi Logout.
   * Mọi job recompute đều đi qua Distributed Lock và dọn rác theo `batchVersion` để chống chạy đè và chống lệch đồng hồ.
4. **Quyền riêng tư:**
   * Toàn bộ endpoint tracking trả `202 Accepted` nhanh nhất có thể, không chặn UX.
   * Không lưu PII nhạy cảm (email, số điện thoại, địa chỉ) vào cột `metadata` của `user_behavior_events`.