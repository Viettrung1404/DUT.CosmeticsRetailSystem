# GlowUp — Kế hoạch thực hiện readiness ở development

Ngày bắt đầu: **04/11/2026**. Tài liệu gốc: [Product readiness checklist](01_product_readiness_checklist.md).

## Mục tiêu và cách kết luận

Hoàn thành phần kiểm chứng có thể thực hiện ở development: build và test lặp lại được; dữ liệu test cách ly; luồng mua và quyền truy cập đúng; tính nhất quán tiền/tồn khi cạnh tranh hoặc retry; có baseline hiệu năng local và hồ sơ bằng chứng. Sửa lỗi tìm thấy bằng ca tái hiện trước, sau đó chạy lại kiểm thử liên quan.

Không coi unit test pass là integration pass, không coi test bị skip là đạt, không dùng mock provider để chứng nhận SePay Live. Các kết quả 1.000 VU trên hạ tầng thật, uptime 30 ngày, Core Web Vitals người dùng thật và pháp lý mở bán vẫn thuộc staging/production trong checklist gốc.

## Quy tắc thực hiện

- Tận dụng bộ test có sẵn; đọc setup và assertion trước khi dùng làm bằng chứng.
- Dùng PostgreSQL/Redis riêng cho readiness; không migrate, reset, seed hoặc load test database trong `.env` của nhóm.
- Khi phát hiện lỗi: tái hiện → assertion bắt lỗi → sửa → chạy lại → cập nhật báo cáo. Với kiểm thử hành vi đã đúng, bổ sung bằng chứng mà không sửa production code để tạo lỗi giả.
- Thanh toán/email/search/storage trong test tự động dùng adapter giả lập hoặc dịch vụ test riêng; test hợp đồng provider và sandbox được báo cáo riêng.
- Mỗi đợt lưu commit, lệnh, exit code, số test pass/fail/skip, môi trường và giới hạn. Log thô ở `.tmp/development-readiness/`; báo cáo đã rà dữ liệu nhạy cảm trong `docs/5-delivery`.
- Không cài thêm hạ tầng phức tạp nếu công cụ hiện có đủ đáp ứng; không thay đổi ngưỡng để làm kết quả pass.

## Các chặng và điều kiện hoàn thành

| Chặng | Checklist liên quan | Công việc cụ thể | Bằng chứng cần có |
| --- | --- | --- | --- |
| DEV-01 — Baseline | REL-01, NFR-07 | Đọc cấu hình test; chạy backend unit/coverage/build và frontend check; phân loại fail/skip | Kết quả từng lệnh, số test, coverage, lỗi gốc và trạng thái sửa |
| DEV-02 — Dữ liệu cách ly | PERF-03/05, REL-02 | Khởi động PostgreSQL/Redis test; migrate schema mới; có lệnh chạy lại và hướng dẫn cleanup đúng tài nguyên | Migration pass; guard ngăn trỏ vào DB không phải test; thông tin môi trường không chứa secret thật |
| DEV-03 — Đơn, tiền và tồn | TX-01…06, TX-11, PAY-03 | Chạy integration đã có, bổ sung ca còn thiếu: 50 người mua 10 hàng, trùng yêu cầu, voucher/điểm cuối, rollback, FEFO và hủy/hoàn | Response + kiểm tra DB trước/sau; test cạnh tranh thật; không còn sai tiền/tồn |
| DEV-04 — Thanh toán và job | TX-07…12, PAY-01/02 | SePay chữ ký/đối soát, duplicate, late payment, worker retry/crash; kiểm tra trạng thái tài liệu và UI | Test adapter/HTTP/DB, lịch sử sự kiện và bản ghi đối soát; phân biệt stub với sandbox thật |
| DEV-05 — Quyền và bảo mật | SEC-01…07, DATA-01 | Test khách khác ID, guest, quyền cửa hàng; session/refresh/reset; kiểm tra cấu hình, dependency và secret | Negative test, báo cáo scan đã phân loại, retest cho lỗi sửa |
| DEV-06 — Hành trình web | FUNC-01/02, UX-01/02/03, WEB-01/02 | Chạy UI suite; nghiệm thu frontend–BFF–API–DB thật trên dữ liệu riêng; xem viewport/accessibility và trạng thái lỗi | Trace/kết quả từng bước và tổng tiền/trạng thái DB; giới hạn browser/device ghi rõ |
| DEV-07 — Hiệu năng local | PERF-01…09, MET-01/02/04 | Production build; workload có version và dữ liệu đại diện; đo API và frontend local, tìm query chậm | Throughput, p50/p95/p99, lỗi, môi trường; không dùng số local để chứng nhận NFR-01 production |
| DEV-08 — Sự cố và bàn giao | REL-03…07, DR-01…03, OBS-01…03 | Diễn tập lỗi dependency/restart và restore ở local; ghi hướng dẫn chạy, báo cáo tổng hợp, việc chuyển staging | Kịch bản có thể chạy lại, bằng chứng không mất/trùng dữ liệu, danh sách chưa xác minh |

Thứ tự phụ thuộc: DEV-01 → DEV-02 → DEV-03/04/05 → DEV-06/07 → DEV-08. Có thể chạy các kiểm tra chỉ đọc/build độc lập đồng thời nếu đủ RAM; không chạy hai suite ghi chung fixture khi chưa chứng minh cách ly.

## Hiện trạng đã xác minh khi bắt đầu

- Node **22.14.0**, npm **10.9.2**; dependency backend/frontend đã có trên máy.
- Backend có Jest/Supertest, integration theo `TEST_DATABASE_URL`; nhiều suite bỏ qua khi biến này thiếu.
- Backend E2E sprint 4/5/6 dùng schema `sprint4_*`/`sprint5_*`/`sprint6_*` trên PostgreSQL local và tự chạy migration.
- Frontend `npm run check` gồm contract/inventory/format/lint/typecheck/unit/build.
- Playwright hiện chạy Next dev với health fixture; chưa phải bằng chứng full stack thật hay hiệu năng production.
- Lúc bắt đầu, Docker CLI có nhưng Docker engine chưa chạy; chưa có service lắng nghe ở 3000/3001/5432/6379. Đây là ảnh chụp thời điểm kiểm tra, không phải kết luận hạ tầng không thể chạy.
- Chưa chạy kiểm thử nào trong đợt này ở thời điểm lập kế hoạch; cập nhật kết quả vào báo cáo bên dưới thay vì sửa lịch sử baseline.

## Sổ theo dõi

| Chặng | Trạng thái | Bằng chứng / việc tiếp theo |
| --- | --- | --- |
| DEV-01 | Baseline đã kiểm chứng | Build backend/frontend đạt; unit 614 đạt/49 skip, integration 48/48, E2E 60/60; coverage lines 79,51%, branches 59,77%; còn đưa gate vào CI |
| DEV-02 | Đã kiểm chứng local | PostgreSQL/Redis riêng, migration/guard/env/exporter đạt; có hướng dẫn chạy lại; chưa thử máy/checkout mới |
| DEV-03 | Đã kiểm chứng các ca đã liệt kê | 50 khách/10 hàng ×20 vòng; 20 retry cùng key; web/POS ×20; FEFO, coupon/điểm, rollback/hủy/đổi trả; xem giới hạn trong báo cáo |
| DEV-04 | Đã kiểm chứng một phần | Payment integration/HTTP và retry đạt; README SePay thống nhất; provider thật và toàn bộ cửa sổ crash/restart còn thiếu |
| DEV-05 | Còn mở | Owner/session/CORS negative tests và secret scan đã có bằng chứng; dependency audit còn 3 high trong cây `--omit=dev` |
| DEV-06 | COD và UI smoke đã kiểm chứng | Production build + 4/4 ca Chromium desktop/mobile qua API/DB thật; UI fixture 53 đạt/1 skip phù hợp phạm vi; audit accessibility/WCAG/Safari chưa nghiệm thu |
| DEV-07 | Baseline API local đạt; chưa đủ NFR | 10.000 SKU, API p95 catalog 392 ms/detail 26 ms/search 312 ms; còn frontend lab và tải dài/staging |
| DEV-08 | Diễn tập local đạt; còn bàn giao staging | DB down/recovery, restart API, backup/restore 4 đơn đã kiểm chứng; không suy rộng thành RPO/RTO production |

## Điều kiện đóng phần development

1. Mọi chặng có kết quả và bằng chứng đúng phạm vi; thiếu môi trường hoặc test bị skip phải ghi chưa hoàn thành, không đổi thành đạt.
2. Các lỗi có thể sửa trong phạm vi development đã sửa và retest; không còn lỗi P0 đã biết trong phạm vi tính năng nghiệm thu.
3. Có hướng dẫn chạy lại từ checkout, dữ liệu cách ly và lệnh test rõ ràng.
4. Có báo cáo cuối liên kết các checklist ID với bằng chứng, kể cả phần cần kiểm tra tiếp trên staging/production.

Kế hoạch này theo dõi công việc thực thi; việc viết xong kế hoạch không đồng nghĩa phần development đã hoàn thành.

Kết quả và giới hạn cập nhật trong [báo cáo kiểm chứng development](03_development_verification_report.md).
