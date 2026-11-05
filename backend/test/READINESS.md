# Chạy kiểm thử development riêng

Kế hoạch: [02_development_execution_plan.md](../../docs/5-delivery/02_development_execution_plan.md).

## Môi trường

Node theo README dự án; `npm ci` và Prisma Client đã sinh trong `backend`. Docker engine cần hoạt động. Các mật khẩu trong compose chỉ dùng cho database test local, không phải secret triển khai.

Từ thư mục gốc:

```powershell
docker compose -f backend/test/compose.readiness.yml up -d --wait
```

PostgreSQL ở `127.0.0.1:55434`, DB `glowup_readiness_test`; Redis ở `127.0.0.1:56379`. Compose giới hạn RAM/CPU cho môi trường correctness, không dùng cấu hình này để kết luận khả năng chịu tải production.

## Backend

Từ `backend`, chạy lần lượt để hạn chế RAM:

```powershell
npm.cmd run test:readiness:tools
npm.cmd run test:readiness:unit
npm.cmd run test:readiness:integration
npm.cmd run test:readiness:e2e
npm.cmd run build
```

Trên hệ điều hành khác, dùng `npm` thay `npm.cmd`. Có thể gọi trực tiếp `node test/run-readiness.cjs <stage>`. Runner gọi Jest `--runInBand` trực tiếp để không phụ thuộc cách shell chuyển tiếp tham số.

- `unit`: bộ Jest hiện có với coverage; các suite yêu cầu DB được ghi là skip.
- `integration`: schema UUID mới trên DB local, migration rồi sáu suite integration; bài load tùy chọn chạy riêng.
- `e2e`: ba schema UUID mới dành cho sprint 4/5/6, kiểm tra HTTP/DB và thu coverage. E2E backend chưa phải E2E trình duyệt.
- Test export OpenAPI/Postman dùng `API_EXPORT_DIR` riêng trong `.tmp`, không ghi đè tài liệu API đang theo dõi trong Git.
- Mỗi lượt giữ lại schema test để điều tra. Chạy lại không dùng dữ liệu lượt trước.
- Runner chỉ sao chép biến hệ thống cần thiết và che các khóa trong `.env`/`.env.example`, không sử dụng giá trị credential của developer. Gateway được bật bởi fixture dùng thông tin giả; các adapter bên ngoài được stub trong suite. Không dùng runner này cho sandbox/Live.
- Kết quả ở `.tmp/development-readiness` tại gốc: `*-results.json`, `*-execution.json`, `coverage-integration`, `coverage-e2e`. Exit code khác 0 là không đạt. Sao lưu báo cáo cần giữ trước lượt chạy tiếp theo.

## Frontend

Từ `frontend`:

```powershell
npm.cmd run check
$env:TEST_SESSION_REDIS_URL = 'redis://127.0.0.1:56379'
$env:RUN_REDIS_TESTS = 'true'
node node_modules/vitest/vitest.mjs run --maxWorkers=1
```

Lệnh thứ hai bật các ca session Redis thật vốn bị skip trong unit baseline. Test dùng prefix ngẫu nhiên riêng; không dùng Redis của nhóm. Các lệnh build frontend vẫn theo cấu hình Next.js hiện tại; việc build được không chứng minh backend thật đã hoạt động hoặc deployment đã được nghiệm thu.

### Trình duyệt với backend thật

Từ `frontend`, chạy `npm.cmd run test:readiness`. Runner build production vào `.next-readiness`, chạy Chromium desktop và giả lập viewport iPhone 13 với Nest API, PostgreSQL và Redis test thật, rồi kiểm tra tổng tiền/trạng thái/tồn kho trong DB. Đây là COD; không gửi thanh toán hay email thật.

Các cổng riêng: API `3300`, HTTPS frontend `3301`, Next nội bộ `3302`, TLS proxy Redis `56380`. Cần các cổng trống và Chromium của Playwright đã cài (`npx playwright install chromium` nếu thiếu). Runner dùng OpenSSL trong PATH trên Linux/macOS; trên Windows dùng `C:/Program Files/Git/usr/bin/openssl.exe` đi kèm Git for Windows. Chứng thư local 7 ngày nằm trong `.tmp`; CA chỉ được tin trong các tiến trình test. Giữ nguyên yêu cầu Secure cookie và Redis TLS của production.

`npm.cmd run test:readiness -- --skip-build` chỉ dùng để điều tra trên bản build đã có; metadata ghi rõ đã bỏ bước build. Dùng lệnh mặc định khi nghiệm thu. Không chạy đồng thời với runner API bên dưới vì cùng cổng `3300`.

### Bộ UI fixture hiện có

Từ `frontend`, chạy `npm.cmd run test:readiness:ui`. Runner che credential developer, chạy bộ `tests/e2e` trên Next development ở `3401`, HTTP contract fixture `3100` và Redis riêng `56379`. Kết quả `ui-fixture-results.json` và `ui-fixture-execution.json` nằm trong `.tmp/development-readiness`. Bộ này kiểm tra UI/auth/OAuth giả lập, không thay thế nghiệm thu backend thật ở lệnh trên; tự dừng sau 3 ca lỗi để điều tra.

## Baseline API và diễn tập khôi phục

Từ `backend`, sau các bài correctness:

```powershell
npm.cmd run test:readiness:benchmark
npm.cmd run test:readiness:api
```

Benchmark tạo schema mới với 10.000 SKU, đo catalog trực tiếp qua service/DB, lưu query plan thực tế và kiểm tra p95 ≤500 ms. Runner API dùng dữ liệu benchmark đó, khởi động Nest riêng, đo 20 request/route với 4 worker, rồi dừng **PostgreSQL của project readiness** để kiểm tra live/ready, bật lại và thử restart tiến trình. Chạy tuần tự; không dùng các số này để chứng nhận 1.000 người dùng hay SLO triển khai. Kết quả: `catalog-benchmark.json`, `api-benchmark.json` trong `.tmp/development-readiness`.

Sau khi trình duyệt full stack đạt, từ `backend` chạy `npm.cmd run test:readiness:restore`. Script backup fixture 4 đơn, restore sang database test mới, đối chiếu đơn/tiền/payment/tồn/idempotency và constraint. Marker tạo sau backup phải không xuất hiện trong bản restore. Kết quả: `restore-result.json`; không thay đổi đơn gốc. Bài này chưa chứng minh RPO/PITR, RTO production, ảnh/object storage hay đối soát ngân hàng.

## Dừng và dọn

Từ gốc, dừng riêng dịch vụ readiness:

```powershell
docker compose -f backend/test/compose.readiness.yml stop
```

Khi không cần dữ liệu điều tra nữa, lệnh sau xóa container/volume **của project `glowup-readiness`** và mọi schema test trong đó:

```powershell
docker compose -f backend/test/compose.readiness.yml down --volumes
```

Không dùng lệnh prune toàn Docker, không dừng server Node hay container của dự án khác. `.env` và database đang phát triển của nhóm không cần thay đổi để chạy các test backend trên.
