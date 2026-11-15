# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 01 – LOCATION & INVENTORY FOUNDATION
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-01`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Phân hệ:** Fulfillment, Logistics & RMA (P0)  
**Thời điểm lập:** 2026-11-15T23:48:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu tham chiếu:**  
- `docs/2-design/05_thiet_ke_fulfillment_logistics_rma.md` (Phiên bản v3.1-ENTERPRISE)  
- `docs/2-design/DES-06-FULFILLMENT-IMPLEMENTATION-PLAN.md`  
- `docs/2-design/DES-07-FULFILLMENT-WORK-BREAKDOWN.md`  
- `docs/2-design/IMPLEMENTATION-LOG.md`  
- `docs/2-design/IMPLEMENTATION-HANDOFF.md`  

---

## 1. Epic Scope & Danh Sách Tasks

### 1.1. Phạm Vi Nghiệp Vụ Cốt Lõi Của Epic 01
EPIC 01 chịu trách nhiệm thiết lập nền tảng dữ liệu vật lý và số dư tồn kho phân đoạn, quy chuẩn công thức toán học tính toán tồn kho khả dụng bán lẻ (ATP), khởi tạo hạ tầng xuất bản sự kiện giao dịch bền vững (Transactional Outbox), và cung cấp API truy vấn mạng lưới địa điểm (Showroom / Central Warehouse) kèm đánh giá năng lực phục vụ đơn hàng trong ngày.

### 1.2. Danh Sách Tasks Thuộc Epic 01
| Task ID | Tên Nhiệm Vụ | Mục Tiêu & Trách Nhiệm Kỹ Thuật | Phụ Thuộc (Dependencies) | Trạng Thái Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- |
| **EP01-T01** | **Khởi Tạo Schema Locations & Inventory Balances** | Mở rộng model `Store` (`fulfillmentCapacityPerDay`) & `Inventory` (`safetyStock`, `quarantinedQuantity`, `damagedQuantity`). Áp dụng Check Constraints `chk_inventory_balances_logical`, non-negative constraints và Generated Stored Column `available_quantity`. Seed 9 địa điểm (Kho Tân Bình 2500 đơn/ngày, Kho Hà Nội 2000 đơn/ngày, 7 Showroom HCM 500 đơn/ngày) và 200 bản ghi tồn kho mẫu. | Không | **`DONE`** (Verified by 6/6 DB specs) |
| **EP01-T02** | **Thiết Lập Nền Tảng Transactional Outbox & Event Contract** | Tạo model `OutboxEvent`, migration bảng `outbox_events` với partial index `idx_outbox_events_pending`, interface `BaseDomainEvent<T>` (CloudEvents spec), `IOutboxWriter` token, `OutboxWriterService` ghi transactional atomic và `AsyncInfrastructureModule` đăng ký vào `AppModule`. | Không | **`DONE`** (Verified by 5/5 Outbox specs) |
| **EP01-T03** | **Xây Dựng Inventory Balance Domain Service & ATP Calculator** | Triển khai công thức ATP toán học chuẩn $\text{ATP} = \max(0, \text{physical} - \text{reserved} - \text{safety} - \text{quarantined} - \text{damaged})$ tại `AtpCalculatorService`. Triển khai `InventoryBalanceService` (`getBalance`, `getAtp`, `getBulkAtp`, `checkAvailability` kèm hỗ trợ `tx`). Export trong `InventoryModule`. | EP01-T01 | **`DONE`** (Verified by 20/20 specs) |
| **EP01-T04** | **API Quản Lý Địa Điểm & Kiểm Tra Năng Lực Hoàn Tất** | Triển khai `LocationQueryDto`, `LocationResponseDto`, `LocationCapacityResponseDto`. Viết `LocationService` (đánh giá khung giờ mở cửa theo timezone `Asia/Ho_Chi_Minh`, đếm đơn đã phân bổ trong ngày đối chiếu `fulfillmentCapacityPerDay`, tích hợp cache-aside `UpstashRedisService` TTL 1h). `LocationController` cung cấp `GET /locations` và `GET /locations/:id/capacity`. | EP01-T01 | **`DONE`** (Verified by 10/10 specs) |

---

## 2. Task Acceptance Matrix

| Task ID | Tiêu Chí Nghiệm Thu (Acceptance Criteria) Theo DES-07 | Kết Quả Kiểm Chứng Thực Tế | Đánh Giá (Pass/Fail) |
| :--- | :--- | :--- | :--- |
| **EP01-T01** | **AC1:** `npx prisma migrate dev` thực thi 100% không lỗi cú pháp. | Migration `20261115155213` & `20261115155239` áp dụng thành công trên Neon PostgreSQL 16. | **`PASS`** |
| | **AC2:** Chặn vi phạm tổng `(reserved + safety + quarantined + damaged) > physical` qua mã lỗi DB `23514`. | Test case kiểm chứng ném lỗi PostgreSQL Check Violation `23514` khi cố tình vi phạm. | **`PASS`** |
| | **AC3:** Chặn cập nhật số âm cho `safety_stock`, `quarantined_quantity`, `damaged_quantity`. | Test case xác nhận ném mã lỗi `23514` khi truyền giá trị `< 0`. | **`PASS`** |
| | **AC4:** Cột `available_quantity` (ATP) tự động tính toán chính xác ở mức database engine. | Dữ liệu kiểm tra: 100 on-hand, 10 reserved, 5 safety, 3 quarantined, 2 damaged $\implies$ DB trả về chính xác 80. | **`PASS`** |
| | **AC5:** Seed script sinh đúng các địa điểm trọng yếu kèm năng lực và 200 bản ghi tồn kho mẫu. | Chạy `npx ts-node prisma/seed-stores.ts` nạp đủ 9 địa điểm (Kho Tân Bình 2500 đơn/ngày, Showroom Q1, Q10, Bình Thạnh). | **`PASS`** |
| **EP01-T02** | **AC1:** Gọi `OutboxWriterService.record(tx, event)` trong transaction bị rollback thì outbox event cũng bị rollback (ACID). | Test case giao dịch bị rollback chứng minh bản ghi outbox không bị commit mồ côi (Zero Orphan Events). | **`PASS`** |
| | **AC2:** Bảng `outbox_events` được tạo với trạng thái mặc định `'PENDING'`, `retry_count = 0`. | Cấu trúc mặc định schema và dữ liệu test khớp chính xác. | **`PASS`** |
| | **AC3:** `recordMany(tx, events)` ghi nhận hàng loạt sự kiện và bảo toàn tính nguyên tử ACID. | Kiểm thử ghi nhiều sự kiện đồng thời trong transaction đạt 100% nhất quán. | **`PASS`** |
| **EP01-T03** | **AC1:** Nếu physical = 10, reserved = 2, safety = 1, quarantined = 1 $\implies$ ATP trả về 6. | Test case `calculateAtp({ physicalOnHand: 10, reservedQuantity: 2, safetyStock: 1, quarantinedQuantity: 1 })` trả về 6. | **`PASS`** |
| | **AC2:** Nếu ATP tính ra $< 0 \implies$ Hàm tự động trả về 0, tuyệt đối không trả số âm. | Test case tính ra $-5$ trả về đúng 0 qua hàm $\max(0, \dots)$. | **`PASS`** |
| | **AC3:** `getBulkAtp` trả về `Map<variantId, atp>`, mặc định 0 cho variant không có số dư. | Test case hàng loạt trả về `Map` đầy đủ, fallback an toàn cho variant không tìm thấy. | **`PASS`** |
| | **AC4:** `checkAvailability` phát hiện chính xác thiếu hụt tồn kho giỏ hàng và danh sách shortfalls. | Test case với item vượt tồn trả về `isAvailable: false` kèm `shortfalls` chi tiết. | **`PASS`** |
| **EP01-T04** | **AC1:** API trả về danh sách chi nhánh kèm trạng thái hoạt động theo giờ thực tế (`isOpenNow`, `currentLocalTime`). | Logic `LocationService.checkIsOpenNow` tính toán chuẩn xác theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7). | **`PASS`** |
| | **AC2:** Nếu số đơn trong ngày $\ge \text{capacity} \implies$ Trường `isCapacityAvailable` trả về `false`. | Test case với số đơn đạt 2500/2500 trả về `isCapacityAvailable: false`; dưới ngưỡng trả về `true`. | **`PASS`** |
| | **AC3:** API có Swagger documentation, DTO validation chuẩn hóa. | DTOs kế thừa `@ApiProperty`, validation decorator đầy đủ. Endpoint gắn `@Public()` truy cập an toàn. | **`PASS`** |

---

## 3. Architecture & Integration Review

### 3.1. Ranh Giới Module & Tính Đóng Gói (Module Boundaries)
- **Tái Sử Dụng Kiến Trúc Hiện Hữu:**
  - Không phá vỡ 15+ modules sẵn có bằng cách tạo bảng `locations` hay `inventory_balances` rời rạc. Tận dụng trực tiếp model `Store` (đóng vai trò Location vật lý) và `Inventory` (đóng vai trò phân đoạn số dư tồn kho).
  - Tách bạch hạ tầng phi đồng bộ sang `AsyncInfrastructureModule` (`modules/async-infrastructure`), đóng gói `OutboxWriterService` và export token `OUTBOX_WRITER` để toàn bộ hệ thống sử dụng mà không tạo vòng lặp phụ thuộc (Circular Dependency).
- **Phân Lớp Clean Architecture Trong `InventoryModule`:**
  - **Domain / Application Layer:** `AtpCalculatorService`, `InventoryBalanceService`, `LocationService`.
  - **Presentation Layer:** `LocationController`, các DTOs (`LocationQueryDto`, `LocationResponseDto`, `LocationCapacityResponseDto`).
  - **Export Contract:** `InventoryModule` export `AtpCalculatorService`, `InventoryBalanceService`, `LocationService` phục vụ trực tiếp cho Checkout (`CommerceCheckoutService`), Đặt giữ chỗ FEFO (`EPIC 02`) và Định tuyến đơn hàng (`EPIC 03`).

### 3.2. Ranh Giới Giao Dịch & Tính Nhất Quán (Transaction Boundaries & ACID)
- **Transactional Outbox Integration:**
  - `OutboxWriterService` nhận `tx: Prisma.TransactionClient` làm tham số bắt buộc đầu tiên.
  - Sự kiện nghiệp vụ và các thao tác cập nhật dữ liệu (như giữ chỗ, xuất kho) được cam kết thực hiện trong cùng một database transaction. Nếu có lỗi xảy ra ở bất kỳ câu lệnh nào, toàn bộ giao dịch bao gồm cả Outbox Event sẽ rollback sạch sẽ.
- **Không Dùng Cache Thay Thế Database Transaction:**
  - `UpstashRedisService` chỉ đóng vai trò Cache-Aside (TTL 1 giờ) cho tác vụ đọc danh sách địa điểm tĩnh (`listLocations`).
  - Toàn bộ tính toán năng lực phục vụ đơn hàng (`getLocationCapacity`) và số dư tồn kho (`InventoryBalanceService`) đều truy vấn trực tiếp từ PostgreSQL để đảm bảo tính tươi mới và nhất quán dữ liệu (Strong Consistency).

### 3.3. Bảo Đảm Không Chứa Technical Workaround
- Đã thực hiện quét tự động toàn bộ codebase của `modules/inventory` và `modules/async-infrastructure`: **Hoàn toàn KHÔNG có `TODO`, `FIXME`, `HACK`, `XXX`**.
- Xử lý múi giờ bằng thư viện chuẩn hóa `Intl.DateTimeFormat` với `timeZone: 'Asia/Ho_Chi_Minh'`, không dùng hardcode offset thủ công dễ lỗi khi chuyển mùa hoặc leap second.

---

## 4. Database & Migration Review

### 4.1. Danh Sách Migrations Đã Áp Dụng
1. **`20261115155213_add_location_capacity_and_inventory_balances`**
   - Thêm cột `fulfillment_capacity_per_day` (INTEGER, default 500) vào bảng `stores`.
   - Thêm các cột phân đoạn `safety_stock`, `quarantined_quantity`, `damaged_quantity` (INTEGER, default 0) vào bảng `inventory`.
2. **`20261115155239_add_location_capacity_and_inventory_balances`**
   - Ràng buộc không âm: `chk_inventory_safety_non_negative`, `chk_inventory_quarantined_non_negative`, `chk_inventory_damaged_non_negative`.
   - Ràng buộc logic số dư tồn kho:
     ```sql
     ALTER TABLE "inventory"
         ADD CONSTRAINT "chk_inventory_balances_logical"
         CHECK ("quantity" >= ("reserved_quantity" + "safety_stock" + "quarantined_quantity" + "damaged_quantity"));
     ```
   - Cột tự sinh vật lý ATP:
     ```sql
     ALTER TABLE "inventory"
         ADD COLUMN "available_quantity" INTEGER GENERATED ALWAYS AS 
         ("quantity" - ("reserved_quantity" + "safety_stock" + "quarantined_quantity" + "damaged_quantity")) STORED;
     ```
3. **`20261115161243_add_outbox_events_table`**
   - Tạo bảng `outbox_events` lưu trữ sự kiện miền theo chuẩn CloudEvents.
   - B-Tree Index: `idx_outbox_events_status_created` trên `(status, created_at)`.
   - **Partial Index:**
     ```sql
     CREATE INDEX "idx_outbox_events_pending" ON "outbox_events"("created_at") WHERE "status" = 'PENDING';
     ```
     Index này giúp các worker quét sự kiện chờ xử lý với `SELECT ... FOR UPDATE SKIP LOCKED` chỉ quét một tập con cực nhỏ của bảng, không bị suy giảm hiệu năng theo thời gian khi bảng phình to.

### 4.2. Khả Năng Tương Thích & Tính Bền Vững (Zero Breaking Changes)
- Toàn bộ các cột mới đều có giá trị mặc định (`DEFAULT 0` hoặc `DEFAULT 500`).
- Không làm gián đoạn hay xung đột với các câu lệnh INSERT/UPDATE hiện hữu của hệ thống bán hàng POS / Web.
- Tốc độ truy vấn được bảo đảm bởi Unique Index `(store_id, product_variant_id)` và B-Tree Index `idx_inventory_store_variant`.

---

## 5. Integration Review

### 5.1. Tích Hợp Xuyên Suốt Luồng Nghiệp Vụ (Integrated Flow)
Một test suite E2E độc lập đã được thiết lập tại `src/modules/inventory/infrastructure/__tests__/epic-01-integrated-flow.spec.ts` kiểm chứng toàn diện liên kết giữa các thành phần:
```
[Client / API Consumer]
         │
         ▼
[LocationService & Controller] ───► Đánh giá giờ mở cửa Asia/Ho_Chi_Minh & Capacity ngày
         │
         ▼
[InventoryBalanceService] ────────► Truy vấn số dư 5 phân đoạn, tính toán ATP logic
         │
         ▼
[PostgreSQL Database] ────────────► Kiểm chứng chéo cột STORED available_quantity khớp 100% với Domain Service
         │
         ▼
[Transactional Outbox Unit] ──────► Ghi nhận sự kiện ORDER_RESERVED đồng thời trong cùng DB Transaction
         │
         ▼
[ACID Rollback Check] ────────────► Khi có lỗi ném ra, rollback toàn bộ số dư và Outbox Event
```

### 5.2. Khả Năng Tương Thích Với Các Epic Kế Tiếp
- **Sẵn Sàng Cho EPIC 02 (FEFO & Reservation Engine):**
  - `InventoryBalanceService` đã hỗ trợ tham số `tx: Prisma.TransactionClient`, cho phép `ReservationService` trong Epic 02 truyền giao dịch vào để kiểm tra và trừ tồn kho.
  - Công thức ATP đồng bộ tuyệt đối giữa Application logic và Database check constraints giúp thuật toán FEFO không bao giờ rơi vào trạng thái overselling.
- **Sẵn Sàng Cho EPIC 03 (OMS & Hybrid Routing Engine):**
  - `LocationService.listLocations` và `getLocationCapacity` cung cấp dữ liệu đầu vào tức thời để Routing Engine đánh giá: Kho nào còn năng lực phục vụ, showroom nào đang mở cửa, kho nào còn đủ ATP.
- **Sẵn Sàng Cho EPIC 09 (Event-Driven Async Infrastructure):**
  - Partial Index `idx_outbox_events_pending` trên `outbox_events` đã sẵn sàng để Outbox Relay Worker thực hiện `SELECT FOR UPDATE SKIP LOCKED` định kỳ.

---

## 6. Test Execution Results

Hệ thống đã thực hiện kiểm thử tự động toàn diện trên toàn bộ 7 test suites thuộc phạm vi Epic 01:

```
Test Suites: 7 passed, 7 total
Tests:       47 passed, 47 total
Snapshots:   0 total
Time:        21.571 s
```

### Bảng Chi Tiết Kết Quả Kiểm Thử (Test Suites Breakdown)
| STT | File Test Suite | Loại Kiểm Thử | Số Lượng Tests | Kết Quả | Thời Gian |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | `inventory-balance.migration.spec.ts` | Integration / DB Constraints | 6/6 | **PASS** | 2.5s |
| 2 | `outbox-writer.spec.ts` | Integration / ACID Transaction | 5/5 | **PASS** | 3.1s |
| 3 | `atp-calculator.spec.ts` | Unit / Mathematical Boundary | 11/11 | **PASS** | 0.8s |
| 4 | `inventory-balance.service.spec.ts` | Unit & Integration Service | 9/9 | **PASS** | 1.8s |
| 5 | `location.service.spec.ts` | Unit & Timezone & Capacity | 8/8 | **PASS** | 1.5s |
| 6 | `location.controller.spec.ts` | Presentation / Controller | 2/2 | **PASS** | 0.9s |
| 7 | **`epic-01-integrated-flow.spec.ts`** | **Cohesive E2E Integration Flow** | **6/6** | **PASS** | **3.8s** |
| **Tổng** | **7 Test Suites** | **Toàn diện Epic 01** | **47/47** | **PASS** | **21.57s** |

### Kết Quả Kiểm Thử Biên Dịch (Compilation / Build Check)
- Lệnh: `npm run build` (`nest build`)
- Mã thoát (Exit Code): **`0`** (Biên dịch thành công 100%, không cảnh báo, không lỗi Type inference).

---

## 7. Defects & Mức Độ Nghiêm Trọng

| Mã Lỗi | Mô Tả | Mức Độ | Trạng Thái Xử Lý |
| :---: | :--- | :---: | :---: |
| - | **Không phát hiện lỗi tồn đọng** | - | **0 Defect** |

- **CRITICAL:** **0** (Không có lỗi chặn nghiệm thu).
- **HIGH:** **0** (Không có nguy cơ sai lệch dữ liệu hay vi phạm nghiệp vụ).
- **MEDIUM:** **0** (Không thiếu chức năng hay thiếu test).
- **LOW:** **0** (Mã nguồn sạch, build chuẩn, không còn nợ kỹ thuật).

---

## 8. Technical Debt & Nhận Xét Kiến Trúc (Technical Debt)

1. **Khối Lượng Dữ Liệu Bảng `outbox_events` Theo Thời Gian:**
   - *Hiện trạng:* Bảng `outbox_events` hiện tại chỉ lưu trữ và đánh dấu `status = 'PUBLISHED'`.
   - *Đánh giá:* Chưa có job dọn dẹp (Retention / Archival cleanup). Tuy nhiên, nhờ có Partial Index `idx_outbox_events_pending`, tốc độ truy vấn sự kiện chờ xuất bản (`PENDING`) không bị ảnh hưởng.
   - *Kế hoạch:* Sẽ bổ sung Cronjob lưu trữ/xóa các sự kiện đã xuất bản trên 30 ngày trong `EPIC 12 (Observability & Disaster Recovery)`.
2. **Cơ Chế Khóa Dòng Khi Giữ Chỗ Tồn Kho:**
   - *Hiện trạng:* Epic 01 mới dừng lại ở việc đọc số dư ATP an toàn.
   - *Kế hoạch:* Thao tác ghi giữ chỗ với `SELECT ... FOR UPDATE` bi quan (Pessimistic Row Locking) sẽ được hoàn thiện trong task `EP02-T03`.

---

## 9. Trạng Thái Các Quyết Định Nghiệp Vụ (Business Decisions)

| Mã Quyết Định | Nội Dung Quyết Định | Trạng Thái Trong DES-05 / DES-06 | Xử Lý Trong Epic 01 |
| :---: | :--- | :---: | :--- |
| **DEC-01** | Giao Hỏa tốc 2H (Ahamove): Bán kính $\le 10$ km đường bộ. | `[APPROVED]` | Đã chuẩn hóa tọa độ lat/long của Showrooms; logic cự ly sẽ áp dụng tại Epic 03 & 07. |
| **DEC-02** | Tách đơn (Split Fulfillment): Đơn hàng $\ge 500.000$đ, trần trợ giá 35.000đ. | `[APPROVED]` | Sẵn sàng cho Epic 03. |
| **DEC-03** | Đổi ý (Change-of-Mind): Thời hạn 7 ngày từ khi `DELIVERED`. | `[APPROVED]` | Sẵn sàng cho Epic 08 & RMA. |
| **DEC-04** | Phí thu hồi trả hàng 20.000đ – 30.000đ. | `[APPROVED]` | Sẵn sàng cho RMA. |
| **DEC-05** | Khiếu nại kích ứng da: Cho phép mở seal, hao hụt $\le 20\%$. | `[PENDING_LEGAL_REVIEW]` | Không ảnh hưởng đến Epic 01. Code không hardcode logic vi phạm quy định pháp lý. |

---

## 10. Kết Luận Nghiệm Thu (Conclusion)

### KẾT LUẬN: **PASS**

**Căn cứ phê duyệt:**
1. Toàn bộ 4/4 Tasks thuộc `EPIC 01` (`EP01-T01` $\rightarrow$ `EP01-T04`) đã hoàn thành 100% Acceptance Criteria theo chuẩn `DES-07`.
2. Toàn bộ 7 test suites với **47/47 test cases tự động đều đạt kết quả PASS**.
3. Bài kiểm thử tích hợp luồng nghiệp vụ E2E xuyên suốt Epic 01 chứng minh tính toàn vẹn dữ liệu, nhất quán công thức ATP giữa DB & Service, và tính nguyên tử ACID của Transactional Outbox.
4. Dự án biên dịch sạch sẽ (`nest build` Exit code 0), không có mã lỗi CRITICAL/HIGH/MEDIUM/LOW, không có `TODO`/`FIXME` tồn đọng.
5. Không tạo thêm bảng hay abstraction không cần thiết, tái sử dụng tối đa cấu trúc của hệ thống hiện hữu.

---

## 11. Bàn Giao & Chuẩn Bị Cho Epic Kế Tiếp

- **Epic Kế Tiếp:** **`EPIC 02 – FEFO & Reservation Engine`**
- **Độ Phức Tạp:** Large (4 Tasks: `EP02-T01` $\rightarrow$ `EP02-T04`)
- **Kiểm Tra Dependencies Của Epic 02:**
  - `EP02-T01` (Nâng Cấp Schema Lô Hàng Hạn Dùng & Cấu Hình Hạn Lưu Thông Tối Thiểu) phụ thuộc vào `EP01-T01` $\implies$ **ĐÃ THỎA MÃN (EP01-T01 DONE)**.
- **Execution Brief Cho Task `EP02-T01`:**
  - **Mục tiêu:** Mở rộng cơ sở dữ liệu để quản lý hạn dùng từng lô hàng (`InventoryLot`) tại từng địa điểm, bổ sung cấu hình thời hạn lưu hành tối thiểu (`minShelfLifeDays`) cho sản phẩm, và thiết lập ràng buộc toàn vẹn số lượng lô.
  - **Phạm vi kỹ thuật:**
    1. Tạo Prisma model `InventoryLot` với các trường `id`, `locationId`, `productVariantId`, `batchCode`, `expiryDate`, `quantityOnHand`, `quantityReserved`.
    2. Thêm trường `minShelfLifeDays` (Int, default 180) vào model `ProductVariant` hoặc `Product`.
    3. Viết PostgreSQL Migration bổ sung ràng buộc toàn vẹn `quantity_on_hand >= quantity_reserved`, các ràng buộc không âm và B-Tree Index tối ưu truy vấn FEFO: `(location_id, product_variant_id, expiry_date ASC)`.
    4. Viết integration test xác thực schema, constraints và index.
  - **Ràng buộc:** Giữ nguyên quy tắc không tự ý triển khai code cho đến khi User review và đồng ý với Báo cáo Nghiệm thu Epic 01.
