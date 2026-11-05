# GlowUp — Checklist để sản phẩm sẵn sàng vận hành

Ngày lập: **04/11/2026**. Phạm vi: website bán mỹ phẩm của chuỗi cửa hàng, các API và quy trình quản trị cần để xử lý đơn thực tế.

**Đây là kế hoạch nghiệm thu, chưa phải báo cáo hệ thống đã đạt.** Các ô ban đầu đều chưa được xác minh. Việc đọc mã nguồn, thấy có test hay chạy được trang chủ không đủ để đánh dấu đạt.

## 1. Có phải deploy rồi mới biết hệ thống có tốt không?

**Có thể và nên kiểm tra phần lớn yêu cầu ngay trong development.** Tuy nhiên, kết quả hiệu năng phụ thuộc máy chủ, database, mạng, dữ liệu và cách triển khai. Cần ba lớp bằng chứng:

| Giai đoạn | Kiểm tra được gì? | Chưa thể kết luận gì? |
| --- | --- | --- |
| Development/CI: máy lập trình và pipeline tự động | Logic tính tiền, quyền truy cập, transaction, xử lý đồng thời với DB thật, hợp đồng API, UI, lỗi thường gặp; đo hiệu năng sơ bộ | Sức chịu tải của server thật; uptime; trải nghiệm trên mạng của khách |
| Staging: môi trường thử riêng, cấu hình gần production | Chạy bản build, tải dự kiến, TLS/domain/proxy, session, migration, backup/restore, mất kết nối và restart | Uptime trong một tháng; hành vi và thiết bị của người dùng thật |
| Production: môi trường phục vụ khách | Smoke test sau deploy, số đo người dùng thật, tỷ lệ lỗi, đơn và thanh toán bất thường, dung lượng và chi phí thực tế | Không suy ra bảo đảm vĩnh viễn từ một lần chạy tốt; cần theo dõi liên tục |

Deploy lên **staging** là một bước kiểm thử trước khi mở bán. Nếu chưa thuê server, có thể chạy production build và PostgreSQL/Redis riêng trên máy cá nhân để phát hiện lỗi; báo cáo phải ghi rõ đây là kết quả local.

Một product vận hành được cần đồng thời: **bán đúng hàng và đúng tiền; đủ nhanh; an toàn; có thể phát hiện lỗi; có thể khôi phục; có người xử lý đơn và sự cố**. Không cần dùng microservices hay Kubernetes để đáp ứng checklist này.

## 2. Căn cứ trong repository và phạm vi nghiệm thu

Đã đối chiếu [README gốc](../../README.md), [yêu cầu dự án](../1-requirement/01_tong_quan_va_yeu_cau.md), [package backend](../../backend/package.json), [package frontend](../../frontend/package.json) và [runbook SePay](../../backend/docs/sepay-setup.md).

| Căn cứ hiện có | Ý nghĩa khi nghiệm thu |
| --- | --- |
| Next.js/React; NestJS; Prisma 6; PostgreSQL; Redis | Ưu tiên công cụ tương thích stack hiện tại; kiểm tra cả tuyến trình duyệt → Next.js/BFF → NestJS → DB |
| Checkout mới dùng COD và SePay; có luồng guest | Nghiệm thu cả khách đăng nhập lẫn khách vãng lai nếu được mở; không mặc định VNPay/MoMo là cổng đang dùng |
| NFR-01: 1.000 người dùng đồng thời, API dưới 500 ms, trang dưới 3 giây | Giữ nguyên mục tiêu; bổ sung định nghĩa tải và phép đo ở mục 4–5. Chưa có bằng chứng trong tài liệu này rằng đã đạt |
| NFR-04: uptime 99,9%, tự phục hồi, backup hằng ngày | Phải có giám sát và diễn tập phục hồi; một lần load test không chứng minh uptime |
| NFR-07: độ phủ test > 60%; NFR-08: WCAG 2.1 AA | Báo cáo phạm vi coverage và rà soát accessibility; phần trăm coverage không thay thế test nghiệp vụ |
| Yêu cầu tổng quan còn có POS, kho đa chi nhánh, mobile | Tài liệu này tập trung website. Nếu POS/kho cùng ghi vào tồn kho, bắt buộc kiểm tra cạnh tranh với web. App mobile độc lập không thuộc đợt này |

**Điểm cần thống nhất khi triển khai:** README gốc mô tả SePay hoàn tất đi tới `CONFIRMED`, trong khi runbook SePay mô tả `PENDING_PAYMENT → PENDING → CONFIRMED` với bước xác nhận của nhân viên. Phải xác minh state machine trong mã, chạy E2E và thống nhất tài liệu trước nghiệm thu; không dùng hai kỳ vọng khác nhau cho cùng một đơn.

Các tham số chưa có dữ liệu thực tế được ghi là **đề xuất**: cấu hình máy chủ, quy mô dữ liệu, phân bố lưu lượng, thời gian chạy test, RPO/RTO, ngưỡng cảnh báo. Chủ dự án cần chốt trước đợt đo chính thức và giữ nguyên trong suốt đợt đo; không đổi ngưỡng sau khi thấy kết quả xấu.

## 3. Cách sử dụng checklist

- **P0 — chặn mở bán:** sai tiền/tồn kho, lộ dữ liệu, mất đơn, thiếu khôi phục hoặc thiếu khả năng xử lý sự cố. Phải đạt trước khi phục vụ khách và giao dịch thật.
- **P1 — điều kiện nghiệm thu đầy đủ:** hiệu năng theo NFR, trải nghiệm, tương thích, tự động hóa và vận hành ổn định. Nếu chỉ pilot giới hạn, ghi rõ mục chưa đạt, giới hạn sử dụng, người chịu trách nhiệm và hạn xử lý; không tuyên bố hoàn thành toàn bộ NFR.
- **P2 — cải tiến theo số liệu:** tối ưu và mở rộng sau khi có nhu cầu. Không bắt buộc mua thêm hạ tầng trước khi biết điểm nghẽn.

Mỗi ID bên dưới là một đầu việc. Lưu trạng thái `Chưa kiểm tra / Đang làm / Đạt / Không đạt / Không áp dụng`, người phụ trách và liên kết bằng chứng theo mẫu ở mục 12. `Không áp dụng` cần lý do cụ thể; tính năng chưa hoàn thành nhưng vẫn mở cho khách không được coi là không áp dụng.

**Đạt = có tiêu chí + đã chạy đúng môi trường + có kết quả kiểm chứng + có người xem lại.** Checklist được thiết kế cho phạm vi GlowUp; không phải chứng nhận bảo mật, pháp lý hay cam kết không bao giờ xảy ra lỗi.

## 4. Chỉ số và mục tiêu cần chốt trước khi đo

### 4.1. Hiểu đúng các con số

| Thuật ngữ | Cách hiểu thực dụng |
| --- | --- |
| p95, p99 | p95 = 95% mẫu có thời gian không vượt giá trị đó. Phải báo cáo thêm p99, tỷ lệ lỗi và số mẫu; trung bình có thể che các request rất chậm |
| VU — người dùng ảo | Một tác nhân chạy kịch bản; không đồng nghĩa một người dùng thật hoặc một request đang xử lý |
| RPS / throughput | Số request mỗi giây. Tách số được gửi, được phục vụ thành công và bị từ chối |
| SLI / SLO | SLI là phép đo; SLO là mục tiêu của phép đo trong một cửa sổ thời gian. SLA là cam kết dịch vụ, không tự suy ra từ kết quả test |
| RPO | Khoảng dữ liệu tối đa có thể mất khi phục hồi, ví dụ 15 phút gần nhất |
| RTO | Thời gian tối đa để khôi phục dịch vụ đến mức sử dụng đã xác định |

Chọn chỉ số theo trải nghiệm và nghiệp vụ cần bảo vệ, rồi điều chỉnh mục tiêu bằng bằng chứng thực tế. Đây là cách tiếp cận của [Google SRE về SLO](https://sre.google/workbook/implementing-slos/).

### 4.2. Bảng mục tiêu nghiệm thu ban đầu

Các ngưỡng có nhãn **đề xuất** là lựa chọn kỹ thuật cho GlowUp, không phải tiêu chuẩn bắt buộc của ngành.

| ID | Chỉ số / mục tiêu | Cách đo và điều kiện đạt |
| --- | --- | --- |
| MET-01 | API dưới 500 ms theo NFR; **đề xuất định nghĩa p95 < 500 ms**, p99 < 1.000 ms cho từng nhóm API đồng bộ thông thường | Đo tại client tải qua ingress/API thật, ghi cả thời gian HTTP và tổng thời gian request kể cả DNS/kết nối/TLS; không chỉ đo thời gian trong controller. Áp dụng ở tải mục tiêu, không gộp tất cả endpoint để che checkout chậm |
| MET-02 | Lỗi kỹ thuật **< 1%** ở tải mục tiêu — đề xuất | Mẫu số là mọi request dự kiến hợp lệ; tử số gồm 5xx, timeout, lỗi mạng, response sai hợp đồng và 429 làm khách hợp lệ không thực hiện được tác vụ. Các test cố ý gây 4xx được báo cáo riêng; không loại lỗi bằng cách đổi tên status |
| MET-03 | 1.000 người dùng đồng thời theo NFR | Kịch bản VU có thao tác và thời gian suy nghĩ ở mục 5; duy trì mức 1.000 VU trong 30 phút, đáp ứng MET-01/02, không sai dữ liệu. Báo cáo RPS thực đạt và phân bố endpoint |
| MET-04 | Trang dưới 3 giây; tìm kiếm dưới 1 giây theo NFR | Đề xuất đo từ điều hướng đến khi nội dung chính hiện và có thể thao tác; tìm kiếm từ gửi truy vấn đến hiện kết quả. Ghi thiết bị, mạng, cache và p95. Đây là phép đo riêng với Core Web Vitals |
| MET-05 | LCP ≤ 2,5 giây; INP ≤ 200 ms; CLS ≤ 0,1 | Mục tiêu trải nghiệm theo [Web Vitals](https://web.dev/articles/vitals), đánh giá p75 dữ liệu thực, tách mobile/desktop. Trước mở bán dùng lab để phát hiện vấn đề; sau mở bán mới xác nhận bằng dữ liệu người dùng đủ mẫu |
| MET-06 | Uptime 99,9% theo NFR | Đề xuất cửa sổ lăn 30 ngày, probe HTTPS bên ngoài mỗi phút; thành công khi trang chính và API danh mục trả đúng nội dung trong 5 giây. Ngân sách gián đoạn tương đương 43,2 phút/30 ngày; ghi rõ cách xử lý mất dữ liệu giám sát, không tự tính khoảng trống là uptime |
| MET-07 | Toàn vẹn tiền, đơn, tồn, voucher và điểm: **0 sai lệch** trong bộ kiểm thử | So sánh dữ liệu trước/sau mọi case cạnh tranh, retry và lỗi giữa chừng ở mục 6. Đây là điều kiện P0, không được dùng ngưỡng lỗi 1% để chấp nhận sai tiền |
| MET-08 | Khôi phục: **RPO ≤ 15 phút; RTO ≤ 60 phút** — đề xuất cho bán thật | Phải chứng minh bằng phục hồi vào môi trường khác và kiểm tra đơn/tiền/tồn. Backup ngày đơn lẻ có thể mất gần 24 giờ dữ liệu, không đáp ứng RPO này; cần PITR hoặc phương án tương đương |
| MET-09 | Xử lý payment sau khi nhận sự kiện hợp lệ: **p95 ≤ 60 giây** khi provider bình thường — đề xuất | Đo từ inbox nhận webhook đến trạng thái nghiệp vụ sau đối soát. Tách độ trễ ngân hàng/provider trước webhook; ghi số mẫu và số payment còn treo |

**MET-01 là cách diễn giải cần chốt**, vì yêu cầu cũ chưa ghi percentile. Nếu nghiệm thu yêu cầu mọi request đều < 500 ms thì phải đo cả giá trị lớn nhất và áp dụng yêu cầu đó. Export báo cáo, upload lớn hoặc chờ đối tác cần SLO riêng/luồng bất đồng bộ được ghi nhận trước; không tự miễn trừ toàn bộ checkout.

MET-06 chỉ đo khả dụng các đường được probe. Theo dõi riêng tỷ lệ tạo đơn thành công và tuổi payment chờ xử lý để phát hiện trường hợp trang chủ vẫn lên nhưng không bán được hàng. Định nghĩa cửa sổ, tỷ lệ lỗi request và uptime theo thời gian là các phép đo khác nhau, không hoán đổi mẫu số.

## 5. Chịu tải và hiệu năng: kiểm thử có thể lặp lại

### 5.1. Chuẩn bị môi trường và dữ liệu

- [ ] **PERF-01 · P1:** Chạy `build` và chế độ phục vụ production, không dùng `next dev`/watch để kết luận hiệu năng production. Ghi commit, Node/PostgreSQL, CPU/RAM, số replica, region, DB tier/pool, Redis, proxy, CDN và quota.
- [ ] **PERF-02 · P1:** Máy tạo tải tách khỏi máy ứng dụng khi nghiệm thu; theo dõi cả CPU/RAM/network máy tải. Test từ cùng khu vực người dùng dự kiến và ghi vị trí máy tải; không dùng độ trễ nội bộ để đại diện khách Việt Nam.
- [ ] **PERF-03 · P1:** Seed dữ liệu tổng hợp đủ lớn và hợp lệ. Bộ đầu tiên đề xuất: 5 cửa hàng, 10.000 SKU/biến thể, 50.000 khách, 100.000 đơn kèm chi tiết, nhiều lô và hạn dùng, voucher còn/hết lượt. Đây là dữ liệu stress kỹ thuật, không phải dự báo kinh doanh; điều chỉnh theo phạm vi 5–20 chi nhánh của yêu cầu dự án.
- [ ] **PERF-04 · P1:** Có sản phẩm phổ biến và ít truy cập, truy vấn có/không có kết quả, nhiều trang phân trang; đo cache lạnh và nóng. Không chỉ lặp một sản phẩm luôn cache hit.
- [ ] **PERF-05 · P0:** Chỉ sinh tải ghi trên DB/test tenant riêng; tạo đủ tồn và tài khoản để không hết hàng giữa đợt đo thông thường. Cô lập email, thanh toán, vận chuyển bằng stub; nghiệm thu tích hợp thật chạy riêng với lưu lượng nhỏ. Có ngưỡng dừng theo quota/chi phí đã chốt.

### 5.2. Mô hình tải đề xuất

Đối với bài **1.000 VU**, mỗi VU giữ session riêng và lặp hành trình với khoảng nghỉ ngẫu nhiên 2–5 giây giữa các thao tác. Phân nhóm: 70% duyệt/tìm kiếm/xem chi tiết, 20% đăng nhập–giỏ hàng–báo giá, 8% tạo đơn COD/SePay giả lập và xem trạng thái, 2% nhân viên quản lý đơn/tồn. Đây là tỷ trọng **VU**, không phải tỷ trọng request; phải lưu RPS theo endpoint thực tế. Nếu vận hành POS cùng backend, bổ sung nhóm POS và ghi lại phân bố mới.

Để kiểm tra **tốc độ request đầu vào**, chạy thêm bài open model riêng: ví dụ 20 → 50 → 100 request/giây rồi tăng cho đến ngưỡng không đạt. Với k6 `constant-arrival-rate`, `rate` là **iterations/đơn vị thời gian**; chỉ tương đương RPS khi mỗi iteration gửi đúng một request. Chọn tỷ lệ endpoint cụ thể trước khi chạy; không quy đổi 1.000 VU thành 1.000 RPS. Xem [mô hình arrival rate của k6](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/).

| Bài test | Cách chạy đề xuất | Kết quả cần lưu |
| --- | --- | --- |
| Smoke tải | 1–5 VU, 2–5 phút | Kịch bản chạy đúng, có kiểm tra response/body và dữ liệu; không phải đo sức chịu tải |
| Baseline | 50–100 VU, 10 phút | Mức tham chiếu cho các lần thay đổi code; không thay thế mục tiêu 1.000 VU |
| Load mục tiêu | Warm-up 5 phút; tăng 100 → 300 → 500 → 1.000 VU, mỗi mức 5 phút; giữ 1.000 VU 30 phút | p50/p95/p99 từng nhóm, lỗi, throughput, CPU/RAM, DB pool/locks, Redis, event loop; đánh giá riêng cửa sổ ổn định 30 phút |
| Spike | Tăng nhanh từ 100 lên 1.000 VU trong khoảng 30 giây, giữ 5 phút, hạ tải | Có timeout/rate limit có kiểm soát, không sai dữ liệu; đề xuất về lại SLO trong 5 phút sau hạ tải |
| Stress | Tăng vượt tải mục tiêu theo bậc 10–15 phút đến ngưỡng dừng | Điểm gãy, điểm nghẽn đầu tiên, mức tải an toàn đã chứng minh; lỗi latency khi vượt ngưỡng có thể dự kiến nhưng mất/sai dữ liệu luôn không đạt |
| Soak | 4 giờ ở khoảng 60–70% tải an toàn vừa đo | Bộ nhớ, connection, queue, lưu trữ không tăng vô hạn; không phát sinh sai lệch sau xử lý job dài hạn |

Lặp lại bài load nghiệm thu ít nhất hai lần trên cùng cấu hình/dữ liệu tương đương, báo cáo cả hai và điều tra khác biệt. Các mốc thời gian trên là đề xuất thực hành, không phải số liệu do nguồn bên ngoài chứng nhận.

- [ ] **PERF-06 · P1:** Dùng k6 đặt threshold theo endpoint/scenario; thêm check trạng thái và nội dung nghiệp vụ. **Check thất bại phải được đưa vào threshold** để CI fail; không chỉ xem log màu xanh. [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/) hỗ trợ điều kiện pass/fail.
- [ ] **PERF-07 · P1:** Báo cáo `dropped_iterations`, offered load và achieved load. Ở tải mục tiêu yêu cầu `dropped_iterations = 0` — đề xuất; nếu thiếu năng lực máy tạo tải, sửa cấu hình và chạy lại. Không coi bài bị hụt tải là đạt. [k6 dropped iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/dropped-iterations/).
- [ ] **PERF-08 · P1:** Đo cả backend trực tiếp để tìm điểm nghẽn và đường public qua BFF/SSR để nghiệm thu. Theo dõi truy vấn chậm/N+1, `EXPLAIN (ANALYZE, BUFFERS)` trên môi trường test, index, phân trang, payload, pool và lock wait. Không chạy `EXPLAIN ANALYZE` lệnh ghi trên dữ liệu thật chỉ để xem kế hoạch.
- [ ] **PERF-09 · P1:** Báo cáo headroom: đề xuất CPU trung bình < 70%, pool < 80% ở tải mục tiêu và bộ nhớ ổn định sau warm-up; ghi ngưỡng riêng theo nền tảng. Các tỷ lệ này là tín hiệu vận hành, không thay thế tiêu chí latency/lỗi.

## 6. Transaction, tồn kho, thanh toán: ưu tiên cao nhất

### 6.1. Các bất biến cần giữ

- Một đơn ghi nhận thành công phải có đủ chi tiết đơn, snapshot giá/giảm giá/phí, giữ hoặc xuất tồn theo chính sách, và thay đổi voucher/điểm tương ứng; không để lại trạng thái nửa vời.
- Không bán quá tồn có thể bán; không dùng cùng lượt voucher/điểm nhiều lần. Tồn thực tế, tồn giữ, tồn khả dụng phải có định nghĩa thống nhất cho từng SKU–cửa hàng–lô.
- Giá, quyền giảm giá, phí và tổng tiền do server tính. Tiền VND lưu/xử lý bằng số nguyên hoặc decimal chính xác, có quy tắc làm tròn; không tin tổng tiền client gửi.
- Giá đơn cũ không thay đổi theo giá catalog mới. Trạng thái đơn, payment, giao hàng và hoàn tiền có chuyển trạng thái hợp lệ, được kiểm tra phía server.
- Xử lý lặp cùng một yêu cầu không tạo hiệu ứng tài chính lặp. Hủy/hoàn không cộng lại tồn/điểm/voucher hai lần; hàng hoàn cần kiểm tra chất lượng trước khi trở thành tồn bán được.

Transaction DB không tự bao phủ chuyển khoản ngân hàng, gửi email hay gọi đối tác. Với Prisma, cần chọn transaction, constraint, cập nhật có điều kiện/khóa hoặc version phù hợp; thêm idempotency cho retry. Tham khảo [Prisma 6 transactions](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). Không giữ transaction mở để chờ HTTP từ provider.

Khi gặp serialization failure, retry **toàn bộ transaction** với số lần hữu hạn và backoff; không chỉ chạy lại câu SQL cuối. Cần phân loại lỗi thay vì retry mọi lỗi nghiệp vụ. Xem [PostgreSQL: xử lý serialization failure](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html).

### 6.2. Bộ test bắt buộc trên PostgreSQL thật, nhiều kết nối

Mỗi ca dưới đây phải kiểm tra **response lẫn dữ liệu cuối cùng**, chạy nhiều lần và lưu bằng chứng. Mock DB hoặc test lần lượt không chứng minh được tính đúng khi cạnh tranh.

| ID / mức | Kịch bản | Tiêu chí đạt |
| --- | --- | --- |
| TX-01 · P0 | Một SKU còn 10 sản phẩm hợp lệ; 50 yêu cầu độc lập cùng mua 1 sản phẩm, không có tồn bổ sung | Đúng 10 yêu cầu được cấp/giữ hàng; 40 bị từ chối theo nghiệp vụ; tổng giữ/xuất không vượt 10; tồn không âm. Lặp ít nhất 20 vòng với fixture mới |
| TX-02 · P0 | 20 request đồng thời cùng idempotency key; sau đó retry khi client timeout sau commit | Chỉ một đơn và một hiệu ứng kho/điểm/voucher. Key gắn với chủ thể + thao tác; đổi payload với key cũ bị từ chối; khác khách không đọc được kết quả của nhau |
| TX-03 · P0 | Voucher còn 1 lượt; tài khoản có số điểm chỉ đủ dùng một lần; nhiều checkout đồng thời | Chỉ số lượt/số điểm hợp lệ được dùng, không âm; ca bị từ chối không để lại reservation |
| TX-04 · P0 | Chèn lỗi sau từng bước ghi đơn, giữ tồn, trừ điểm/voucher, trước commit | Rollback đầy đủ hoặc trạng thái trung gian bền vững có cơ chế phục hồi đã kiểm thử; không trả thành công cho thao tác chưa hoàn tất |
| TX-05 · P0 | POS và web cùng mua sản phẩm cuối; điều chuyển giữa hai chi nhánh trong lúc checkout | Không bán vượt tồn khả dụng và không ghi nhận hàng đang vận chuyển là hàng bán được ở cả hai nơi |
| TX-06 · P0 | Lô hết hạn/cận hạn, nhiều lô cùng SKU, ranh giới ngày/hạn sử dụng | Chặn hàng hết hạn; áp dụng chính sách cận date online và FEFO đã chốt; dùng Asia/Ho_Chi_Minh cho quy tắc ngày kinh doanh, lưu timestamp nhất quán |
| TX-07 · P0 | Gửi webhook hợp lệ lặp 20 lần; hai worker nhận cùng giao dịch | Một giao dịch chỉ ghi nhận/áp dụng một lần, có unique constraint hoặc cơ chế tương đương bền vững; restart không mất chống trùng |
| TX-08 · P0 | Sai chữ ký, payload bị sửa, sai tài khoản nhận, sai số tiền, sai mã nội dung hoặc giao dịch tiền ra | Không chuyển đơn sang đã thanh toán; có lý do và bản ghi tra soát phù hợp, không ghi secret vào log |
| TX-09 · P0 | Webhook đến sau khi hết hạn 15 phút; hủy và webhook cùng thời điểm; tiền đến sau khi hàng đã bán cho người khác | Không tự xác nhận một đơn không còn hàng. Ghi nhận tiền đến và đưa vào luồng tra soát/hoàn theo chính sách; mọi khoản có người xử lý và dấu vết |
| TX-10 · P0 | Người dùng sửa query trên trang return hoặc tự gọi API báo thanh toán thành công | Trình duyệt không thể xác nhận tiền; backend xác minh bằng kênh đáng tin cậy và đối soát theo thiết kế |
| TX-11 · P0 | Hủy/hoàn lặp, hoàn một phần, hai nhân viên thao tác cùng lúc | Tổng hoàn không vượt khoản được hoàn; có phân quyền, lý do và audit; trạng thái chỉ hoàn tất khi có bằng chứng chuyển hoàn; tồn/điểm hoàn đúng chính sách |
| TX-12 · P0 | Process chết sau khi nhận webhook, sau commit nhưng trước trả response, hoặc trước gửi email | Webhook đã ACK có bản ghi bền vững; khởi động lại xử lý tiếp, không mất đơn và không tạo đơn/hoàn tiền trùng; email lỗi không đảo ngược giao dịch đã commit |

Với SePay, nghiệm thu riêng chữ ký HMAC và cơ chế gửi lại theo [tài liệu xác thực](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc) và [hướng dẫn webhook](https://developer.sepay.vn/vi/sepay-webhooks). Thiết kế theo hướng có thể nhận trùng; không giả định provider chỉ gửi một lần.

- [ ] **PAY-01 · P0:** Có đối soát định kỳ giữa payment nội bộ và giao dịch provider, kể cả khi webhook mất. Phát hiện thiếu/thừa/sai tiền, payment treo và đơn đã nhận tiền nhưng chưa xử lý; mỗi ngoại lệ có trạng thái và người phụ trách.
- [ ] **PAY-02 · P0:** Job hết hạn đơn, giải phóng reservation, cộng/hoàn điểm và retry có dữ liệu bền vững; nhiều instance không chạy hiệu ứng lặp. Thử worker ngừng rồi bật lại, lease hết hạn và job lỗi liên tục; có giới hạn retry và hàng chờ cần can thiệp.
- [ ] **PAY-03 · P0:** COD phân biệt đơn đã giao với tiền đã thu/đối soát. SePay phân biệt payment hoàn tất với đơn được nhân viên xác nhận; dashboard, UI và API dùng cùng định nghĩa.

## 7. Checklist vận hành toàn sản phẩm

### 7.1. Luồng nghiệp vụ và trải nghiệm

| ID / mức | Cần đảm bảo | Cách kiểm chứng / bằng chứng |
| --- | --- | --- |
| FUNC-01 · P0 | Khách tìm hàng → chọn biến thể → giỏ → địa chỉ → phí/voucher/điểm → đặt COD hoặc SePay → theo dõi → nhân viên xử lý | E2E trên frontend, backend, DB thật; kiểm tra nội dung và tổng tiền ở mọi bước. Chạy guest và tài khoản nếu cả hai được mở |
| FUNC-02 · P0 | Người vận hành có thể xác nhận, đóng gói, giao, hủy, nhận trả, tra soát và hoàn theo quyền | Một người ngoài nhóm lập trình thực hiện theo hướng dẫn bằng dữ liệu test; không cần sửa SQL để xử lý đơn thông thường |
| FUNC-03 · P0 | Chính sách mỹ phẩm thể hiện đúng trong dữ liệu và UI | Kiểm tra SKU/màu/dung tích, đơn vị, ảnh, thương hiệu, thành phần, thông tin sử dụng, xuất xứ, lô/hạn dùng và hàng ngừng bán. Không hiển thị số liệu demo như số liệu bán thật |
| UX-01 · P1 | Hết hàng/giá đổi/voucher hết lượt, timeout và thanh toán chờ đều có hướng xử lý | Test mạng chậm/mất mạng, refresh/back/nhiều tab; giữ dữ liệu form thích hợp, chống bấm lặp, cho tra cứu trạng thái khi chưa biết request đã thành công |
| UX-02 · P1 | Mobile và trình duyệt mục tiêu sử dụng được; không chỉ render được | Chạy hành trình mua ở 320 px, mobile và desktop đến 4K; đối chiếu hai phiên bản mới nhất Chrome/Firefox/Edge/Safari theo NFR. WebKit mô phỏng không thay thế hoàn toàn thử Safari/iOS thật |
| UX-03 · P1 | WCAG 2.1 AA theo NFR | Kiểm tra bàn phím, focus, label, thông báo lỗi, tương phản, zoom và trình đọc màn hình ở luồng mua. Dùng axe/Lighthouse hỗ trợ và ghi các tiêu chí đã rà; scan tự động không đủ chứng minh toàn bộ AA. [W3C WCAG Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) |
| WEB-01 · P1 | Ảnh và frontend không làm API nhanh trở nên vô nghĩa | Lighthouse/DevTools trên production build: ảnh đúng kích thước, lazy load hợp lý, kích thước JS, cache, CLS, thao tác giỏ. Thu RUM sau mở bán; Lighthouse TBT không phải phép đo INP thực |
| WEB-02 · P1 | SEO phù hợp môi trường | Trang sản phẩm public có metadata, canonical, sitemap, JSON-LD đúng giá/tình trạng; trang riêng tư không index. Staging noindex và có kiểm soát truy cập. Kiểm tra bỏ noindex ở trang bán hàng production; smoke script hiện tại có kiểm tra noindex nên cần cấu hình/test riêng cho public launch. Lighthouse SEO > 90 theo NFR |

### 7.2. Bảo mật và dữ liệu cá nhân

Lấy [OWASP ASVS 5.0](https://asvs.owasp.org/) làm danh mục tham chiếu, ghi phiên bản và các mục đã kiểm tra. Những hàng dưới đây là ưu tiên cho GlowUp, không đại diện toàn bộ ASVS. Quét tự động phải đi cùng test phân quyền và logic nghiệp vụ.

| ID / mức | Cần đảm bảo | Cách kiểm chứng / bằng chứng |
| --- | --- | --- |
| SEC-01 · P0 | Quyền theo vai trò, đối tượng và chi nhánh được kiểm tra ở server | Khách A thay ID xem/sửa đơn, địa chỉ, payment, ảnh trả hàng của B đều bị chặn; guest token không dò được; nhân viên cửa hàng A không vượt quyền sang B; gọi API trực tiếp vẫn bị chặn |
| SEC-02 · P0 | Đăng nhập/session/reset mật khẩu đúng vòng đời | Test token hết hạn/thu hồi, refresh đồng thời và replay, logout, khóa tài khoản, token reset dùng một lần, cookie Secure/HttpOnly/SameSite theo thiết kế và chống CSRF với cookie. Tài khoản quản trị có bảo vệ tăng cường như MFA |
| SEC-03 · P0 | Đầu vào, upload và nội dung không dẫn đến injection/lạm dụng | Test validation server, SQL injection, XSS trong review/CMS, CSRF, URL fetch/SSRF nếu có, file sai MIME/kích thước; giới hạn body, phân trang, thời gian xử lý. File riêng tư không có URL public vô hạn |
| SEC-04 · P0 | HTTPS và cấu hình public đúng | Kiểm tra domain/TLS, tự gia hạn chứng chỉ, CORS allowlist, security headers/CSP phù hợp, proxy trust đúng, debug/stack trace và endpoint quản trị không lộ. CORS không thay thế authorization |
| SEC-05 · P0 | Secret và thông tin khách không bị phát tán | Quét Git/build/log, dependency audit và kiểm tra bundle frontend; không có JWT secret, DB/provider key. Secret từng môi trường tách biệt; log che token/cookie, địa chỉ/số điện thoại nhạy cảm; thử quy trình rotate secret |
| SEC-06 · P0 | Chống dò mật khẩu, spam OTP/email, giữ hàng hàng loạt | Test giới hạn theo chủ thể/IP phù hợp ở login, reset, checkout và upload; dùng store chung khi nhiều instance. Tải khách bình thường không bị chặn hàng loạt do cùng IP proxy |
| SEC-07 · P0 | Lỗ hổng được xử lý trước release | Lưu `npm audit`, scan secret và ZAP; không còn lỗi Critical/High có đường khai thác trong phạm vi phát hành. Finding phải phân loại, có bằng chứng nếu false positive; không dùng `audit fix --force` thiếu đánh giá |
| DATA-01 · P0 | Biết dữ liệu cá nhân nào được thu, ai được xem và giữ bao lâu | Danh mục dữ liệu, quyền staff, thời hạn giữ/xóa, quy trình yêu cầu truy cập/xóa và xử lý bản sao lưu. Dữ liệu dùng thử là tổng hợp hoặc đã ẩn danh; không đưa PII vào URL, nhãn metric hay ảnh bằng chứng công khai |

[ZAP Baseline](https://www.zaproxy.org/docs/docker/baseline-scan/) chủ yếu crawl và quét thụ động; kết quả sạch không chứng minh không có lỗi phân quyền hay sai giao dịch. Kiểm thử chủ động/authenticated thực hiện trong môi trường kiểm thử thuộc phạm vi nhóm quản lý.

### 7.3. Triển khai, phụ thuộc và phục hồi

| ID / mức | Cần đảm bảo | Cách kiểm chứng / bằng chứng |
| --- | --- | --- |
| REL-01 · P0 | Release dựng lại được từ commit/lockfile; cấu hình hợp lệ | Checkout sạch → `npm ci` → generate/build/check; ghi artifact và commit. Thiếu env bắt buộc phải fail sớm; dev/staging/prod tách DB, Redis prefix, bucket, key và webhook |
| REL-02 · P0 | Migration không mất dữ liệu và tương thích release | Thử trên bản sao dữ liệu đã ẩn danh với quy mô đại diện; đo lock/thời gian, so sánh dữ liệu. Dùng `prisma migrate deploy` cho môi trường triển khai; không `migrate reset` hoặc `db push` tùy tiện |
| REL-03 · P0 | Có phương án quay lại bản ổn định | Diễn tập deploy lỗi rồi quay lại artifact trước, smoke lại. Schema nên tương thích tiến/lùi khi rolling deploy; rollback code không tự rollback dữ liệu. Migration phá hủy cần phương án sửa tiến hoặc phục hồi và đối soát riêng |
| REL-04 · P0 | Process crash/restart không làm mất giao dịch đang xử lý | Kiểm tra tự khởi động lại, graceful shutdown, ngừng nhận request mới và xử lý request/job đang chạy; dữ liệu bền vững không nằm duy nhất trong RAM/đĩa tạm |
| REL-05 · P0 | Health phản ánh đúng khả năng phục vụ | `/api/v1/health/live` kiểm tra process; `/api/v1/health/ready` kiểm tra DB/Redis như code hiện có. Thử ngắt DB/Redis; không để lỗi dependency tạo vòng restart vô hạn. Kiểm tra riêng Redis session của frontend và tuổi job/payment vì backend ready chưa bao phủ chúng |
| REL-06 · P0 | Dependency lỗi có timeout và cách xử lý rõ | Ngắt DB, Redis session/cache, SePay, email, search/storage lần lượt. Không bỏ qua auth khi Redis hỏng; checkout không thành công giả. Search/email có thể giảm tính năng nếu chính sách cho phép; request không chờ vô hạn |
| REL-07 · P0 | Retry không gây bão request hoặc hiệu ứng lặp | Timeout hữu hạn, backoff/jitter, giới hạn retry, tôn trọng quota provider. Thử provider 429/5xx và worker chết; chỉ retry ghi khi có cơ chế an toàn/idempotency |
| DR-01 · P0 | Backup thực sự khôi phục được | Tự động backup, cảnh báo thất bại, lưu bản sao tách khỏi máy app và hạn chế quyền. Phục hồi DB vào instance mới, kiểm tra schema, đơn/tiền/tồn và đăng nhập/checkout; ghi RPO/RTO đo được |
| DR-02 · P0 | Phục hồi bao phủ toàn sản phẩm | Có bản sao hoặc cách tái tạo ảnh/chứng từ cần giữ, cấu hình triển khai và cách lấy secret an toàn. Xác định Redis nào chỉ là cache, Redis nào chứa session/job; cache có thể dựng lại, mất job không được bỏ qua |
| DR-03 · P0 | Sau restore không gây thu/hoàn/ghi nhận trùng | Đối soát giao dịch provider sau mốc backup, rà đơn và reservation, kiểm soát worker trước mở lại ghi; phát lại sự kiện có idempotency. DB restore thành công nhưng chưa đối soát không có nghĩa đã sẵn sàng bán |

Tham khảo [Prisma 6: development và production migrations](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production) và [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html). SQL dump, snapshot và PITR có khả năng khác nhau; chọn theo RPO/RTO và thử phục hồi, không chỉ kiểm tra có file backup.

**Lưu ý riêng SePay trong repository:** runbook hiện ghi backend từ chối sandbox khi `NODE_ENV=production`. Vì vậy tách hai đợt: (1) nghiệm thu production build/config với COD và SePay tắt hoặc adapter test được kiểm soát ở môi trường riêng; (2) kiểm thử SePay Test mode trong cấu hình development/test như runbook. Đợt (2) không được dùng để kết luận đã kiểm chứng cấu hình production của SePay. Trước mở Live cần kiểm tra có kiểm soát giao dịch thật giá trị nhỏ và quy trình đối soát/hoàn; không dùng Live cho load test và không đổi biến môi trường chỉ để lách chặn sandbox.

### 7.4. Giám sát và con người vận hành

| ID / mức | Cần đảm bảo | Cách kiểm chứng / bằng chứng |
| --- | --- | --- |
| OBS-01 · P0 | Có thể lần từ khiếu nại đến lỗi cụ thể | Log có thời gian, request/trace ID, mã đơn/payment nội bộ phù hợp, route mẫu, status, duration; liên kết BFF → API → worker. Tra được một đơn test lỗi trong log mà không lộ thông tin khách |
| OBS-02 · P0 | Dashboard chỉ ra hệ thống còn bán được không | Request rate/error/latency; tạo đơn thành công; payment treo, webhook lỗi, độ trễ job; CPU/RAM/event loop; DB pool/lock/slow query; Redis, disk, backup và quota |
| OBS-03 · P0 | Cảnh báo đến đúng người và có hướng xử lý | Giả lập lỗi, xác nhận thông báo đến nơi, được tiếp nhận và liên kết runbook. Có người chính/dự phòng, quyền truy cập và kênh liên hệ; không chỉ có dashboard để tự mở xem |
| OPS-01 · P0 | Có quy trình xử lý sự cố | Runbook cho web/API lỗi, DB lỗi, payment treo, sai tồn, hoàn tiền, mất secret; nêu cách phát hiện, khoanh vùng, tạm dừng chức năng, phục hồi, kiểm tra lại và báo người liên quan |
| OPS-02 · P0 | Cửa hàng có thể tiếp nhận và hoàn tất đơn | Chốt người nhận đơn, thời gian kiểm tra đơn mới, đóng gói/giao hàng, số liên hệ CSKH, xử lý COD/đổi trả và người tra soát tiền. Chạy diễn tập một ngày bán hàng bằng đơn test |
| OPS-03 · P1 | Có bảo trì thường kỳ và ngân sách | Lịch đối soát hằng ngày; kiểm tra backup/job; rà quyền nhân viên nghỉ việc; cập nhật dependency; restore định kỳ và sau thay đổi lớn. Theo dõi chi phí compute/DB/storage/băng thông/log/email, quota và cảnh báo ngân sách |
| OPS-04 · P0 khi bán thật | Nội dung kinh doanh và chính sách đã được người phụ trách duyệt | Thông tin người bán/liên hệ, giá và phí, giao hàng, đổi trả/hoàn, quyền riêng tư, quyền sử dụng ảnh/nội dung; rà điều kiện kinh doanh mỹ phẩm và thủ tục TMĐT áp dụng tại ngày mở bán. Demo đồ án phải ghi rõ là demo |

OpenTelemetry giúp liên kết logs, metrics và traces; chọn một hệ thống giám sát phù hợp thay vì triển khai nhiều bộ trùng nhau. Tham khảo [OpenTelemetry observability primer](https://opentelemetry.io/docs/concepts/observability-primer/). Với nhãn metric, dùng route mẫu như `/orders/:id`, không dùng mỗi order ID làm một nhãn riêng.

Ngưỡng cảnh báo khởi đầu **đề xuất**: probe fail 3 lần liên tiếp; lỗi kỹ thuật > 2% trong 5 phút với ≥ 100 request; p95 vượt SLO 10 phút; payment chưa xử lý > 5 phút sau webhook hợp lệ; pool > 80% trong 10 phút; backup trễ quá lịch một chu kỳ. Lưu lượng thấp vẫn cần probe và cảnh báo nghiệp vụ từng sự kiện; sai tiền/tồn hoặc mất dữ liệu cần báo ngay, không đợi đủ 100 request. Chỉnh ngưỡng khi có dữ liệu để tránh cảnh báo vô ích.

Với OPS-04, kiểm tra thủ tục hiện hành trên [Cổng dịch vụ công Bộ Công Thương — thông báo website TMĐT bán hàng](https://dichvucong.moit.gov.vn/VdxpTTHCOnlineDetail.aspx?DocId=340) trước mở bán. Đây là đầu việc cần người phụ trách kinh doanh xác minh, không phải kết luận rằng website đã đáp ứng mọi nghĩa vụ pháp lý chỉ nhờ pass test kỹ thuật.

## 8. Bộ công cụ vừa đủ cho GlowUp

| Nhu cầu | Công cụ ưu tiên | Đầu ra phải có |
| --- | --- | --- |
| Logic nghiệp vụ và API | Jest + Supertest ở backend; Vitest ở frontend, đã có trong package | Test report, ca lỗi và coverage; PostgreSQL/Redis test riêng cho integration |
| Hành trình người dùng | Playwright, đã có ở frontend | Trace/screenshot khi lỗi và kết quả theo browser/viewport. Ưu tiên hành vi người dùng, fixture độc lập theo [Playwright best practices](https://playwright.dev/docs/best-practices) |
| Chịu tải API | k6 chạy CLI, dùng threshold | Script có version, số liệu từng nhóm endpoint, tệp kết quả và dashboard cùng thời điểm |
| Frontend performance/accessibility | Lighthouse, Chrome DevTools, axe; bổ sung RUM/web-vitals khi mở bán | Báo cáo lab với profile cố định và dữ liệu field tách riêng |
| Phân tích DB | PostgreSQL statistics, slow query log, EXPLAIN | Truy vấn chậm, index/pool/lock được đo trên dữ liệu đại diện |
| Bảo mật | npm audit, công cụ quét secret như Gitleaks, OWASP ZAP, test quyền tự viết | Danh sách finding, mức ảnh hưởng, cách xử lý và kết quả retest |
| Metrics/log/errors | Metrics/log của nền tảng hoặc Prometheus + Grafana; OpenTelemetry nếu cần trace; Sentry tùy nhu cầu | Dashboard, lịch lưu dữ liệu, truy vết lỗi và cảnh báo đã thử |
| Khả dụng từ ngoài | Uptime Kuma hoặc dịch vụ uptime tương đương đặt ngoài máy ứng dụng | Lịch sử probe, thông báo thử nghiệm và báo cáo cửa sổ SLO |
| Backup/restore | Backup/PITR của dịch vụ PostgreSQL hoặc công cụ PostgreSQL tự quản | Nhật ký backup và biên bản restore có RPO/RTO, không chỉ ảnh cấu hình |
| Tự động hóa | GitHub Actions hoặc CI đang dùng | Build/test/scan artifacts gắn commit; bước triển khai và smoke có trạng thái rõ |

Đây là danh sách lựa chọn công cụ, **không có nghĩa repository đã cài hoặc cấu hình tất cả**. Có thể dùng dịch vụ tích hợp của hosting để giảm công vận hành; không bắt buộc cài cả Prometheus, Grafana, Sentry và OpenTelemetry ngay.

## 9. Những gì có thể bắt đầu ngay trong repository

Các lệnh dưới đây đã đối chiếu `package.json`; tài liệu này **không chạy test, không migrate và không deploy**.

| Thư mục | Lệnh hiện có | Ý nghĩa / điều kiện |
| --- | --- | --- |
| `backend` | `npm run build` | Kiểm tra biên dịch; cần cài dependency và sinh Prisma Client theo README |
| `backend` | `npm test -- --runInBand` | Chạy bộ test hiện có; đọc setup của từng suite và dùng tài nguyên test riêng nếu suite đụng DB |
| `backend` | `npm run test:cov -- --runInBand` | Xuất coverage; báo cáo riêng lines/branches/functions/statements và phạm vi bỏ qua. Đề xuất > 60% cho từng chỉ số để cụ thể hóa NFR-07; không bỏ các ca P0 dù coverage đạt |
| `backend` | `npm run test:e2e` | Có cấu hình E2E; kiểm tra env/fixture trước khi chạy. Không trỏ test tạo/xóa dữ liệu vào DB chung hoặc production |
| `frontend` | `npm run check` | Contracts, inventory, format, lint, typecheck, unit test và build theo script hiện tại |
| `frontend` | `npm run test:e2e` | Playwright hiện khởi động Next dev và health fixture; hữu ích cho UI, chưa đủ chứng minh full stack thật hoặc hiệu năng production |
| `frontend` | `npm run test:production` | Smoke chạy `next start` local trên build đã có; kiểm tra render/redirect/maintenance. Không tương đương kiểm tra deployment public và toàn bộ checkout |

Không có lệnh k6 trong các package đã đọc. Công việc tiếp theo là bổ sung script tải, môi trường fixture và threshold; không đánh dấu PERF hoàn thành chỉ vì các test hiện có pass. Chromium mobile emulation trong cấu hình Playwright hiện tại cũng chưa phải bằng chứng chạy Safari/iOS.

## 10. Trình tự thực hiện phù hợp cho đồ án

| Bước | Việc thực hiện | Điều kiện chuyển bước |
| --- | --- | --- |
| 1 — Chốt phạm vi | Website + quản trị nào được mở; COD/SePay; POS có cùng tồn không; workload, NFR, dữ liệu, ngân sách, RPO/RTO | Có bản cấu hình nghiệm thu ghi rõ giả định và các chức năng chưa đưa vào sử dụng |
| 2 — Đảm bảo đúng | FUNC, toàn bộ TX/PAY và test quyền SEC; ưu tiên chạy DB thật | Không còn lỗi P0 về tiền/tồn/quyền; giữ bằng chứng từng ca |
| 3 — Dựng bản triển khai | Production build, staging riêng, migration, health, log, backup | Build từ checkout sạch, deployment smoke pass, restore thử thành công |
| 4 — Đo và sửa điểm nghẽn | Baseline → load mục tiêu → spike/stress → soak; UI performance và security scan | Số đo có thể lặp lại, P1 đã đạt hoặc phạm vi pilot giới hạn được ghi rõ |
| 5 — Diễn tập vận hành | Crash, dependency down, rollback, đối soát, mất webhook, thao tác cửa hàng | Người vận hành thực hiện runbook và nhận được cảnh báo; dữ liệu khôi phục đúng |
| 6 — Mở sử dụng có kiểm soát | Domain/TLS/config production, smoke public, xác minh thanh toán Live trước mở đại trà | Gate trước mở bán đạt; có người theo dõi và cách dừng nhận đơn nếu lỗi |
| 7 — Theo dõi thực tế | Kiểm tra kỹ 24–72 giờ đầu; thu SLO/RUM và đánh giá lại sau cửa sổ 30 ngày | Có báo cáo thực tế, xử lý sai lệch và điều chỉnh capacity; không gọi uptime đạt trước đủ cửa sổ |

Nếu thời gian hạn chế, làm theo thứ tự **đúng tiền/tồn/quyền → chạy ổn định và khôi phục → đo tải → hoàn thiện trải nghiệm → tối ưu mở rộng**. Giảm phạm vi tính năng có thể hợp lý hơn mở nhiều tính năng chưa có khả năng vận hành.

## 11. Gate trước và sau mở bán

### 11.1. Trước mở bán thật

- [ ] Các mục P0 áp dụng đều đạt, có owner và bằng chứng; không còn lỗi Critical/High có thể khai thác trong phạm vi mở bán.
- [ ] Các chỉ tiêu P1 đã đạt cho phạm vi tuyên bố. Nếu chưa đạt 1.000 VU, ghi rõ năng lực đã đo và chỉ pilot trong giới hạn có kiểm soát; không ghi “đạt NFR-01”.
- [ ] E2E mua hàng và xử lý đơn chạy trên môi trường thật; cấu hình Live được nghiệm thu riêng với phạm vi giao dịch đã thống nhất.
- [ ] Backup/restore, rollback và đối soát sau phục hồi đã diễn tập; có dashboard, cảnh báo và người nhận.
- [ ] Domain/TLS, session, email, storage, quota, nội dung/chính sách, tài khoản quản trị và dữ liệu catalog/tồn thật đã kiểm tra.
- [ ] Có release record: commit/artifact, migration, thời điểm, người phụ trách, kết quả smoke và cách quay lại bản ổn định.

### 11.2. Sau mở bán và mỗi lần thay đổi đáng kể

- [ ] Theo dõi tỷ lệ lỗi/tạo đơn, payment treo, phản ánh khách, chi phí và tài nguyên; kiểm tra probe từ bên ngoài.
- [ ] Khi đủ cửa sổ và dữ liệu, đánh giá uptime 99,9% và Core Web Vitals thực tế. Nếu ít người dùng, ghi “chưa đủ mẫu”, không suy đoán đạt từ Lighthouse.
- [ ] Đối soát tiền, đơn, COD, hoàn tiền và tồn hằng ngày; diễn tập restore định kỳ và sau thay đổi backup/hạ tầng.
- [ ] Chạy lại kiểm thử liên quan khi thay đổi checkout/payment/kho, DB/index, cache, replica hoặc hosting; lưu baseline để phát hiện suy giảm.
- [ ] **P2:** Chỉ mở rộng cache, replica, worker hoặc DB sau khi xác định điểm nghẽn. Trước tăng replica, thử session, idempotency, job và rate limit hoạt động đúng trên nhiều instance.

## 12. Mẫu ghi nhận bằng chứng

Có thể sao chép mẫu sau cho từng ID hoặc nhóm ID cùng một lần chạy. Nơi lưu đề xuất: `docs/5-delivery/evidence/<ngay>-<commit>/`; đây là thư mục sẽ tạo khi có kết quả, chưa phải artifact đã tồn tại.

```text
ID / tên kiểm tra:
Trạng thái: Chưa kiểm tra | Đang làm | Đạt | Không đạt | Không áp dụng
Người thực hiện / người xem lại:
Ngày giờ và múi giờ:
Commit / artifact / phiên bản công cụ:
Môi trường: local | CI | staging | production
Cấu hình: CPU/RAM, replicas, DB tier/version/pool, Redis, region, proxy/CDN
Dữ liệu: số SKU/cửa hàng/khách/đơn, cách seed, số lượng tồn và voucher
Phụ thuộc: thật | sandbox | stub, quota, timeout, cache lạnh/nóng
Kịch bản / câu lệnh / phiên bản script:
Mục tiêu và mẫu số: VU hoặc arrival rate, thời lượng, endpoint, tiêu chí trước đo
Kết quả: số mẫu, throughput, p50/p95/p99, lỗi theo loại, dropped iterations
Đối chiếu DB / nghiệp vụ trước và sau:
Tệp báo cáo / trace / log / ảnh / dashboard (đã che dữ liệu nhạy cảm):
Kết luận và giới hạn của bằng chứng:
Lỗi còn lại / issue / người phụ trách / hạn xử lý:
Ngày và kết quả retest:
```

Ví dụ cách kết luận hợp lệ: “Commit X, staging cấu hình Y, dữ liệu Z, 1.000 VU theo script A trong 30 phút: đạt/không đạt các ngưỡng đã chốt; báo cáo tại B.” Tránh kết luận “chịu được 1.000 người dùng” mà thiếu workload, cấu hình và số liệu.

## 13. Nguồn tham khảo và giới hạn

Nguồn chính thức đã tra cứu ngày **04/11/2026** được đặt cạnh nội dung tương ứng: Google SRE, Grafana k6, web.dev, Prisma **v6** phù hợp package hiện tại, PostgreSQL, SePay, OWASP, W3C, Playwright, OpenTelemetry và cổng dịch vụ công. Khi triển khai, đối chiếu lại phiên bản đang cài và tài liệu provider; đặc biệt API thanh toán, quota và thủ tục kinh doanh có thể thay đổi.

Các workload, ngưỡng lỗi, RPO/RTO, thời gian diễn tập và cách chia P0/P1/P2 trong tài liệu là **đề xuất nghiệm thu cho GlowUp** dựa trên rủi ro nghiệp vụ, không phải con số được trích từ tiêu chuẩn. Các mục tiêu có sẵn trong yêu cầu dự án được chỉ rõ; việc thay đổi chúng cần ghi nhận lại trong hồ sơ yêu cầu/nghiệm thu.
