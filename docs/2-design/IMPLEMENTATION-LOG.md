# IMPLEMENTATION LOG: FULFILLMENT, LOGISTICS & RMA

**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Core Commerce Fulfillment, Inventory FEFO, 3PL Shipping, Async Ingress & COD Reconciliation)  
**Tài liệu tham chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06-FULFILLMENT-IMPLEMENTATION-PLAN`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`

---

## Nhật Ký Triển Khai Nhiệm Vụ (Task Execution Log)

### [2026-11-15] EP01-T01: Khởi Tạo Schema Locations & Inventory Balances
- **Epic:** EPIC 01 – Location & Inventory Foundation
- **Trạng thái:** `DONE`
- **Thay đổi kỹ thuật:**
  - Bổ sung `fulfillmentCapacityPerDay` vào model `Store`.
  - Mở rộng model `Inventory` với `safetyStock`, `quarantinedQuantity`, `damagedQuantity`.
  - 2 Migrations PostgreSQL:
    - `20261115155213_add_location_capacity_and_inventory_balances`
    - `20261115155239_add_location_capacity_and_inventory_balances` (Check constraints `chk_inventory_balances_logical`, `chk_inventory_safety_non_negative`, `chk_inventory_quarantined_non_negative`, `chk_inventory_damaged_non_negative`, và generated stored column `available_quantity`).
  - Seed 9 địa điểm (2 Warehouse Tân Bình, Hà Nội + 7 Showrooms) và 200 bản ghi tồn kho mẫu.
- **Kiểm thử:** `inventory-balance.migration.spec.ts` (6/6 tests PASS).

---

### [2026-11-15] EP01-T02: Thiết Lập Nền Tảng Transactional Outbox & Event Contract
- **Epic:** EPIC 01 – Location & Inventory Foundation
- **Trạng thái:** `DONE`
- **Thay đổi kỹ thuật:**
  - Bổ sung model `OutboxEvent` vào `schema.prisma`.
  - Migration `20261115161243_add_outbox_events_table` kèm Partial Index `idx_outbox_events_pending`.
  - Tạo `BaseDomainEvent<T>` (CloudEvents spec).
  - Tạo `IOutboxWriter` interface & token `OUTBOX_WRITER`.
  - Triển khai `OutboxWriterService` hỗ trợ `record` và `recordMany`.
  - Đóng gói `AsyncInfrastructureModule`, đăng ký vào `AppModule`.
- **Kiểm thử:** `outbox-writer.spec.ts` (5/5 tests PASS, kiểm chứng thành công ACID rollback).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

### [2026-11-15] EP01-T03: Xây Dựng Inventory Balance Domain Service & ATP Calculator
- **Epic:** EPIC 01 – Location & Inventory Foundation
- **Trạng thái:** `DONE`
- **Dependencies:** EP01-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Tạo `AtpCalculatorService` (`backend/src/modules/inventory/application/services/atp-calculator.service.ts`):
    - Triển khai công thức toán học chuẩn:
      $$\text{ATP} = \max(0, \text{physical\_on\_hand} - \text{reserved\_quantity} - \text{safety\_stock} - \text{quarantined\_quantity} - \text{damaged\_quantity})$$
    - Phương thức `hasSufficientAtp(balance, requestedQuantity): boolean`.
  - Tạo `InventoryBalanceService` (`backend/src/modules/inventory/application/services/inventory-balance.service.ts`):
    - `getBalance(locationId, variantId, tx?)`: Truy vấn số dư chi tiết và tính toán ATP.
    - `getAtp(locationId, variantId, tx?)`: Lấy số lượng ATP đơn lẻ.
    - `getBulkAtp(locationId, variantIds[], tx?)`: Truy vấn hàng loạt ATP dạng `Map<variantId, atp>`, mặc định 0 cho variant không có số dư.
    - `checkAvailability(locationId, items[], tx?)`: Kiểm tra tính sẵn sàng tồn kho của giỏ hàng cho location, trả về chi tiết thiếu hụt (`shortfalls`).
  - Đăng ký và export `AtpCalculatorService`, `InventoryBalanceService` trong `InventoryModule`.
- **Kiểm thử:**
  - `atp-calculator.spec.ts`: 11/11 tests PASS (AC1: 10 - 2 - 1 - 1 = 6; AC2: chặn âm max(0, -1) = 0; ma trận biên null/undefined/0/alias).
  - `inventory-balance.service.spec.ts`: 9/9 tests PASS (`getBalance`, `getAtp`, `getBulkAtp`, `checkAvailability`, `tx` support).
  - Regression tests:
    - `outbox-writer.spec.ts`: 5/5 PASS.
    - `inventory-balance.migration.spec.ts`: 6/6 PASS.
    - `stock-calculation.spec.ts`: 6/6 PASS.
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

### [2026-11-15] EP01-T04: API Quản Lý Địa Điểm & Kiểm Tra Năng Lực Hoàn Tất (Location Query & Capacity)
- **Epic:** EPIC 01 – Location & Inventory Foundation
- **Trạng thái:** `DONE`
- **Dependencies:** EP01-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - DTOs:
    - `LocationQueryDto` (`type`, `city`, `isActive`).
    - `LocationResponseDto` & `OperatingStatusDto`.
    - `LocationCapacityResponseDto`.
  - Service `LocationService` (`backend/src/modules/inventory/application/services/location.service.ts`):
    - Đánh giá giờ mở cửa `checkIsOpenNow` theo múi giờ `Asia/Ho_Chi_Minh` (hỗ trợ Mon-Sun, Mon-Sat, Mon-Fri, theo thứ).
    - `listLocations(query)`: Truy vấn danh sách Showrooms & Kho tổng kèm trạng thái hoạt động tức thời, hỗ trợ cache-aside qua `UpstashRedisService` (TTL 1 giờ).
    - `getLocationCapacity(id)`: Tính toán số lượng đơn đã phân bổ trong ngày (theo ngày VN), đối chiếu `fulfillmentCapacityPerDay` để xác định `isCapacityAvailable` (nếu đơn $\ge$ capacity $\implies$ trả về `false`).
  - Controller `LocationController` (`backend/src/modules/inventory/presentation/controllers/location.controller.ts`):
    - `GET /api/v1/locations`
    - `GET /api/v1/locations/:id/capacity`
    - Gắn `@Public()`, Swagger annotations đầy đủ.
  - Đăng ký `LocationController` và `LocationService` vào `InventoryModule`.
- **Kiểm thử:**
  - `location.service.spec.ts`: 8/8 tests PASS (AC2: đơn >= capacity chặn nhận đơn `isCapacityAvailable: false`; đơn < capacity mở nhận đơn; đánh giá giờ mở cửa VN; cache hit/miss).
  - `location.controller.spec.ts`: 2/2 tests PASS (routing và tham số).
  - Toàn bộ suite EPIC 01 (6 suites): **41/41 tests PASS** (53.9s).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 01

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP01-T01** | Khởi Tạo Schema Locations & Inventory Balances | `DONE` | 6/6 PASS (`inventory-balance.migration.spec.ts`) |
| **EP01-T02** | Thiết Lập Nền Tảng Transactional Outbox & Event Contract | `DONE` | 5/5 PASS (`outbox-writer.spec.ts`) |
| **EP01-T03** | Xây Dựng Inventory Balance Domain Service & ATP Calculator | `DONE` | 20/20 PASS (`atp-calculator.spec.ts` & `inventory-balance.service.spec.ts`) |
| **EP01-T04** | API Quản Lý Địa Điểm & Kiểm Tra Năng Lực Hoàn Tất | `DONE` | 10/10 PASS (`location.service.spec.ts` & `location.controller.spec.ts`) |

---

## Nghiệm Thu Hoàn Thành Epic (Epic Completion Review Sign-Off)

### [2026-11-15] EPIC 01: Location & Inventory Foundation — SIGN-OFF [PASS]
- **Tài liệu nghiệm thu:** `docs/2-design/EPIC-COMPLETION-REVIEW-EPIC-01.md`
- **Kết quả Audit:**
  - Tasks: 4/4 Tasks hoàn thành 100% Acceptance Criteria (`EP01-T01` -> `EP01-T04`).
  - Toàn bộ 7 Test Suites (47 tests): **47/47 tests PASS** (21.57s):
    - `inventory-balance.migration.spec.ts`: 6/6 PASS
    - `outbox-writer.spec.ts`: 5/5 PASS
    - `atp-calculator.spec.ts`: 11/11 PASS
    - `inventory-balance.service.spec.ts`: 9/9 PASS
    - `location.service.spec.ts`: 8/8 PASS
    - `location.controller.spec.ts`: 2/2 PASS
    - `epic-01-integrated-flow.spec.ts`: 6/6 PASS (E2E Flow)
  - Compilation: `npm run build` (`nest build`) đạt **Exit Code 0** sạch 100%.
  - Quét mã nguồn: 0 `TODO`, 0 `FIXME`, 0 `HACK`, 0 `XXX`.
  - Defects: **0 Critical, 0 High, 0 Medium, 0 Low**.
- **Kết luận:** **PASS**. Toàn bộ Epic 01 đã sẵn sàng làm bệ phóng cho **EPIC 02: FEFO & Reservation Engine**.
- **Kế hoạch tiếp theo:** Chuẩn bị triển khai task `EP02-T01: Nâng Cấp Schema Lô Hàng Hạn Dùng & Cấu Hình Hạn Lưu Thông Tối Thiểu`.

---

### [2026-11-16] EP04-T01: Quản Lý Danh Sách Nhặt Hàng & Quét Barcode Xác Thực (Picking Workflow)
- **Epic:** EPIC 04 – Fulfillment & WMS Operations
- **Trạng thái:** `DONE`
- **Dependencies:** EP03-T03 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Prisma Schema & Migrations:
    - Bổ sung `picked_at` vào bảng `fulfillment_orders`.
    - Tạo các bảng `packages`, `package_items`, `shipment_packages` với check constraints trọng lượng và kích thước dương.
    - Bổ sung liên kết `fulfillment_order_id` trên `shipments`.
    - Migration `20261116150000_add_packages_and_shipment_links` áp dụng thành công trên Neon PostgreSQL.
  - DTOs (`backend/src/modules/fulfillment/presentation/dtos/picking.dto.ts`):
    - `StartPickingDto`, `PickedItemDto`, `CompletePickingDto`, `PickListItemDto`, `PickListResponseDto`.
  - Service `PickingService` (`backend/src/modules/fulfillment/application/services/picking.service.ts`):
    - `getPickList(fulfillmentOrderId)`: Truy vấn danh sách cần nhặt kèm mã lô FEFO chỉ định từ `inventory_reservation_items`.
    - `startPicking(fulfillmentOrderId, pickerId)`: Chuyển trạng thái `ALLOCATED` -> `PICKING`, gán `assignedPickerId`, hỗ trợ idempotent.
    - `completePicking(fulfillmentOrderId, dto, pickerId)`:
      - Đối chiếu 100% mã lô và số lượng thực tế với FEFO reservation.
      - AC1: Quét sai mã lô (Batch Code) ném `BadRequestException('BATCH_MISMATCH: ...')`.
      - AC2: Quét đủ số lượng và đúng lô -> cập nhật FO sang `PICKED`, lưu `pickedAt`, cập nhật `quantityFulfilled` trên `fulfillment_order_items`.
  - Controller `AdminFulfillmentController` (`backend/src/modules/fulfillment/presentation/controllers/admin-fulfillment.controller.ts`):
    - `GET /api/v1/admin/fulfillment-orders/:id/pick-list`
    - `POST /api/v1/admin/fulfillment-orders/:id/start-picking`
    - `POST /api/v1/admin/fulfillment-orders/:id/complete-picking`
  - Đóng gói `FulfillmentModule` và đăng ký vào `AppModule`.
- **Kiểm thử:** `picking.service.spec.ts` (10/10 tests PASS bao phủ pick list, start picking, batch mismatch, quantity mismatch, complete picking, và idempotency).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP04-T02: Quy Trình Đóng Gói, Cân Đo Kiện Thực Tế (Packing & Packages)
- **Epic:** EPIC 04 – Fulfillment & WMS Operations
- **Trạng thái:** `DONE`
- **Dependencies:** EP04-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - DTOs (`backend/src/modules/fulfillment/presentation/dtos/packing.dto.ts`):
    - `CreatePackageItemDto`, `CreatePackageDto`, `CompletePackingDto`, `PackageResponseDto`, `CompletePackingResponseDto`.
  - Service `PackingService` (`backend/src/modules/fulfillment/application/services/packing.service.ts`):
    - Kiểm tra trạng thái FO phải là `PICKED`.
    - Idempotency guard: Nếu đơn đã `PACKED`, trả về danh sách packages và shipment hiện tại.
    - AC1: Hỗ trợ đóng thành 1 hoặc nhiều packages (`dto.packages`).
    - AC2: Bắt buộc cân nặng và kích thước thực tế lớn hơn 0 (`actualWeightGrams > 0`, `lengthCm > 0`, `widthCm > 0`, `heightCm > 0`), từ chối số ước tính.
    - Kiểm tra độ bao phủ 100% sản phẩm đối chiếu với danh sách FO items (`ITEM_NOT_FOUND_IN_ORDER`, `QUANTITY_MISMATCH`).
    - Mở Transaction:
      - Tạo thực thể `Shipment` ở trạng thái `PENDING_CREATION`, mapping `carrierCode` chuẩn (`EXPRESS_2H` $\rightarrow$ `AHAMOVE`, `STANDARD` $\rightarrow$ `GHN`).
      - Tạo các thực thể `Package` và `PackageItem`.
      - Tạo liên kết `ShipmentPackage`.
      - Cập nhật `fulfillment_orders.status = 'PACKED'`, `packedAt = now()`.
      - Ghi nhận Transactional Outbox Event `SHIPMENT_DISPATCH_REQUESTED`.
  - Controller `AdminFulfillmentController`:
    - `POST /api/v1/admin/fulfillment-orders/:id/complete-packing`.
  - Cập nhật `FulfillmentModule` đăng ký `PackingService`.
- **Kiểm thử:** `packing.service.spec.ts` (11/11 tests PASS bao phủ validation, đơn kiện, đa kiện, Express 2H / Ahamove, GHN và idempotent).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP04-T03: Quy Trình Xác Nhận Bàn Giao Kiện Hàng Cho Tài Xế (Handover Workflow)
- **Epic:** EPIC 04 – Fulfillment & WMS Operations
- **Trạng thái:** `DONE`
- **Dependencies:** EP04-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - DTOs (`backend/src/modules/fulfillment/presentation/dtos/handover.dto.ts`):
    - `ConfirmHandoverDto`, `ConfirmHandoverResponseDto`.
  - Service `HandoverService` (`backend/src/modules/fulfillment/application/services/handover.service.ts`):
    - Kiểm tra trạng thái FO phải là `PACKED`.
    - Idempotency guard: Nếu đơn đã `HANDED_OVER`, trả về chi tiết bàn giao hiện tại.
    - AC1: Kiểm tra vận đơn `Shipment` liên kết; nếu chưa có `tracking_code` từ 3PL ném `BadRequestException('SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn từ đối tác vận chuyển!')`.
    - AC2: Bàn giao thành công:
      - Cập nhật `fulfillment_orders.status = 'HANDED_OVER'`, `handedOverAt = now()`.
      - Cập nhật `shipments.status = 'HANDED_OVER'`, `handedOverAt = now()`.
      - Tích hợp gọi `OrderStateAggregator.computeOrderStatus(fo.orderId, tx)` để cập nhật trạng thái đơn cha (ví dụ `SHIPPED` hoặc `PARTIALLY_SHIPPED`).
      - Ghi nhận Transactional Outbox Event `FO_HANDED_OVER`.
  - Controller `AdminFulfillmentController`:
    - `POST /api/v1/admin/fulfillment-orders/:id/confirm-handover`.
  - Cập nhật `FulfillmentModule` đăng ký `HandoverService`.
- **Kiểm thử:** `handover.service.spec.ts` (7/7 tests PASS bao phủ validation trạng thái, tracking code check, bàn giao thành công, gọi aggregator và idempotent).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 04

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP04-T01** | Quản Lý Danh Sách Nhặt Hàng & Quét Barcode Xác Thực (Picking Workflow) | `DONE` | 10/10 PASS (`picking.service.spec.ts`) |
| **EP04-T02** | Quy Trình Đóng Gói, Cân Đo Kiện Thực Tế (Packing & Packages) | `DONE` | 11/11 PASS (`packing.service.spec.ts`) |
| **EP04-T03** | Quy Trình Xác Nhận Bàn Giao Kiện Hàng Cho Tài Xế (Handover Workflow) | `DONE` | 7/7 PASS (`handover.service.spec.ts`) |




