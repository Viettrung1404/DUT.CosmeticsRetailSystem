# GlowUp — Báo cáo kiểm chứng development

Bắt đầu: **04/11/2026**. Cập nhật: **05/11/2026**. Theo [kế hoạch](02_development_execution_plan.md) và [checklist readiness](01_product_readiness_checklist.md).

**Baseline correctness và hiệu năng local đã có bằng chứng. Chưa đóng toàn bộ development và chưa chứng nhận sẵn sàng mở bán:** dependency audit còn finding, phạm vi UI/accessibility và tải cần tiếp tục nghiệm thu như phần cuối.

## Kết quả đã xác minh

| Phạm vi | Kết quả | Bằng chứng lưu trong repo |
| --- | --- | --- |
| Backend build | `nest build` đạt, exit 0 sau các sửa đổi | Log local `backend-build-final.log` / `.exit` |
| Backend unit, cấu hình cách ly | 97 suite đạt; **614 test đạt, 49 bỏ qua** | [backend-verification.json](evidence/backend-verification.json) |
| PostgreSQL integration | **6 suite, 48/48 test đạt**, migration schema mới | [backend-verification.json](evidence/backend-verification.json) |
| Backend HTTP/DB E2E | **3 suite, 60/60 test đạt**, không skip | [backend-e2e.json](evidence/backend-e2e.json), gồm tên từng ca |
| Coverage hợp nhất | Lines **79,51%**, statements **78,89%**, functions **65,36%**, branches **59,77%** | [backend-verification.json](evidence/backend-verification.json), merge Istanbul đúng mapping; không cộng phần trăm |
| Công cụ readiness | **4/4 test đạt**: guard DB, che credential, exporter cách ly | [hướng dẫn chạy](../../backend/test/READINESS.md), `npm run test:readiness:tools` |
| Frontend baseline | `npm run check` đạt lại sau sửa bản đồ: contract/inventory/format/lint/typecheck/unit/build; Redis thật **14 file, 80/80 test đạt** ở lượt riêng | Log local `frontend-check-final.log`, `frontend-redis-tests.log`; không tính 14 skip trong unit thường là đạt |
| Browser UI fixture | **53 đạt, 1 bỏ qua**, không lỗi/không flaky; gồm auth/OAuth giả lập, form, payment layout, mobile menu/focus | [ui-fixtures.json](evidence/ui-fixtures.json); ca menu mobile không áp dụng desktop, đã chạy ở project mobile |
| Full stack COD | **4/4 ca** desktop/mobile Chromium; production build trong cùng lượt đạt | [fullstack-cod.json](evidence/fullstack-cod.json): Next HTTPS → BFF → Nest → PostgreSQL/Redis thật |
| Catalog DB, 10.000 SKU | p95 từ **1.657 ms** xuống **351 ms**, lượt xác nhận **260 ms**; không lỗi | [catalog-performance-local.json](evidence/catalog-performance-local.json), có plan truy vấn thực tế |
| API HTTP local | p95 catalog **392 ms**, detail không cache **26 ms**, DB search fallback **312 ms**; 20 request/route, 4 worker | [api-baseline-local.json](evidence/api-baseline-local.json) |
| Dependency down/restart | DB down: live 200, ready 503; phục hồi DB và restart API vẫn đọc đủ 10.000 SKU | [api-baseline-local.json](evidence/api-baseline-local.json) |
| Backup/restore local | Restore sang DB mới, khớp đơn/tiền/payment/tồn/receipt và constraint | [restore-local.json](evidence/restore-local.json) |
| Secret scan | Gitleaks v8.30.1: 3 finding, đã rà là false positive; chưa thấy credential thật trong phạm vi quét | [secret-scan-review.json](evidence/secret-scan-review.json); scanner exit **1**, không báo nhầm là exit 0 |

Evidence JSON đã rà dữ liệu nhạy cảm. Log thô/trace/coverage ở `.tmp/development-readiness/` và bị Git ignore. Evidence ghi run ID/thời điểm/phạm vi; một số có hash source/lockfile vì thay đổi chưa commit. Tái tạo theo [backend/test/READINESS.md](../../backend/test/READINESS.md). Chưa xác minh một lượt `npm ci` từ máy hoàn toàn mới.

## Lỗi đã sửa và cách kiểm chứng

### Checkout cạn pool kết nối

Ca test pool **một kết nối** tái hiện lỗi ở cả khách tài khoản và guest: transaction giữ kết nối, adapter chọn cửa hàng xin thêm kết nối ngoài transaction. Sửa hai điểm checkout để dùng `PrismaService.transaction`, truyền transaction qua AsyncLocalStorage tới adapter/repository cùng PrismaService. Ngân sách chờ vào transaction 5 giây không phải cam kết API đạt 500 ms.

Full E2E đã đạt: pool một kết nối cho cả hai loại khách; **50 khách tranh 10 hàng trong 20 vòng** (đúng 10 thành công, 40 từ chối nghiệp vụ mỗi vòng); **20 request cùng idempotency key** và retry sau đó chỉ tạo một đơn/giữ một hàng. Web/POS tranh hàng cuối **20 vòng** chỉ một bên bán/giữ được hàng, tiền mặt POS chỉ tăng khi POS thắng. Ca POS gọi repository persistence thật, chưa chứng nhận toàn bộ quyền nhân viên POS qua HTTP.

Ca FEFO xác minh xuất kho từ chối khi chỉ còn lô hết hạn, rollback trạng thái/tồn/ledger; khi có lô hợp lệ thì bỏ qua lô hết hạn/cận hạn, lấy lô đủ điều kiện sớm nhất trước. **Chặn lúc xuất kho chưa chứng minh checkout luôn từ chối hàng chỉ còn lô hết hạn.**

### Catalog tính giá lặp trên từng biến thể

Benchmark ban đầu vượt p95 500 ms. Truy vấn catalog chuyển phần chọn giá hiệu lực sang xử lý tập hợp, giữ engine giá chuẩn để đối chiếu. E2E kiểm tra tương đương giá tier/campaign/cap, lọc giá trước phân trang và thứ tự kết quả; full suite đạt 60/60. Benchmark lặp cùng hình dạng dữ liệu/workload đạt; không đổi ngưỡng để làm pass.

### Fixture và công cụ kiểm thử

UI fixture cũ dùng tên điều hướng, tiêu đề và trường địa chỉ không còn tồn tại. Đã cập nhật theo UI hiện tại, giữ kiểm tra cookie/owner isolation và nhập tỉnh/phường thay cho quận/huyện. Fixture storefront công khai được bổ sung đúng hợp đồng, tile bản đồ dùng ảnh giả lập để test không phụ thuộc mạng ngoài.

Ca mới bắt được lỗi Leaflet trên cả desktop/mobile: sau khi lưu tọa độ và đóng form, timer kết thúc zoom 250 ms chạy vào map đã hủy, gây `_leaflet_pos`. Đã tắt zoom animation trong bộ chọn vị trí; 2 ca hồi quy quan sát cả khoảng thời gian sau khi đóng form đạt lại. [location-map-regression.json](evidence/location-map-regression.json) lưu kết quả trước/sau và liên kết lượt full UI: 53 đạt, 1 skip phù hợp phạm vi, không fail/flaky.

- Fixture cũ dùng tỷ lệ điểm/trần chi tiêu khác chính sách hiện tại. Đã sửa dữ liệu để kiểm tra đúng cạnh tranh/rollback, giữ assertion số dư/coupon/tồn.
- Fixture `ConfigService` không bị giá trị trống trong môi trường cách ly ghi đè. Ca email retry chỉ định email **đã đến hạn**, tránh phụ thuộc thời điểm tạo bản ghi so với đồng hồ DB. Lượt trước sửa có 1 ca fail; full integration sau sửa 48/48 đạt.
- Test CMS theo hành vi `recordView` riêng, chống trùng danh tính; DB thật, limiter của ca này giả lập.
- Export OpenAPI/Postman E2E dùng `API_EXPORT_DIR` riêng, test chứng minh không ghi đè tài liệu API theo dõi trong Git.
- Runner che khóa từ `.env`, chỉ nhận DB/port/schema readiness. Không migrate/seed database nhóm; provider/worker bên ngoài tắt hoặc stub. HTTPS local và TLS proxy Redis giữ yêu cầu Secure cookie production.
- README thống nhất trạng thái SePay: payment hoàn tất đưa đơn `PENDING_PAYMENT` → `PENDING`; nhân viên xác nhận sau đó mới `CONFIRMED`.

Các lượt đầu hết RAM/timeout do nhiều worker hoặc chạy các bộ coverage đồng thời không dùng làm bằng chứng đạt. Runner gọi Jest trực tiếp `--runInBand`; các lượt nặng nghiệm thu chạy tuần tự.

## Bảo mật còn mở

Đã cập nhật tương thích `body-parser` 1.20.9, `multer` 2.5.0, `lodash` 4.18.1, `js-yaml` 4.3.2, `glob` 10.5.0 và `npm audit fix` không dùng `--force`. Advisory chính thức: [body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828), [multer](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m), [lodash](https://github.com/lodash/lodash/security/advisories/GHSA-r5fr-rjxr-66jc), [glob CLI](https://github.com/isaacs/node-glob/security/advisories/GHSA-5j98-mcp5-4vw2). Bản vá glob giữ major 10; không dùng `glob -c` trong script của dự án. Build/unit/integration/E2E chạy lại sau cập nhật.

| Audit | Critical | High | Moderate | Low |
| --- | --- | --- | --- | --- |
| Backend toàn cây ban đầu | 0 | 15 | 31 | 7 |
| Backend toàn cây sau cập nhật | 0 | 5 | 21 | 11 |
| Backend `--omit=dev` sau cập nhật | 0 | 3 | 14 | 0 |
| Frontend toàn cây | 0 | 0 | 18 | 0 |

Đây là **package finding**, không phải số đường khai thác độc lập. [dependency-audit.json](evidence/dependency-audit.json) lưu triage và hash lockfile. Ba high trong backend `--omit=dev`: `deepmerge-ts`, `@prisma/config`, `prisma`, qua Prisma config/CLI. `glob` còn finding moderate khác chưa xử lý bằng bản vá high này; các dependency cha có thể được phân loại lại khi finding high được loại bỏ. Chưa thấy app gọi trực tiếp API bị nêu; **chưa đủ kết luận không khai thác được**. Cần xử lý/đánh giá tiếp và kiểm thử tương thích trước khi nâng major. SEC-07 chưa đạt.

Secret scan chỉ xét file worktree tracked/unignored đưa vào scanner, không xét Git history, `.env` bị ignore hay dashboard nhà cung cấp. Ba false positive là SHA-256 logo công khai, câu văn trong tài liệu và SHA-256 file test trong metadata evidence; đã đối chiếu hash với file thật. Lưu hash dòng/lý do, không thêm suppression rộng.

## Ma trận phạm vi và việc tiếp theo

| Checklist / chặng | Đã có bằng chứng | Còn thiếu để kết luận đầy đủ |
| --- | --- | --- |
| REL-01, NFR-07 / DEV-01 | Build, unit/integration/E2E, coverage hợp nhất | CI gate tự động; branches dưới 60% nếu áp dụng mốc này |
| PERF-03/05, REL-02 / DEV-02 | DB/Redis riêng, migrate, guard credential/schema | Lượt checkout/máy mới và CI |
| TX-01…06, TX-11 / DEV-03 | Stock/points/coupon contention, idempotency, rollback, web/POS, FEFO, hủy/đổi trả trong các ca liệt kê | Không suy rộng thành mọi quy trình chuyển kho/hoàn trả hay mọi nhánh nghiệp vụ |
| TX-07…12, PAY-01…03 / DEV-04 | Payment integration/HTTP và retry theo suite | Provider thật, crash/restart quanh từng cửa sổ ghi nhận ngân hàng và đối soát |
| SEC-01…07, DATA-01 / DEV-05 | Owner isolation, session/refresh/OAuth giả lập, CORS/rate-limit negative tests, secret scan | Dependency finding còn mở; chưa phải audit ASVS/penetration test đầy đủ |
| FUNC, UX, WEB / DEV-06 | COD tài khoản/guest, tạo/đọc/hủy, chặn người khác; 53 UI fixture đạt, kiểm tra không tràn ngang/focus/menu ở các ca đã nêu | Chưa audit accessibility đầy đủ/WCAG, Safari hay iOS thật |
| PERF, MET / DEV-07 | DB-only/HTTP local trên 10.000 SKU, query plan trước/sau | Frontend lab/Lighthouse; k6 dài, spike/soak, 1.000 VU trên staging; dữ liệu promotion/order lớn hơn |
| REL, DR, OBS / DEV-08 | DB down/recovery, restart API, restore fixture 4 đơn | Production RPO/PITR/RTO, object storage, log/metrics/alert và đối soát ngân hàng |

Baseline API chỉ **20 mẫu mỗi route, 4 worker, closed-loop**, PostgreSQL 17 giới hạn 1 CPU/512 MiB; Nest bootstrap test, backend limiter in-memory, provider tắt. Không đại diện công suất production hay tail latency tải dài. Full stack dùng Chromium mobile emulation; backup nhỏ không cam kết thời gian khôi phục hệ thống thật.

Ưu tiên tiếp: audit accessibility và baseline frontend performance; xử lý dependency finding có kiểm thử tương thích; đưa kiểm chứng vào CI; nghiệm thu tải/provider/observability trên staging. Uptime 30 ngày, RUM/Core Web Vitals thật và vận hành kinh doanh cần giai đoạn tương ứng trong checklist gốc.
