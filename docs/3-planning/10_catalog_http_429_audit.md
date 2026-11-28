# Điều tra HTTP 429 catalog — 27/11/2026

## Báo cáo trước khi chỉnh sửa

Các vị trí dưới đây tham chiếu source trước sửa. Báo cáo phân biệt bằng chứng source, phép đo local và điều chưa biết về deployment gặp lỗi. Không có access log/stack trace đầy đủ của deployment, nên chưa thể gán sự cố được báo cho một URL duy nhất.

### Nguyên nhân đã kiểm tra

| Mức độ | Dẫn chứng | Hệ quả |
|---|---|---|
| P1 | `backend/src/app.module.ts:53–60,95–99`: Throttler mặc định 100/60000 ms, chạy trước JWT. `backend/node_modules/@nestjs/throttler/dist/throttler.guard.js`: tracker là req.ip (chuẩn hóa IPv6), key gồm controller + handler + name + tracker. | Mọi slug của cùng detail handler chung quota. Đây là limiter toàn cục theo handler/IP, **không phải** một quota chung cho mọi endpoint. Chưa có phân biệt user ở guard này. |
| P1 | `frontend/src/features/catalog/server.ts:218–230`: UUID mới trong header mỗi fetch; `frontend/src/shared/api/transport.ts:9–15`: custom AbortSignal mỗi fetch. Next cài trong repo, `dist/server/lib/dedupe-fetch.js:49–56`, bỏ memoization khi có signal. | Categories/reviews/facets có revalidate nhưng UUID phá cache key; fetch GET giống nhau không tự dedup. Giữ timeout và dùng React.cache ở ngoài transport để giải quyết. |
| P1 | `frontend/src/app/(site)/layout.tsx:8–11`, home `page.tsx:26–31`, categories `[slug]/page.tsx:7,19`: categories lặp giữa layout/page/metadata. Brand/blog/store/promotion metadata gọi cùng loader như màn hình (`marketing-pages.tsx:149,351,398`, `editorial-pages.tsx:208`). | Render và metadata cùng tạo request dư. Riêng products `[slug]/page.tsx:30–36` **đã có React.cache**, không được quy sai PDP luôn fetch detail hai lần. |
| P1 | `frontend/src/features/catalog/components.tsx:57,79,123,139`: Link sản phẩm bật prefetch mặc định. `listing-client.tsx:52–56`: initialData nhưng staleTime=0, refetchOnMount=always, focus=true. | Production navigation có thể phát sinh RSC prefetch cho nhiều sản phẩm; hydration gọi lại listing vừa SSR. Mức tăng thực tế phải đo bằng browser. |
| P1 | `backend/src/main.ts:18–22`: chỉ trust proxy khi cấu hình allowlist. `frontend/src/features/catalog/server.ts:223`: không gửi thông tin IP client. `docker-compose.yml:49–52`: Next gọi backend trực tiếp. `Caddyfile:10–12`: proxy theo path, không có rate limiter. | SSR/BFF cùng peer IP của Next; ngay cả trust Caddy cũng không khôi phục client cho fetch mới từ Next. Không được tin XFF tùy ý, không dùng UUID để né quota. Deployment thực tế ngoài repo chưa xác minh. |
| P2 | `frontend/src/app/api/catalog/{products,suggest,search-hints}/route.ts`: error trả status nhưng làm mất Retry-After. `search-hints/route.ts:13`: public cache 60s/SWR120 chứa cả giá. `search-box.tsx:12,129–174`: Map không TTL/giới hạn, debounce 150ms, cache cả giá. | Người dùng không biết khi nào thử lại; giá gợi ý có thể cũ vô thời hạn trong tab. |
| P2 | `backend/src/core/cache/tiered-throttler.guard.ts:32–88`: public GET nhẹ dùng memory; sensitive/mutation dùng Redis. `distributed-throttler.storage.ts:13–21,35–69`: Redis Lua atomic fixed window + block, production thiếu Redis trả 503. | Memory quota tính riêng từng replica; Redis chia sẻ giữa replica. Block mặc định bằng TTL, Retry-After là số giây còn lại của block. 44–50s phù hợp một block 60s đã trôi qua, nhưng không chứng minh URL của sự cố. |

### Phạm vi audit

Inventory toàn cây Backend/Frontend; tìm toàn bộ decorator throttle/skip, guard, middleware, proxy, fetch/axios/transport, cache/invalidation, interval/retry và Link. Đọc trực tiếp đường đi catalog SSR/BFF/browser, auth/session, guard/storage, public catalog, pricing và checkout liên quan. Không coi tìm kiếm tự động là review từng dòng business logic của toàn repo.

Auth login/register 5/min; forgot password 3/hour; OAuth 5/min và 3/10min; search/suggest/hints 30/min; cart 20/30/5; checkout/guest/upload/import/coupon có override riêng. Health skip throttle. Coupon còn có 429 nghiệp vụ riêng trong promotion controller; worker, embedding, Redis client còn xử lý 429 từ dịch vụ ngoài, không đồng nghĩa catalog bị guard đó chặn.

QueryClient mặc định retry=false, mutations=false (`app/providers.tsx:12–13`), không tìm thấy retry loop trong catalog transport. Search có abort/debounce sẵn; filter giá submit, brand modal apply, filter/sort/page dùng history + query thay vì vừa router refresh vừa fetch. Polling payment 10s, order 5s/tracking 15s có mục đích nghiệp vụ; cần tôn trọng cooldown 429 mà không bỏ cập nhật trạng thái. Auth broker có refresh single-flight/backoff riêng, giữ nguyên.

### Nhất quán và cache

Product/list/search/related/availability/promotion/flash cards có giá/tồn/điều kiện thời gian: không thêm cache qua request, không stale-while-revalidate cho giá. Chỉ dedup **trong một render**, sau đó request mới đọc mới. Private auth/account/cart/checkout/order không dùng public cache.

Backend đã có `VersionedPublicCacheService` với DB revision (cache generation 5s) cho categories/CMS/FAQ. Không đặt thêm TTL nội dung dài ở Next lên trên cơ chế revision rồi tuyên bố invalidation tức thời. Cache xuyên request chỉ dành reference không thương mại với TTL rõ ràng; cần invalidation có xác thực khi mutation qua admin. DB/admin/SQL ngoài Next vẫn được chặn stale bằng revision/TTL backend; không hứa tức thời trên mọi đường ghi.

## Kế hoạch triển khai

1. **Phase 0 — baseline:** health backend thật; build bản gốc trong dist riêng; counting reverse proxy tới backend thật, browser production theo kịch bản cố định. Lưu số request theo endpoint/status, không log cookies/token/body. Tái hiện limiter bằng handler test cô lập, tránh làm cạn quota backend đang được dùng.
2. **Phase 1 — loại request dư:** React.cache theo URL primitive + policy primitive ở ngoài timeout; header cache ổn định; không cache private. Chặn prefetch hàng loạt product cards. Listing nhận snapshot SSR không tự refetch lúc mount nhưng tiếp tục refetch khi focus/filter để giữ freshness. Search cache có TTL hoặc loại giá khỏi cache; debounce 300ms, min 2 ký tự, abort giữ nguyên.
3. **Phase 2 — cache và limiter:** public reference cache allowlist với TTL/invalidation được kiểm thử; giữ thương mại no-store. Chính sách nhóm public reference/catalog/search/sensitive qua decorator metadata thay vì đổi toàn bộ default hoặc skip guard. Giữ các ngưỡng 100/min và 30/min, nhóm sensitive giữ override cũ và Redis. Không tin header client chưa xác thực. Đánh giá client identity sau auth cần thay đổi thứ tự guard và kiểm thử riêng; deployment trust allowlist phải dựa topology thật.
4. **Phase 3 — retry/error:** bảo toàn Retry-After qua BFF, parse seconds và HTTP date; GET retry có giới hạn, delay >= Retry-After với exponential backoff + jitter; không retry mutation, không giữ SSR 50s; UI thông báo có cooldown, polling tôn trọng 429.
5. **Phase 4 — nghiệm thu:** unit limiter thực thi tới ngưỡng, cache/dedup/privacy/freshness, Retry-After và abort. Typecheck/build Backend và Frontend. Lặp cùng browser workload trên next start với backend thật, báo cả count, 429, lỗi và giới hạn phép đo. Không nhận pass nghiệp vụ chưa chạy.

Kiểm soát rủi ro theo backend-dev-guidelines: kiến trúc 5, testability 5, complexity 1, data risk 1, operational risk 2 ⇒ BFRI=6; cô lập thay đổi ở loader/transport/policy và giữ giao dịch nghiệp vụ.

Tài liệu đối chiếu: [Nest rate limiting](https://docs.nestjs.com/security/rate-limiting), [Next fetching](https://nextjs.org/docs/app/getting-started/fetching-data). Quyết định API Next ưu tiên docs đóng gói cùng bản 16.4.6 trong repo.

## Kết quả triển khai / nghiệm thu

### Bổ sung sau khi người dùng cung cấp URL `/brands/honey`

Đường gọi của metadata xác định được chính xác từ source: `frontend/src/app/(site)/(storefront)/brands/[slug]/page.tsx:6–7` → `getBrand('honey')` (`frontend/src/features/catalog/server.ts:319`) → **GET `/api/v1/brands/honey`** → `BrandController.detail` (`backend/src/modules/customer-experience/presentation/brand.controller.ts:65–68`). Metadata của route này không gọi endpoint khác. Nội dung trang cũng gọi cùng loader trong `BrandScreen` (`marketing-pages.tsx:224–225` trong workspace sau sửa). Vì vậy 429 trong call stack metadata của route này gắn trực tiếp với brand detail, không phải product search. Layout có thể gặp 429 categories/brands list riêng nhưng đã catch fallback.

Brand detail chỉ query Prisma, không gọi upstream trả 429; limiter guard chạy trước handler. Toàn bộ slug `/brands/:slug`, bao gồm các slug được prefetch từ trang danh sách thương hiệu, chia sẻ quota 100/min theo peer IP. Bản cũ tạo hai lời gọi độc lập khi render metadata + nội dung trang Honey; prefetch danh sách, request điều hướng và nhiều client Next cùng IP làm quota bị tiêu thụ nhanh hơn. Các bộ cache backend khác không tránh được guard, vì guard thực thi trước handler/cache.

Đã tái hiện HTTP 429 trên **controller BrandController thật** trong `backend/src/core/cache/__tests__/catalog-throttler.http.spec.ts`, dùng DB stub và limiter cô lập: 100 GET `/brands/honey` trả 200, request 101 trả 429 cùng Retry-After 1–60s; một slug khác cũng bị chặn. Không cố làm cạn quota của backend đang phục vụ người dùng. Chưa có access log lịch sử để đối chiếu đúng thời điểm 44–50s của lần lỗi ban đầu.

### Chính sách nhóm endpoint

| Nhóm | Hiện trạng / triển khai | Thiết kế mở rộng khi có topology và số liệu tải |
|---|---|---|
| Reference công khai: categories, brands | `PublicReadThrottle('reference')`, 100/min/handler/IP; cache reference tại Next TTL revalidation 60s, tag `catalog-reference` | Edge/IP budget + cache CDN có invalidation xác thực; metadata reference có thể chấp nhận stale |
| Catalog có dữ liệu thương mại: list/detail/facets/availability/related | `PublicReadThrottle('catalog')`, 100/min; no-store qua request | Quota theo IP client đã xác minh hoặc BFF identity ký có xác thực; đồng thời giới hạn tổng traffic service |
| Search/suggest/hints | `PublicReadThrottle('search')`, 30/min; debounce và cooldown, không cache giá gợi ý | Budget thấp hơn cho truy vấn tốn CPU; giới hạn độ dài và độ phức tạp query |
| Auth/OTP/guest checkout/coupon/upload | Giữ Redis và các override 3/5/10/20/30 theo endpoint đang có | Nhiều chiều IP + tài khoản đã xác minh/recipient hash; không dùng email/token thô làm key |
| User/cart/order/payment/nhân viên | Giữ Redis, các ngưỡng và flow hiện có; polling backoff khi 429 | Sau JWT guard mới có thể dùng userId + store/role; giữ chống brute force trước auth bằng budget IP riêng |
| Callback/webhook/internal | Giữ distributed policy hiện có, không sửa giao thức callback | Quota theo provider đã xác thực chữ ký/token; tránh chặn callback hợp lệ bởi browsing traffic |
| Health | Giữ SkipThrottle | Đặt kiểm soát truy cập/edge phù hợp hạ tầng |

Guard toàn cục là lớp bảo vệ mặc định hợp lý; dùng duy nhất một profile 100/min/IP cho mọi hành vi thương mại điện tử thì không đủ. Decorator nhóm bổ sung làm policy explicit và có log nhóm khi 429, **không thay số quota hoặc vô hiệu hóa limiter**. Key vẫn gồm handler, không gộp tất cả endpoint reference thành một quota mới.

### Phạm vi thay đổi hoàn thành

- Dedup: `loadForRender = React.cache(...)` dùng path/origin/timeout/policy primitive; giữ custom timeout ở bên trong. Không còn UUID làm cache key biến đổi; backend tự tạo correlation ID cho mỗi request thực tế.
- Cache xuyên request chỉ allowlist categories tree và brands list; validate DTO trước khi lưu, tách key theo backend origin. Không dùng headers/cookies/token người dùng. Các lần SSR tiếp theo đọc lại product/availability/offer từ backend. Facets/reviews cũng không còn cache vô hiệu do UUID.
- Invalidation: admin BFF chỉ gọi `revalidateTag('catalog-reference', {expire: 0})` sau mutation thành công và session/RBAC hiện có; lỗi backend không invalidate. Mutation trực tiếp backend/SQL chưa có webhook đẩy tag tới Next, nên reference dựa revalidation 60s (SWR, không phải hard expiry) và revision/backend cache có thể thêm độ trễ. Không có lớp TTL mới cho giá/tồn/khuyến mãi/đơn.
- Ngăn prefetch hàng loạt tại product cards, carousel, brand directory, category filter và navigation pills; vẫn giữ link điều hướng bình thường.
- Listing giữ dữ liệu SSR khi mount, fetch khi đổi filter/page/focus. Search tối thiểu 2 ký tự, debounce 300ms, abort request cũ; bỏ Map chứa giá không có TTL. History request có timeout, không còn trả success giả khi backend 429.
- BFF catalog giữ Retry-After/status; GET listing tối đa 2 retry, delay = max(Retry-After, exponential backoff) + jitter. Browser cooldown theo pathname chặn thao tác/query mới trong thời gian block. SSR và mutations không tự retry; payment/order polling giãn nhịp khi 429. UI catalog có thông báo lỗi dịch vụ phù hợp.

### Kiểm thử và giới hạn

Inventory quét 965 file Backend và 263 file Frontend (bao gồm tests/generated/style, khoảng 126k và 69k dòng tại thời điểm đo); kết luận audit tập trung đường request/cache/rate limiter đã đọc trực tiếp. Có thay đổi đồng thời của workspace ở giao diện promotion/CSS/mobile; giữ nguyên và không coi đó là phần tối ưu 429. BrandScreen vẫn cùng đường gọi; benchmark không dùng trang promotions.

Backend build và 3 suite chọn lọc (8 test) pass: limiter routing/storage, controller HTTP Honey, freshness sau sửa DB. Frontend production build pass; unit suite 122 pass, 14 skip theo điều kiện môi trường. Các test mới kiểm tra freshness giá, no shared commerce cache, allowlist reference/khác origin, malformed cache response, invalidation sau mutation thành công, bảo toàn Retry-After, cooldown, backoff, không retry mutation. Mô hình cache trong unit test là test double; phép đo production dùng cache Next thật.

Số đo production và kết quả browser sẽ cập nhật bên dưới. Không nghiệm thu thanh toán/đặt hàng thật hoặc toàn bộ regression business bằng các test chọn lọc này. Bản chạy local Next production dùng backend thật đang sẵn sàng ở cổng 3000; không tuyên bố đã deploy hay load test trên hạ tầng production.

### Số đo Production Build thực tế

`frontend/scripts/measure-catalog-production.mjs` chạy Chromium 1440×1000 với `next start`, đặt counting reverse proxy trước backend thật. Đếm tất cả request upstream của trang, SSR, browser BFF và RSC prefetch; không đếm ảnh/CDN. Các cache reference bắt đầu cold theo origin key riêng của mỗi lần chạy; không log token/cookie/body. Mỗi trang đợi network idle rồi thêm 1,5s. Cùng browser/context trong một lượt; tải trang đầy đủ giữa các bước.

| Kịch bản 12 lượt: home, products, brands, brand detail, PDP, search; lặp 2 vòng | Trước | Sau |
|---|---:|---:|
| Tổng request upstream | 214 | 43 |
| GET categories/tree | 70 | 1 |
| GET brands list | 14 | 2 |
| GET brands/:slug (bao gồm prefetch) | 48 | 2 |
| GET product detail (bao gồm prefetch) | 42 | 2 |
| GET product listing | 8 | 6 |
| GET product search | 4 | 2 |
| HTTP 429 trong workload này | 0 | 0 |
| Số lượt trang trả HTTP 200 | 12/12 | 12/12 |

Giảm **171/214 = 79,9%** request ở workload này. Trước sửa workload hữu hạn chưa chạm ngưỡng, nên không diễn giải thành “đã loại hết 429 ở mọi mức tải”. 429 được tái hiện độc lập ở test ngưỡng trên controller thật. Browser prefetch phụ thuộc viewport/heuristic và thời gian backend; CSS được sửa song song trong workspace có thể ảnh hưởng số phần tử hiển thị. Đây là số đo local trên phiên bản browser đã chạy, không phải cam kết phần trăm cho mọi deployment.

| Kịch bản đúng URL người dùng: tải `/brands/honey` 5 lần | Trước | Sau |
|---|---:|---:|
| Tổng request upstream | 65 | 17 |
| GET /api/v1/brands/honey | 10 | 5 |
| GET categories/tree | 25 | 1 |
| GET brands list | 5 | 1 |
| GET product listing của Honey | 5 | 5 |
| GET chi tiết sản phẩm do prefetch | 10 | 0 |
| Trang HTTP 200 | 5/5 | 5/5 |

Honey giảm **73,8%** tổng request. Quan trọng hơn, endpoint gây lỗi trong metadata giảm đúng **2 → 1 request/render**; product listing vẫn **1 request/lượt**, chứng minh không dùng TTL để giấu thay đổi giá/tồn kho. Brand detail cũng được đọc lại ở cả 5 lượt, chỉ được dedup trong render.

File dữ liệu: [workload trước](catalog-429-before.json), [workload sau](catalog-429-after.json), [Honey trước](catalog-429-honey-before.json), [Honey sau](catalog-429-honey-after.json). `verificationEntries` trong file workload sau là phép thử thêm, tách khỏi tổng 43 để giữ cùng kịch bản so sánh.

Browser production xác nhận thêm:

- Đổi sort gửi catalog GET và cập nhật URL bằng `history`.
- Gõ “serum” 40ms/ký tự chỉ tạo 1 request hints upstream sau debounce.
- Click thẻ sản phẩm điều hướng và render `.pdp-main`.
- Anonymous GET private profile vẫn trả 401.
- `npm run test:production` với `.next-429-after`, cổng smoke 3421: pass home/login, private redirect, diagnostic/unknown 404, maintenance 503 và Retry-After.

Các file cốt lõi sửa cho catalog/API/admin qua ESLint với `--max-warnings 0`. Riêng `account-pages.tsx` vẫn có 1 lỗi purity và 2 warning unused đã tồn tại: đối chiếu ESLint source HEAD trước sửa cho kết quả y hệt. `site-shell.tsx` 0 lỗi/0 warning. Không tuyên bố toàn repo lint sạch. `git diff --check` pass. Build tạm đã được git-ignore cục bộ; thay đổi tự sinh ở tsconfig/next-env do dist riêng đã được khôi phục sau kiểm thử. Các process benchmark/smoke tự khởi động đều tự dừng; không dừng backend có sẵn.

### Phần vận hành còn cần theo dõi

SSR/BFF vẫn xuất phát từ peer IP của Next. Tối ưu này loại bỏ traffic thừa nhưng không tạo ra danh tính client đã xác minh; ở tải đủ lớn quota 100/min/handler của service vẫn có thể chạm. Muốn quota công bằng theo client phải xác nhận chuỗi ngrok/Caddy/Next trước khi cấu hình allowlist, chuẩn hóa client IP tại ingress và ký danh tính BFF (hoặc áp budget tại edge); giữ thêm budget tổng service. Chỉ bật trust proxy hoặc chuyển tiếp XFF tùy ý không giải quyết an toàn vấn đề này. Không tự đổi guard auth order hoặc đặt secret/proxy topology dựa giả định.

Reference cache tại Next có tính eventual consistency đối với ghi ngoài admin BFF; khi cần invalidation ngay từ Backend/admin khác, bổ sung outbox/webhook có xác thực hoặc dùng generation backend làm cache namespace. Điều này chưa được triển khai vào đường ghi dữ liệu hiện tại. Các dữ liệu thương mại vẫn no-store qua request nên không phụ thuộc hợp đồng invalidation reference này.
