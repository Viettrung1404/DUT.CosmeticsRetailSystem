# Handoff review BE cho frontend

Ngày: 26/10/2026. Đây là backlog để review, không phải issue đã giao hay xác nhận BE đã sửa. Source BE không thay đổi trong FE-00.

| Ticket | Owner tham chiếu | Contract cần bàn giao / nghiệm thu | Gate | Trạng thái |
|---|---|---|---|---|
| BE-FE-01 / O01 | BE End-user + Admin | Public DTO allowlist không costPrice ở list/detail/related, anonymous và signed-in; spec public tương ứng | FE-02 | Chưa bàn giao |
| BE-FE-01 / O02 | BE End-user + Admin | Response DTO chính xác, decimal/nullable/required quoteVersion, inherited query, stable errors/headers; export spec + fixtures runtime | FE-02/03/04/05 | Chưa bàn giao |
| BE-FE-02 / G01 | BE End-user/payment | VNPAY attempts/status/return/IPN/query/refund, ownership/idempotency/late charge/reservation; sandbox thật | FE-03 và release | Bắt buộc, chưa có contract |
| BE-FE-03 / O03/G07 | BE End-user | Flash cards có name/image/slug/price/availability; promotion detail + products pagination, serverTime/quota/expiry | FE-06 | Chưa bàn giao |
| BE-FE-04 / O05 | BE End-user/CMS | GET blog read-only; view event có dedupe/rate limit; metadata/prefetch không tăng view | FE-06 | Chưa bàn giao |
| BE-FE-05 / G02/G03 | BE + Admin/content | Public brand/store reads hoặc nguồn được duyệt, logo/slug/coordinates/active states | FE-06 | Chưa chốt endpoint/nguồn |
| ENV-01 / O09 | BE/deployment | SMTP/OAuth/storage/migrations, origin 3001, trusted proxy/IP, Redis sessions và refresh outcome khi timeout | FE-01 và staging | Cần kiểm chứng môi trường |

Mỗi bàn giao cần: OpenAPI cập nhật, request/response fixture đã loại PII, negative cases, test ownership, pagination/headers, endpoint readiness. FE chạy `contracts:generate`, review diff và cập nhật capability/integration riêng; không bật tính năng chỉ vì enum/type tồn tại.

Chi tiết và bằng chứng source: [03 API contracts](../../docs/3-planning/fe/03_api_contracts_and_gaps.md). CTA thiếu API bỏ theo D06; page brand/store vẫn thuộc phạm vi. VNPAY không bị biến thành optional flag.
