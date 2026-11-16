# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 03 – OMS & HYBRID ROUTING ENGINE
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-03`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Core Commerce Fulfillment, Road Distance, Hybrid Routing Engine, Split Fulfillment, Multi-FO Atomic Creation & State Aggregator)  
**Thời điểm lập:** 2026-11-16T01:30:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 03

EPIC 03 hiện thực hóa lõi quản lý đơn hàng đa kênh (Order Management System - OMS) kết hợp với công cụ định tuyến thông minh (Hybrid Routing Engine) đáp ứng mô hình bán lẻ kết hợp giữa Kho Tổng trung tâm và Hệ thống Showroom trải dài:
1. **Dịch vụ Tính Quãng Đường & Báo Giá Vận Chuyển:** Tính toán khoảng cách địa lý (Haversine $\times$ hệ số uốn lượn đô thị 1.3), tự động tra cứu tọa độ hành chính theo danh mục phường/xã/quận/huyện, báo giá cước vận chuyển tức thời cho dịch vụ Hỏa tốc Express 2H (Ahamove) và Tiêu chuẩn (GHN), cơ chế Cache-aside Upstash Redis/PostgreSQL với TTL 15 phút, và kiểm tra chống gian lận cước phí (`validateQuote`).
2. **Chiến Lược Phân Tuyến Hỗn Hợp & Chia Đơn Có Kiểm Soát (Routing Engine):**
   - *Hỏa tốc 2H (`DEC-01`):* Tìm Showroom đơn lẻ đáp ứng 100% giỏ hàng, cự ly đường bộ $\le 10.0\text{ km}$, đang trong khung giờ mở cửa và còn hạn ngạch fulfillment trong ngày. Tuyệt đối không tự động chia đơn hỏa tốc.
   - *Tiêu chuẩn (Standard):* Ưu tiên Kho Tổng trung tâm (`WH-TB` / `WH-HN`) $\rightarrow$ Showroom đơn lẻ đáp ứng 100% $\rightarrow$ Đánh giá tách đơn (Split Fulfillment) theo quyết định `DEC-02`.
   - *Quy chuẩn chia đơn (`DEC-02`):* Giá trị hàng hóa thực tế sau giảm giá $\ge 500.000\text{ đ}$, cước phát sinh GlowUp trợ giá $\le 35.000\text{ đ}$, chia tối đa 2 Fulfillment Orders (Kho Tổng + 1 Showroom gần nhất). Đơn $< 500.000\text{ đ}$ không chia mà chuyển sang gom hàng nội bộ (`INTERNAL_TRANSFER_REQUIRED`).
3. **Tái Cấu Trúc Luồng Tạo Đơn Hàng & Đa Fulfillment Orders:** Khởi tạo giao dịch nguyên tử (ACID Transaction) tạo `Order`, `OrderItem`, các `FulfillmentOrder` và `FulfillmentOrderItem` con theo từng địa điểm xuất hàng, tích hợp giữ chỗ tồn kho FEFO nguyên tử cho từng FO, và phát hành Transactional Outbox Event `ORDER_RESERVED`.
4. **Bộ Tổng Hợp Trạng Thái Đơn Hàng (Order State Aggregator):** Tổng hợp trạng thái cấp cao của `Order` từ các `FulfillmentOrder` và `Shipment` con, xử lý giao hàng một phần (`PARTIALLY_DELIVERED` - AC1), giao toàn bộ (`DELIVERED` - AC2), cô lập kiện chuyển hoàn (RTO) mà không hủy đơn, và tự động hoàn tất sau 24h ở trạng thái `DELIVERED` (`DEC-03`).

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP03-T01  | Xây Dựng Dịch Vụ Tính Quãng Đường & Báo Giá Vận Chuyển                   | Medium (M)  | [HOÀN THÀNH]  |
| EP03-T02  | Triển Khai Chiến Lược Phân Tuyến Hỗn Hợp & Chia Đơn Có Kiểm Soát         | Large (L)   | [HOÀN THÀNH]  |
| EP03-T03  | Tái Cấu Trúc Luồng Tạo Đơn Hàng & Đa Fulfillment Orders                 | Large (L)   | [HOÀN THÀNH]  |
| EP03-T04  | Xây Dựng Bộ Tổng Hợp Trạng Thái Đơn Hàng (Order State Aggregator)        | Medium (M)  | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 4 Tasks                                                                  | Enterprise  | 4/4 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP03-T01** | 1. Trả về đúng cước phí Express 2H hoặc vô hiệu hóa nếu ngoài 10km hoặc ngoài giờ mở cửa.<br>2. Báo giá GHN chuẩn xác theo cùng tỉnh/khác tỉnh.<br>3. Cache báo giá với TTL 15 phút chống spam tính cước.<br>4. Validate quote chống sửa đổi giá từ client.<br>5. Bổ sung bảng `shipping_quotes` lưu trữ báo giá. | - `DistanceCalculatorService`: Haversine $\times 1.3$, từ điển tọa độ chuẩn 3 miền.<br>- `ShippingQuoteService`: Đánh giá cước 2H và Standard, xác thực hạn ngạch, kiểm tra ATP.<br>- Migration `20261116010000_add_shipping_quotes` áp dụng trên Neon PostgreSQL.<br>- Endpoint `POST /api/v1/shipping/quotes`, `GET /api/v1/shipping/quotes/:quoteGroupId`.<br>- Unit tests: 18/18 PASS (`distance-calculator.service.spec.ts` & `shipping-quote.service.spec.ts`). | **PASS** |
| **EP03-T02** | 1. Đơn 450.000đ thiếu hàng tại Central WH $\implies$ Không chia đơn, chuyển sang gom hàng nội bộ (`INTERNAL_TRANSFER_REQUIRED`).<br>2. Đơn 600.000đ cước phát sinh 22.000đ - 30.000đ ($\le 35.000\text{ đ}$) $\implies$ Phân tuyến tách thành 2 FO hợp lệ (`SPLIT_FULFILLMENT`).<br>3. Hỏa tốc 2H cấm tuyệt đối chia đơn.<br>4. Tách tối đa 2 địa điểm (Kho Tổng + 1 Showroom). | - `HybridOrderRouter` tại `hybrid-order-router.ts`.<br>- Triển khai đầy đủ quyết định `DEC-01` (Hỏa tốc $\le 10$km, single location) và `DEC-02` (Split fulfillment threshold $\ge 500$k, trần trợ giá 35k, tối đa 2 FOs).<br>- Test suite: `hybrid-order-router.spec.ts` (8/8 PASS bao phủ 100% ma trận phân tuyến). | **PASS** |
| **EP03-T03** | 1. Đơn chia 2 kho tạo thành công 1 Order cha và 2 Fulfillment Orders con, mỗi FO có mã reservation riêng.<br>2. Bất kỳ lỗi nào trong quá trình giữ chỗ kho con đều làm rollback toàn bộ đơn hàng (ACID rollback 100%).<br>3. Tạo bảng `fulfillment_orders`, `fulfillment_order_items` với quan hệ hai chiều và check constraints.<br>4. Ghi nhận Transactional Outbox Event `ORDER_RESERVED`. | - Model `FulfillmentOrder` và `FulfillmentOrderItem`.<br>- Migration `20261116010500_add_fulfillment_orders` đã apply thành công trên Neon DB.<br>- `CreateOrderUseCase`: Đóng gói giao dịch nguyên tử `prisma.$transaction`, đối chiếu quote chống can thiệp giá, gọi FEFO reservation, cập nhật FO sang `ALLOCATED`, xuất bản Outbox event.<br>- Test suite: `create-order.use-case.spec.ts` (4/4 PASS). | **PASS** |
| **EP03-T04** | 1. Đơn 2 kiện: Kiện 1 giao thành công $\implies$ Order chuyển sang `PARTIALLY_DELIVERED` (AC1).<br>2. Kiện 2 giao thành công $\implies$ Order chuyển sang `DELIVERED` (AC2).<br>3. 100% FO `HANDED_OVER` $\implies$ Order `SHIPPED`.<br>4. Sau 24h ở trạng thái `DELIVERED` không có khiếu nại $\implies$ Tự động chuyển `COMPLETED` (`DEC-03`).<br>5. Kiện bị chuyển hoàn (RTO) cô lập an toàn, không hủy đơn hàng.<br>6. Ghi nhận `order_status_history` và Outbox Event `ORDER_STATUS_CHANGED`. | - Service `OrderStateAggregator` tại `order-state-aggregator.ts`.<br>- Triển khai ma trận máy trạng thái tổng hợp đồng bộ với database transaction.<br>- Phương thức `processAutoCompletion()` quét định kỳ các đơn `DELIVERED` quá 24h.<br>- Idempotent: Bỏ qua khi trạng thái không thay đổi, tránh duplicate history và outbox events.<br>- Test suite: `order-state-aggregator.spec.ts` (11/11 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Nhất Quán (Architecture Review)

### 3.1 Ranh Giới Module & Sự Phụ Thuộc (Module Boundaries)
- **Đóng gói chuẩn NestJS:** Module `OmsModule` được thiết kế theo nguyên lý High Cohesion, Low Coupling:
  - Phụ thuộc đúng hướng vào `InventoryModule` (để kiểm tra tồn kho ATP và thực thi FEFO reservation) và `AsyncInfrastructureModule` (để ghi Transactional Outbox Event).
  - Không tồn tại quan hệ phụ thuộc ngược (Circular Dependency).
  - Các service (`DistanceCalculatorService`, `ShippingQuoteService`, `HybridOrderRouter`, `CreateOrderUseCase`, `OrderStateAggregator`) đều được export tường minh sẵn sàng phục vụ các luồng tiếp theo ở Epic 04, 05, 08.

### 3.2 Ranh Giới Giao Dịch ACID (Transaction Boundaries)
- Trong `CreateOrderUseCase`, toàn bộ các thao tác sau được thực thi bên trong **một PostgreSQL Transaction Client duy nhất (`prisma.$transaction`)**:
  1. Tạo Header đơn hàng `Order` (Status: `CONFIRMED` cho COD hoặc `PENDING_PAYMENT` cho Online).
  2. Tạo danh sách sản phẩm `OrderItem`.
  3. Tạo các `FulfillmentOrder` và `FulfillmentOrderItem` con theo kế hoạch phân tuyến.
  4. Thực thi giữ chỗ tồn kho FEFO nguyên tử cho từng FO thông qua `InventoryReservationService.createReservation`.
  5. Cập nhật trạng thái từng FO sang `ALLOCATED`.
  6. Ghi nhận sự kiện `ORDER_RESERVED` vào bảng `outbox_events`.
- Nếu có bất kỳ lỗi nào phát sinh (như tồn kho không đủ, vi phạm khóa ngoại, timeout), toàn bộ transaction sẽ rollback 100%, không để lại bất kỳ bản ghi mồ côi nào trong hệ thống.

### 3.3 Cơ Chế An Toàn Cạnh Tranh & Phòng Chống Gian Lận (Security & Concurrency Safety)
1. **Chống can thiệp giá vận chuyển (Tampering Guard):** Client bắt buộc phải truyền `quoteGroupId` và `quoteId`. `CreateOrderUseCase` gọi `ShippingQuoteService.validateQuote` để đối chiếu với bản ghi trong DB/Redis. Bất kỳ sự sai lệch cước phí hoặc hết hạn (TTL 15 phút) đều bị chặn ngay từ cổng vào (`ConflictException`).
2. **Khóa bi quan phân bổ FEFO:** Tận dụng triệt để cơ chế khóa `SELECT ... FOR UPDATE` và sắp xếp `variantId ASC` từ Epic 02, triệt tiêu hoàn toàn khả năng bán vượt tồn kho (Zero Overselling).
3. **Idempotency trong tổng hợp trạng thái:** `OrderStateAggregator` chỉ ghi nhận lịch sử và phát sinh sự kiện outbox khi trạng thái thực sự thay đổi (`previousStatus !== calculatedStatus`).

---

## 4. Rà Soát Cơ Sở Dữ Liệu & Migrations (Database Review)

| Tên Migration | Bảng & Đối Tượng Tác Động | Ràng Buộc & Chỉ Mục (Indexes) |
| :--- | :--- | :--- |
| `20261116010000_add_shipping_quotes` | Bảng `shipping_quotes` | - Foreign key `shipping_quotes_source_location_id_fkey` liên kết `Store`.<br>- Index `idx_shipping_quotes_lookup` trên `(quote_group_id, carrier_code, service_code)`.<br>- Index `idx_shipping_quotes_expiry` trên `expires_at`. |
| `20261116010500_add_fulfillment_orders` | Bảng `fulfillment_orders`, `fulfillment_order_items`, thêm quan hệ `fulfillmentOrderId` vào `inventory_reservations` | - Unique index trên `fulfillment_order_number`.<br>- Check constraint `chk_fo_status` (`PENDING_ALLOCATION`, `ALLOCATED`, `PICKING`, `PICKED`, `PACKING`, `PACKED`, `HANDED_OVER`, `SHIPPED`, `DELIVERED`, `CANCELLED`).<br>- Check constraint `chk_fo_total_items_count_positive`.<br>- Check constraint `chk_fo_item_qty_requested_positive`.<br>- Check constraint `chk_fo_item_qty_fulfilled_non_negative`.<br>- B-Tree index `idx_fo_location_status` trên `(source_location_id, status)`.<br>- B-Tree index `idx_fo_order_id` trên `order_id`. |

- **Khả năng tương thích:** Migrations tuân thủ quy chuẩn Non-destructive, hoàn toàn tương thích với dữ liệu và schema hiện tại.
- **Thực thi trên Cloud:** 100% migrations đã được áp dụng thành công trên Neon PostgreSQL 16.

---

## 5. Kết Quả Kiểm Thử Toàn Diện (Test Execution Evidence)

### 5.1 Các Test Suites Của EPIC 03 (45/45 Tests PASS)
1. **Kiểm thử Đơn vị (Unit Tests): 41/41 Tests PASS**
   - `distance-calculator.service.spec.ts`: **7/7 PASS** (Tính khoảng cách Haversine, uốn lượn đô thị 1.3, fallback tọa độ tỉnh/quận).
   - `shipping-quote.service.spec.ts`: **11/11 PASS** (Báo giá 2H Ahamove $\le 10$km, cước GHN nội/ngoại tỉnh, Cache-aside Redis/DB, xác thực quote).
   - `hybrid-order-router.spec.ts`: **8/8 PASS** (Phân tuyến 2H đơn showroom, tiêu chuẩn Kho Tổng, Split Fulfillment DEC-02, chặn chia đơn dưới 500k).
   - `create-order.use-case.spec.ts`: **4/4 PASS** (Tạo đơn chia kho, đơn đơn lẻ, rollback giao dịch ACID, từ chối gom hàng nội bộ).
   - `order-state-aggregator.spec.ts`: **11/11 PASS** (AC1 partially delivered, AC2 delivered, shipped, auto-completion 24h theo DEC-03, cách ly RTO).
2. **Kiểm thử Tích hợp Toàn diện (E2E Integration Flow): 4/4 Tests PASS**
   - `epic-03-integrated-flow.spec.ts`: **4/4 PASS** (101.4s):
     - Flow 1: Khách đặt đơn đơn lẻ (Single FO) -> Báo giá -> Tạo đơn & Reservation -> Giao hàng -> Tự động hoàn tất 24h.
     - Flow 2: Khách đặt đơn đa kho (Split Fulfillment - DEC-02) -> 2 FOs -> Giao 1 phần (AC1) -> Giao toàn bộ (AC2).
     - Flow 3: Ngăn chặn chia đơn khi giá trị hàng $< 500\text{k}$ (`DEC-02`) -> Yêu cầu gom hàng nội bộ.
     - Flow 4: Bảo đảm toàn vẹn giao dịch ACID Rollback khi giữ chỗ kho con gặp sự cố.

### 5.2 Kiểm Thử Hồi Quy (Regression Tests: Epic 01 & Epic 02)
- Toàn bộ các test suite của Epic 01 và Epic 02 được thực thi với `--runInBand` nhằm bảo đảm tính toàn vẹn dữ liệu:
  - `epic-02-integrated-flow.spec.ts`: **1/1 PASS** (10.6s).
  - `inventory-reservation.service.spec.ts`: **6/6 PASS** (35.0s - Zero Overselling với 10 luồng tranh chấp đồng thời).
  - `reservation-expiration.spec.ts`: **4/4 PASS** (50.7s - Giải phóng tự động và Skip Locked an toàn).
  - `atp-calculator.spec.ts`, `inventory-balance.service.spec.ts`, `fefo-allocation.service.spec.ts`, `location.service.spec.ts`: **100% PASS**.

### 5.3 Biên Dịch Toàn Hệ Thống (TypeScript Compilation)
- Lệnh: `npm run build` (`nest build`).
- Kết quả: **Exit Code 0** (0 errors, 0 warnings).

---

## 6. Phân Loại Khuyết Tật (Defect Classification)

| Phân Loại | Số Lượng | Mô Tả & Đánh Giá Hiện Trạng |
| :--- | :---: | :--- |
| **CRITICAL** | **0** | Không có lỗi sai lệch dữ liệu, mất mát tồn kho, hổng bảo mật hay đổ vỡ giao dịch. |
| **HIGH** | **0** | Toàn bộ các luồng nghiệp vụ cốt lõi (Báo giá, Phân tuyến, Tạo đơn, Giữ chỗ, Tổng hợp trạng thái) hoạt động thông suốt. |
| **MEDIUM** | **0** | Không có lỗi thiếu validation hay thiếu sót xử lý cạnh tranh. |
| **LOW** | **0** | Đã tối ưu hóa thứ tự foreign key cascade, dọn dẹp các hook timeout trong suite kiểm thử. |

---

## 7. Các Quyết Định Nghiệp Vụ Đã Tích Hợp Đầy Đủ

1. **`DEC-01` (Express 2H Distance & Single Location):** Bán kính tối đa 10.0 km đường bộ thực tế (Haversine $\times 1.3$). Tuyệt đối không tự động tách đơn hỏa tốc (Single Fulfillment Order).
2. **`DEC-02` (Controlled Split Fulfillment Policy):** Chỉ tách đơn khi giá trị hàng hóa thực tế (`netMerchandiseAmount`) $\ge 500.000\text{ đ}$, cước phát sinh do GlowUp trợ giá $\le 35.000\text{ đ}$, tách tối đa 2 FOs (Kho Tổng + 1 Showroom). Đơn dưới 500k yêu cầu gom hàng nội bộ (`INTERNAL_TRANSFER_REQUIRED`).
3. **`DEC-03` (Auto-completion 24H):** Đơn hàng giữ trạng thái `DELIVERED` liên tục trong 24 giờ mà không phát sinh RMA/khiếu nại sẽ được tự động chuyển sang trạng thái `COMPLETED` thông qua phương thức `processAutoCompletion()`.

---

## 8. Kết Luận Nghiệm Thu & Đề Xuất Epic Tiếp Theo

- **Đánh giá tổng thể:** **`PASS`** (Đạt chuẩn 100% về mặt thiết kế, chức năng, chất lượng mã nguồn, ràng buộc cơ sở dữ liệu và bằng chứng kiểm thử tự động).
- **Tiến độ tổng thể dự án Fulfillment P0:** **12/37 Tasks Đã Hoàn Thành (32.4%)**.
- **Đề xuất Epic tiếp theo:** **EPIC 04: Fulfillment & WMS Operations**
  - Quản lý danh sách nhặt hàng & quét barcode xác thực lô hàng (`EP04-T01`).
  - Đóng gói kiện hàng, đo cân nặng và kích thước thực tế (`EP04-T02`).
  - Bàn giao kiện hàng cho đối tác vận chuyển & Ký nhận Manifest (`EP04-T03`).
- **Điều kiện tiên quyết trước khi triển khai Epic 04:**
  - EPIC 03 đã hoàn thành và sẵn sàng cung cấp các bản ghi `FulfillmentOrder` ở trạng thái `ALLOCATED`.
  - Giữ nguyên trạng thái working directory, không tự động commit/push/stash. Chờ Technical Lead / User review và ký duyệt nghiệm thu chính thức.
