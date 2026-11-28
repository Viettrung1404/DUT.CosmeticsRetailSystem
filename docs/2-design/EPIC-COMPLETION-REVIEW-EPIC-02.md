# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 02 – FEFO & RESERVATION ENGINE
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-02`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Core Commerce Fulfillment, Inventory FEFO, Atomic Reservation & Expiration Engine)  
**Thời điểm lập:** 2026-11-16T00:52:00+07:00  
**Người thực hiện:** Senior Backend Architect / Lead Engineer  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 02

EPIC 02 thiết lập cơ chế phân bổ và quản lý tồn kho có điều kiện (hạn dùng, lô hàng) và công cụ giữ chỗ nguyên tử (Atomic Inventory Reservation) với mục tiêu:
1. **Phân bổ theo FEFO:** Tự động chọn và khóa các lô hàng có hạn sử dụng gần nhất còn đủ điều kiện xuất kho, loại bỏ nguy cơ xuất hàng cận date cho khách hàng Online.
2. **Khóa bi quan & Zero Overselling:** Khóa dòng ở cấp độ database (`SELECT ... FOR UPDATE`), bảo đảm không có tình trạng bán vượt số lượng tồn thực tế.
3. **Giữ chỗ nguyên tử (Atomic Reservation):** Tạo bản ghi giữ chỗ đồng bộ với số dư phân đoạn `reserved_quantity` trên balances, ghi nhận sổ cái giao dịch và phát sinh sự kiện miền Transactional Outbox.
4. **Tiến trình tự động hoàn trả (Expiration Engine):** Quét định kỳ và hoàn trả số lượng giữ chỗ về tồn khả dụng (ATP) khi đơn hàng quá hạn thanh toán trực tuyến hoặc bị hủy.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP02-T01  | Nâng Cấp Schema Lô Hàng Hạn Dùng & Cấu Hình Hạn Lưu Thông Tối Thiểu      | Medium (M)  | [HOÀN THÀNH]  |
| EP02-T02  | Xây Dựng Dịch Vụ Phân Bổ Lô Hạn Gần Xuất Trước (FEFO Allocation Service) | Large (L)   | [HOÀN THÀNH]  |
| EP02-T03  | Triển Khai Dịch Vụ Giữ Chỗ Tồn Kho Nguyên Tử (Atomic Reservation)         | Large (L)   | [HOÀN THÀNH]  |
| EP02-T04  | Xây Dựng Tiến Trình Giải Phóng & Hết Hạn Giữ Chỗ (Expiration Engine)     | Medium (M)  | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 4 Tasks                                                                  | Enterprise  | 4/4 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP02-T01** | 1. Cho phép lưu nhiều lô hàng khác nhau cho cùng một SKU tại một địa điểm.<br>2. Ràng buộc `quantity_on_hand >= quantity_reserved` ở cấp DB.<br>3. Ràng buộc không âm cho `quantity_on_hand`, `quantity_reserved`, `min_shelf_life_days`.<br>4. Index `idx_lots_fefo_search` sắp xếp tăng dần theo `expiry_date` và unique index `uq_lot_batch`. | - Model `InventoryLot` & trường `minShelfLifeDays` (180 ngày) trên `ProductVariant`.<br>- Migration `20261115165648_add_inventory_lots_and_min_shelf_life` chạy thành công trên PostgreSQL Neon.<br>- Check constraints `chk_lot_quantities`, 3 check không âm hoạt động chính xác.<br>- Seed script khởi tạo 360 lô hàng mẫu tại 9 địa điểm.<br>- Test suite: `inventory-lot.migration.spec.ts` (8/8 PASS). | **PASS** |
| **EP02-T02** | 1. Luôn trừ số lượng của Lô có HSD gần nhất trước.<br>2. Bỏ qua lô có HSD dưới ngưỡng tối thiểu (`minShelfLifeDays`), trừ khi có cờ `isClearance = true`.<br>3. Thiếu số lượng khả dụng $\implies$ Ném `ConflictException` và rollback transaction.<br>4. Hỗ trợ `releaseLockedLots` và `simulateAllocation` (dry-run).<br>5. Sắp xếp `variantId ASC` trước khi khóa để phòng chống Deadlock. | - Dịch vụ `FefoAllocationService` tại `fefo-allocation.service.ts`.<br>- Thuật toán quét và khóa bi quan `FOR UPDATE` theo `expiry_date ASC, id ASC`.<br>- Deadlock prevention: sắp xếp items theo `variantId ASC`.<br>- Rollback sạch sẽ khi `LOT_SHORTAGE`.<br>- Test suite: `fefo-allocation.service.spec.ts` (8/8 PASS). | **PASS** |
| **EP02-T03** | 1. Tạo bản ghi `InventoryReservation` trạng thái `'ACTIVE'`, TTL 15 phút (Online) hoặc 30 phút (COD).<br>2. Tổng số lượng trên chi tiết lô khớp chính xác số lượng giữ chỗ trên balances.<br>3. Ghi nhận sổ cái `inventory_transactions` loại `RESERVATION_HOLD`.<br>4. Xuất bản Outbox Event `INVENTORY_RESERVED` trong cùng transaction.<br>5. Bảo đảm Zero Overselling khi có tranh chấp đồng thời. | - Model `InventoryReservation` và `InventoryReservationItem`.<br>- Migration `20261115172431_add_inventory_reservations` kèm Check `chk_reservation_status`, `chk_res_item_quantity_positive`, index `idx_res_cleanup`.<br>- `InventoryReservationService.createReservation`: thực thi trong 1 transaction ACID.<br>- Concurrency test 10 transactions tranh chấp: Zero Overselling tuyệt đối.<br>- Test suite: `inventory-reservation.service.spec.ts` (6/6 PASS). | **PASS** |
| **EP02-T04** | 1. Hết 15 phút không thanh toán, tồn kho ATP tự động tăng trở lại đúng số lượng ban đầu.<br>2. Không xảy ra trường hợp trừ âm số lượng `reserved_quantity` (Idempotency).<br>3. Cronjob quét nền định kỳ an toàn bằng `SELECT ... FOR UPDATE SKIP LOCKED`.<br>4. Ghi nhận sổ cái `RESERVATION_RELEASE` và Outbox Event `RESERVATION_RELEASED`. | - Phương thức `releaseReservation(tx, reservationId, options)` và `releaseReservationById`.<br>- Idempotency guard: kiểm tra `status !== 'ACTIVE'` thì bỏ qua ngay.<br>- Scheduler `ReservationCleanupScheduler` chạy `@Cron(CronExpression.EVERY_MINUTE)` với `FOR UPDATE SKIP LOCKED`.<br>- Multi-worker test: 2 worker quét đồng thời không conflict.<br>- Test suite: `reservation-expiration.spec.ts` (4/4 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Nhất Quán (Architecture Review)

### 3.1 Ranh Giới Module & Sự Phụ Thuộc (Module Boundaries)
- **Tách biệt rạch ròi:** Toàn bộ logic Lô hàng, Phân bổ FEFO, Giữ chỗ và Scheduler dọn dẹp đều được đóng gói chuẩn mực bên trong `InventoryModule`.
- **Giao tiếp liên Module an toàn:**
  - `AsyncInfrastructureModule` được inject qua contract token `OUTBOX_WRITER` (`IOutboxWriter`).
  - Giao tiếp ra bên ngoài với OMS/Orders module thông qua Application Port (`InventoryReservationService`) và Transactional Outbox Events (`INVENTORY_RESERVED`, `RESERVATION_RELEASED`).
  - Không có hiện tượng Circular Dependency giữa các module.

### 3.2 Ranh Giới Giao Dịch ACID (Transaction Boundaries)
- Mọi thao tác thay đổi số dư tồn kho, khóa lô hàng, tạo bản ghi giữ chỗ, ghi sổ cái (Ledger) và xuất bản Outbox Event đều nằm **bên trong cùng một PostgreSQL Transaction Client (`tx: Prisma.TransactionClient`)**.
- Nếu có bất kỳ lỗi nào xảy ra ở bất kỳ bước nào (ví dụ thiếu hàng ở 1 lô, vi phạm Check constraint, hoặc lỗi mạng Outbox), toàn bộ transaction lập tức được rollback 100%, bảo đảm dữ liệu luôn ở trạng thái nhất quán hoàn hảo.

### 3.3 Cơ Chế An Toàn Cạnh Tranh & Phòng Chống Deadlock (Concurrency Safety)
1. **Deadlock Prevention Ordering:** Trong `FefoAllocationService.allocateAndLockLots`, danh sách items luôn được sắp xếp theo thứ tự `variantId ASC` trước khi thực thi lệnh `SELECT ... FOR UPDATE`. Điều này ngăn chặn triệt để hiện tượng Deadlock chéo giữa 2 luồng checkout đồng thời (Thread 1 lock Variant A rồi Variant B; Thread 2 lock Variant B rồi Variant A).
2. **Two-Level Protection Guardrail:**
   - *Cấp Lô hàng (`inventory_lots`):* Khóa bi quan dòng `FOR UPDATE` và kiểm tra `quantity_on_hand >= quantity_reserved` (Check Constraint `chk_lot_quantities`).
   - *Cấp Tổng thể (`inventory`):* Check Constraint `chk_inventory_balances_logical` chặn đứng mọi nỗ lực ghi đè khiến `reserved_quantity > quantity`.
3. **Multi-Worker Safety trong Scheduler:**
   - `ReservationCleanupScheduler` sử dụng mệnh đề `SELECT ... FOR UPDATE SKIP LOCKED`. Khi có nhiều container/instance backend cùng quét dọn dẹp, các bản ghi đang được instance A xử lý sẽ được instance B tự động bỏ qua (skip), loại bỏ hoàn toàn race condition và khóa chờ (lock wait timeout).

### 3.4 Bảo Vệ Tính Bất Biến & Idempotency
- Phương thức `releaseReservation` kiểm tra trạng thái: nếu reservation đã chuyển sang `RELEASED`, `EXPIRED` hoặc `FULFILLED`, hệ thống lập tức log warning và trả về kết quả an toàn với `releasedItems: []`. Điều này ngăn chặn tình trạng một reservation bị giải phóng nhiều lần dẫn đến trừ âm tồn kho giữ chỗ.

---

## 4. Rà Soát Cơ Sở Dữ Liệu & Migrations (Database & Migration Review)

| Tên Migration | Mục Đích | Bảng & Đối Tượng Tác Động | Ràng Buộc & Indexes |
| :--- | :--- | :--- | :--- |
| `20261115165648_add_inventory_lots_and_min_shelf_life` | Quản lý lô hàng và hạn sử dụng FEFO | Bảng `inventory_lots`, thêm cột `min_shelf_life_days` vào `product_variants` | - Check `chk_lot_quantities` (`quantity_on_hand >= quantity_reserved`)<br>- Check không âm cho 3 cột số lượng<br>- Unique index `uq_lot_batch` trên `(location_id, product_variant_id, batch_code)`<br>- B-Tree index `idx_lots_fefo_search` trên `(location_id, product_variant_id, expiry_date ASC)` |
| `20261115172431_add_inventory_reservations` | Header và chi tiết giữ chỗ tồn kho | Bảng `inventory_reservations`, `inventory_reservation_items` | - Check `chk_reservation_status` (`ACTIVE`, `RELEASED`, `EXPIRED`, `FULFILLED`)<br>- Check `chk_res_item_quantity_positive` (`quantity > 0`)<br>- Unique index trên `fulfillment_order_id`<br>- Index `idx_res_cleanup` trên `(status, expires_at)`<br>- Index `idx_reservation_items_res_id` trên `reservation_id` |

- **Tính tương thích ngược:** Toàn bộ migrations mở rộng theo mô hình Non-breaking Schema changes, không làm gián đoạn dữ liệu và các module hiện hữu.
- **Thực thi trên Cloud:** Cả 2 migrations đều đã được apply thành công 100% trên PostgreSQL 16 AWS Neon.

---

## 5. Kết Quả Kiểm Thử Toàn Diện (Test Execution Results)

### 5.1 Các Test Suites Của EPIC 02
Toàn bộ **5 test suites** (bao gồm bài kiểm thử E2E Integrated Lifecycle Flow) đã được thực thi với kết quả **27/27 tests PASS**:

```
PASS src/modules/inventory/infrastructure/__tests__/inventory-lot.migration.spec.ts (8 tests)
PASS src/modules/inventory/application/services/__tests__/fefo-allocation.service.spec.ts (8 tests)
PASS src/modules/inventory/application/services/__tests__/inventory-reservation.service.spec.ts (6 tests)
PASS src/modules/inventory/application/services/__tests__/reservation-expiration.spec.ts (4 tests)
PASS src/modules/inventory/infrastructure/__tests__/epic-02-integrated-flow.spec.ts (1 test - E2E Lifecycle Flow)

Test Suites: 5 passed, 5 total
Tests:       27 passed, 27 total (100% PASS)
Time:        81.605s
```

### 5.2 Kiểm Thử Hồi Quy Toàn Hệ Thống (Cross-Epic Regression)
Kiểm thử đối chiếu tích hợp giữa EPIC 01 và EPIC 02:
- `epic-01-integrated-flow.spec.ts`: **PASS**
- `epic-02-integrated-flow.spec.ts`: **PASS**
- `inventory-balance.migration.spec.ts`: **PASS**
- `outbox-writer.spec.ts`: **PASS**
- `atp-calculator.spec.ts`: **PASS**
- `inventory-balance.service.spec.ts`: **PASS**
- `location.service.spec.ts`: **PASS**
- **Tổng cộng hồi quy:** **7 suites, 46/46 tests PASS** (36.4s).

### 5.3 Kiểm Thử Biên Dịch (Compilation & Type Check)
- Lệnh: `npm run build` (`nest build`)
- Kết quả: **Exit Code 0** sạch sẽ, không có bất kỳ cảnh báo hoặc lỗi type nào.

---

## 6. Danh Mục Khiếm Khuyết & Nợ Kỹ Thuật (Defects & Technical Debt)

### 6.1 Bảng Phân Loại Lỗi (Defect Log)
- **CRITICAL (Chặn nghiệm thu):** 0
- **HIGH (Nguy cơ sai dữ liệu / nghiệp vụ):** 0
- **MEDIUM (Thiếu chức năng / test):** 0
- **LOW (Technical Debt nhỏ):** 0

### 6.2 Quét Nợ Kỹ Thuật (TODO / FIXME Scan)
- Kết quả quét tự động trên toàn bộ mã nguồn của Epic 02: **0 TODO, 0 FIXME, 0 HACK, 0 XXX**.

---

## 7. Trạng Thái Quyết Định Nghiệp Vụ (Business Decisions Review)

- **DEC-01 $\rightarrow$ DEC-05:** Không có quyết định nghiệp vụ nào bị vi phạm hay hardcode sai lệch trong Epic 02.
  - Quy định cận date mỹ phẩm: Đã hiện thực hóa đúng chuẩn bằng trường `minShelfLifeDays` (180 ngày) và cờ `isClearance`.
  - Quy định thanh toán và thời hạn giữ chỗ: Đã chuẩn hóa đúng 15 phút cho Online/VNPAY và 30 phút cho COD.

---

## 8. Kết Luận Nghiệm Thu (Final Verdict)

$$\mathbf{KẾT\ LUẬN:\ PASS}$$

Toàn bộ 4 nhiệm vụ của **EPIC 02: FEFO & Reservation Engine** đã hoàn thành trọn vẹn, thỏa mãn 100% Acceptance Criteria và đạt chuẩn Definition of Done (DoD). Hệ thống sẵn sàng đóng Epic 02 và chuyển giao sang Epic tiếp theo.

---

## 9. Kế Hoạch Triển Khai Epic Kế Tiếp: EPIC 03 – OMS & Hybrid Routing Engine

### 9.1 Kiểm Tra Điều Kiện Tiên Quyết (Prerequisites Check)
- EPIC 01 (Location & Inventory Foundation): `[DONE]`
- EPIC 02 (FEFO & Reservation Engine): `[DONE]`
- Tất cả dependencies của EPIC 03 đã được đáp ứng đầy đủ 100%!

### 9.2 Execution Brief Cho Task Đầu Tiên Của Epic 03: `EP03-T01`

```yaml
Task ID: EP03-T01
Tên Nhiệm Vụ: Xây Dựng Dịch Vụ Tính Quãng Đường & Báo Giá Vận Chuyển (Shipping Quote & Distance)
Epic: EPIC 03 – OMS & Hybrid Routing Engine
Độ Phức Tạp: Medium (M)
Dependencies: EP01-T04 (ĐÃ HOÀN THÀNH).
Mục Tiêu Nghiệp Vụ & Kỹ Thuật:
  Tính toán cước phí và xác định khoảng cách đường bộ thực tế từ các chi nhánh tới địa chỉ khách hàng theo quyết định DEC-01:
  1. Tạo DistanceCalculatorService:
     - Tích hợp OpenRouteService / Google Distance Matrix để tính cự ly đường bộ thực tế.
     - Cơ chế dự phòng (Fallback): Tính Haversine * 1.3 (hệ số uốn lượn đô thị) khi API ngoài bị lỗi mạng hoặc quá quota.
  2. Xây dựng ShippingQuoteService.calculateQuotes(cart, shippingAddress):
     - Kiểm tra điều kiện Hỏa Tốc 2H: Khoảng cách đường bộ <= 10 km (DEC-01 [APPROVED]).
     - Trả về danh sách tùy chọn vận chuyển (quoteGroupId, options).
  3. Caching & Lưu trữ:
     - Lưu báo giá tạm thời vào bảng shipping_quotes.
     - Cache vào Upstash Redis (TTL: 15 phút).
  4. API Endpoint:
     - POST /api/v1/shipping/quotes (Validate DTO, Controller, Swagger).
Acceptance Criteria:
  1. Khách cách 10.5 km đường bộ -> Tùy chọn 2H trả về isAvailable = false.
  2. Báo giá được lưu trong DB/Redis và không thể bị sửa đổi từ phía client.
Test Cases:
  - Unit test khoảng cách thực tế và fallback Haversine factor 1.3.
  - Integration test endpoint POST /api/v1/shipping/quotes.
```

---
*Báo cáo kết thúc. Agent dừng lại tại đây và chờ phê duyệt từ User.*
