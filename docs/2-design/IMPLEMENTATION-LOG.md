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

---

### [2026-11-16] EP05-T01: Thiết Kế Interface Giao Vận & Dữ Liệu Đa Hình (Shipping Provider Abstraction)
- **Epic:** EPIC 05 – Shipping Provider Abstraction
- **Trạng thái:** `DONE`
- **Dependencies:** EP04-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Định nghĩa Interface `IShippingProvider` (`backend/src/modules/shipping/domain/ports/shipping-provider.interface.ts`):
    - `calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto>`
    - `createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto>`
    - `cancelShipment(trackingCode: string): Promise<boolean>`
    - `parseWebhook(rawBody: any, headers: any): ParsedWebhookDto`
  - Chuẩn hóa DTOs theo chuẩn quốc tế (`grams`, `cm`, `VND`) tại `backend/src/modules/shipping/domain/dtos/shipping-provider.dto.ts`.
  - Mở rộng model `Shipment` trong `schema.prisma`:
    - `shipmentType String @default("OUTBOUND") @map("shipment_type") @db.VarChar(30)`
    - `returnOrderId String? @map("return_order_id") @db.Uuid`
    - `carrierReferenceId String? @map("carrier_reference_id") @db.VarChar(100)`
    - `trackingUrl String? @map("tracking_url") @db.Text`
    - `codStatus String? @default("COD_EXPECTED") @map("cod_status") @db.VarChar(30)`
    - `actualShippingFee Decimal? @default(0) @map("actual_shipping_fee") @db.Decimal(12, 2)`
    - Relation `returnOrder ReturnOrder? @relation(fields: [returnOrderId], references: [id], onDelete: SetNull)`
    - B-Tree Index `idx_shipments_return_order_id` và `idx_shipments_carrier_tracking` trên `(carrier_code, tracking_code)`.
  - Migration PostgreSQL: `20261116170000_add_polymorphic_shipment_fields` áp dụng thành công trên Neon PostgreSQL kèm Check Constraint `chk_shipment_type_ref` bảo đảm toàn vẹn đa hình.
- **Kiểm thử:** `shipping-abstraction.migration.spec.ts` (7/7 tests PASS bao phủ tạo đơn OUTBOUND, RETURN_PICKUP, INTER_STORE_TRANSFER, chặn vi phạm check constraint DB và DTO typing).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP05-T02: Xây Dựng Mock Shipping Provider & Simulation Test Harness
- **Epic:** EPIC 05 – Shipping Provider Abstraction
- **Trạng thái:** `DONE`
- **Dependencies:** EP05-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Service `MockShippingProvider` (`backend/src/modules/shipping/infrastructure/adapters/mock/mock-shipping.provider.ts`):
    - `calculateFee`: Trả về 25.000đ cố định và dự kiến giao sau 2 ngày.
    - `createShipment`: Sinh mã tracking ngẫu nhiên dạng `MOCK-TRK-XXXXX` và link in nhãn giả lập.
    - `cancelShipment`: Trả về `true`.
    - `parseWebhook`: Phân tích và chuẩn hóa payload webhook giả lập.
  - Controller `TestMockCarrierController` (`backend/src/modules/shipping/presentation/controllers/test-mock-carrier.controller.ts`):
    - `POST /api/v1/test/mock-carrier/trigger-status`: Cập nhật trạng thái Shipment, ghi nhận `ShipmentEvent`, ghi Transactional Outbox Event `SHIPMENT_STATUS_UPDATED`.
    - Bảo vệ môi trường dev/staging và cờ `SHIPPING_MOCK_ENABLED=true`.
  - Đóng gói `ShippingModule` (`backend/src/modules/shipping/shipping.module.ts`), đăng ký dynamic provider `SHIPPING_PROVIDER` và import vào `AppModule`.
- **Kiểm thử:** `mock-shipping.provider.spec.ts` (9/9 tests PASS bao phủ hợp đồng Mock, dynamic DI injection container, cập nhật DB, DELIVERED, DELIVERY_FAILED, và NotFoundException).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP05-T03: Xây Dựng Dịch Vụ Điều Phối Vận Đơn & Xử Lý Timeout (Shipment Orchestrator)
- **Epic:** EPIC 05 – Shipping Provider Abstraction
- **Trạng thái:** `DONE`
- **Dependencies:** EP05-T01 (`DONE`), EP05-T02 (`DONE`), EP04-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Service `ShipmentOrchestratorService` (`backend/src/modules/shipping/application/services/shipment-orchestrator.service.ts`):
    - `dispatchShipment(shipmentId, options?)`:
      - Idempotency guard: Nếu đơn đã `CREATED` hoặc có `trackingCode` $\implies$ trả về kết quả hiện tại.
      - AC2: Chặn tạo lại khi `status = 'CREATION_UNKNOWN'` ném `BadRequestException` yêu cầu đối soát.
      - Chặn dispatch nếu status khác `PENDING_CREATION`.
      - Tổng hợp địa chỉ gửi (Store), địa chỉ nhận (Order shippingAddress), kích thước và cân nặng thực tế từ các `Package`.
      - Gọi 3PL Provider với timeout protection (15s mặc định theo DES-06/DES-07).
      - Thành công: Cập nhật `trackingCode`, `carrierReferenceId`, `shippingLabelUrl`, `status = 'CREATED'`, ghi Outbox Event `SHIPMENT_CREATED`.
      - AC1: Timeout hoặc lỗi mạng 5xx không làm crash luồng: Cập nhật `status = 'CREATION_UNKNOWN'`, ghi Outbox Event `SHIPMENT_CREATION_UNKNOWN`.
    - `reconcileCreationUnknown(shipmentId, dto?)`:
      - Nếu hãng xác nhận có đơn (`carrierFound: true`) $\implies$ chuyển sang `CREATED`, ghi Outbox Event `SHIPMENT_RECONCILED_CREATED`.
      - Nếu hãng xác nhận chưa có đơn (`carrierFound: false`) $\implies$ reset về `PENDING_CREATION` cho phép retry, ghi Outbox Event `SHIPMENT_RESET_TO_PENDING`.
  - Controller `AdminShippingController` (`backend/src/modules/shipping/presentation/controllers/admin-shipping.controller.ts`):
    - `POST /api/v1/admin/shipments/:id/dispatch`
    - `POST /api/v1/admin/shipments/:id/reconcile`
  - Đăng ký `ShipmentOrchestratorService` và `AdminShippingController` vào `ShippingModule`.
- **Kiểm thử:**
  - `shipment-orchestrator.service.spec.ts`: 7/7 tests PASS bao phủ happy path, idempotency, timeout handling AC1, block retries AC2, reconciliation confirmed và reset to pending.
  - `epic-05-integrated-flow.spec.ts`: 1/1 test PASS (vòng đời hoàn chỉnh từ WMS Packing $\rightarrow$ 3PL Dispatch $\rightarrow$ Handover $\rightarrow$ Carrier In-Transit & Delivered).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 05

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP05-T01** | Thiết Kế Interface Giao Vận & Dữ Liệu Đa Hình (Shipping Provider Abstraction) | `DONE` | 7/7 PASS (`shipping-abstraction.migration.spec.ts`) |
| **EP05-T02** | Xây Dựng Mock Shipping Provider & Simulation Test Harness | `DONE` | 9/9 PASS (`mock-shipping.provider.spec.ts`) |
| **EP05-T03** | Xây Dựng Dịch Vụ Điều Phối Vận Đơn & Xử Lý Timeout (Shipment Orchestrator) | `DONE` | 8/8 PASS (`shipment-orchestrator.service.spec.ts` & `epic-05-integrated-flow.spec.ts`) |






---

### [2026-11-16] EP06-T01: Hiện Thực Hóa GHN Client & Báo Giá Cước API v2
- **Epic:** EPIC 06 – GHN Standard Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP05-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Lớp `GHNClient` (`backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-client.ts`):
    - Đóng gói HTTP Client với Base URL `https://online-gateway.ghn.vn/shiip/public-api/v2` (hỗ trợ ghi đè qua `GHN_API_URL`).
    - Gửi request headers bắt buộc: `Token` và `ShopId`.
    - `calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto>`: Gọi `POST /shipping-order/fee` với `service_type_id: 2`, kích thước, trọng lượng và mã địa giới hành chính.
    - AC1: Gửi đúng địa chỉ nhận hàng tại Đà Nẵng, GHN trả về cước phí chuẩn xác.
    - AC2: Cơ chế Timeout 5s (`AbortSignal.timeout(5000)`) và xử lý mạng gián đoạn: Fallback về cước tĩnh dự phòng (22.000đ nội tỉnh, 35.000đ liên tỉnh).
    - Tích hợp bộ đệm địa giới hành chính (Tỉnh/Huyện/Xã) kết nối `UpstashRedisService` với TTL 24 giờ (`ghn:address:provinces`, `ghn:address:districts:${provinceId}`, `ghn:address:wards:${districtId}`).
- **Kiểm thử:** `ghn-client.spec.ts` (9/9 tests PASS bao phủ fee calculation chuẩn, same-province delivery, fallback 35k khi timeout, fallback 22k khi HTTP 503, và Redis cache master data).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP06-T02: Tạo Vận Đơn GHN & Lấy Token In Nhãn Khổ A6
- **Epic:** EPIC 06 – GHN Standard Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP06-T01 (`DONE`), EP04-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Lớp `GHNProvider` (`backend/src/modules/shipping/infrastructure/adapters/ghn/ghn.provider.ts`) implements `IShippingProvider`:
    - `readonly carrierCode = 'GHN'`.
    - `createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto>`:
      - Đóng gói payload chuẩn theo DES-05: `payment_type_id: 1` (`[FACT]` Shop trả cước), `required_note: 'KHONGCHOXEMHANG'` (`[GLOWUP POLICY]` mỹ phẩm seal), `client_order_code = req.shipmentCode` (khóa chống tạo trùng đơn), kích thước và cân nặng thực tế từ Package, danh sách sản phẩm.
      - Gọi `POST /shipping-order/create` tạo vận đơn sang GHN.
      - AC1: GHN trả về mã bưu kiện hợp lệ (dạng `LADXXXXX`).
      - AC2: Gọi `POST /a5/gen-token` lấy token in nhãn A6 nhiệt, sinh URL `https://online-gateway.ghn.vn/a5/public-api/printA5?token=${labelToken}` lưu vào `shipping_label_url`.
    - `cancelShipment(trackingCode: string): Promise<boolean>`: Gọi `POST /switch-status/cancel`.
    - `parseWebhook(rawBody, headers): ParsedWebhookDto`: Chuẩn hóa webhook từ GHN, tính SHA-256 fingerprint eventId nếu thiếu ID.
  - Cập nhật `ShippingModule` (`backend/src/modules/shipping/shipping.module.ts`):
    - Đăng ký `GHNClient`, `GHNProvider`.
    - Cung cấp token `SHIPPING_PROVIDERS` map đa đối tác (`GHN`, `MOCK`).
    - Hỗ trợ flag `SHIPPING_MOCK_ENABLED` điều phối thông minh giữa Mock và GHN.
  - Cập nhật `ShipmentOrchestratorService`: Tự động nhận diện `carrierCode` của shipment để lấy đúng provider tương ứng.
- **Kiểm thử:** `ghn-provider.spec.ts` (5/5 tests PASS bao phủ tạo vận đơn thành công, sinh mã LADXXXXX, tem nhãn A6, hủy đơn và parse webhook).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP06-T03: Xây Dựng GHN Status Mapper & Xử Lý Mã Trạng Thái Bất Thường
- **Epic:** EPIC 06 – GHN Standard Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP06-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - File `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-status.mapper.ts`:
    - Hàm thuần khiết `mapGHNStatus(ghnStatus: string | null | undefined): string`.
    - AC1: Ánh xạ 100% mã trạng thái tài liệu GHN v2:
      - `ready_to_pick` $\rightarrow$ `CREATED`
      - `picking` $\rightarrow$ `DRIVER_ASSIGNED`
      - `picked`, `storing`, `sorting`, `transporting` $\rightarrow$ `IN_TRANSIT`
      - `delivering`, `money_collect_delivering` $\rightarrow$ `OUT_FOR_DELIVERY`
      - `delivered` $\rightarrow$ `DELIVERED`
      - `delivery_fail` $\rightarrow$ `DELIVERY_FAILED`
      - `waiting_to_return`, `return`, `return_transporting`, `return_sorting`, `returning` $\rightarrow$ `RETURNING`
      - `returned` $\rightarrow$ `RETURNED`
      - `cancel` $\rightarrow$ `CANCELLED`
    - AC2 `[CRITICAL CORRECTION]`: Bất kỳ mã lạ nào không nằm trong danh mục (ví dụ `unknown_code_xyz`, `hub_fire_evacuated`, null, empty) $\implies$ Trả về `'EXCEPTION'` (TUYỆT ĐỐI KHÔNG tự động gán `'IN_TRANSIT'`) và ghi `logger.error` cảnh báo hệ thống.
- **Kiểm thử:**
  - `ghn-status.mapper.spec.ts`: 21/21 tests PASS bao phủ 17 mã chuẩn, case-insensitivity, khoảng trắng, và mã lạ ra `'EXCEPTION'` + Logger error.
  - `epic-06-integrated-flow.spec.ts`: 3/3 tests PASS (End-to-End flow: Báo giá $\rightarrow$ Fallback timeout $\rightarrow$ Dispatch GHN sinh LADXXXXX + tem nhãn nhiệt A6 $\rightarrow$ Nhận webhook và xử lý trạng thái bất thường).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 06

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP06-T01** | Hiện Thực Hóa GHN Client & Báo Giá Cước API v2 | `DONE` | 9/9 PASS (`ghn-client.spec.ts`) |
| **EP06-T02** | Tạo Vận Đơn GHN & Lấy Token In Nhãn Khổ A6 | `DONE` | 5/5 PASS (`ghn-provider.spec.ts`) |
| **EP06-T03** | Xây Dựng GHN Status Mapper & Xử Lý Mã Trạng Thái Bất Thường | `DONE` | 24/24 PASS (`ghn-status.mapper.spec.ts` & `epic-06-integrated-flow.spec.ts`) |

---

### [2026-11-16] EP07-T01: Hiện Thực Hóa Ahamove Client & Báo Phí Hỏa Tốc
- **Epic:** EPIC 07 – Ahamove Express 2H Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP05-T01 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Lớp `AhamoveClient` (`backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-client.ts`):
    - Đóng gói HTTP Client với Base URL `https://partner-api.ahamove.com` (cấu hình qua `AHAMOVE_API_URL` hoặc mặc định).
    - Xác thực qua API Key doanh nghiệp hoặc Bearer Token (`AHAMOVE_API_TOKEN` / `AHAMOVE_API_KEY`).
    - Phương thức `calculateFee(req: QuoteRequestDto): Promise<QuoteResponseDto>`:
      - Tự động nhận diện thành phố phục vụ dựa trên tên tỉnh/thành hoặc tọa độ: `SGN-BIKE` (Hồ Chí Minh) hoặc `HAN-BIKE` (Hà Nội). Ném `BadRequestException` nếu địa chỉ nằm ngoài vùng phục vụ.
      - Gọi `POST /v1/order/estimated_fee?token=${token}` với `order_time: 0` (giao ngay), danh sách điểm dừng `path: [sender, recipient]`.
      - **DEC-01 (Giới hạn bán kính hỏa tốc 2H):** Áp dụng công thức Haversine tính khoảng cách đại hình cầu kết hợp hệ số uốn lượn đô thị 1.3. Nếu khoảng cách $> 10\text{ km}$ $\implies$ Ném `BadRequestException('AHAMOVE_SERVICE_UNAVAILABLE: Khoảng cách vượt quá giới hạn bán kính 10km')`.
      - AC1: Báo giá hợp lệ trả về đúng cước phí VND và `estimatedDeliveryDays: 0` (giao tức thời trong 2 giờ).
      - AC2: Bán kính $> 10\text{ km}$ hoặc ngoài vùng phục vụ bị chặn ngay lập tức.
      - Cơ chế Timeout 5s (`AbortSignal.timeout(5000)`) và xử lý lỗi mạng.
- **Kiểm thử:** `ahamove-client.spec.ts` (8/8 tests PASS bao phủ fee calculation, SGN-BIKE, HAN-BIKE, validation tọa độ, chặn bán kính 10km, timeout 5s, và API error).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP07-T02: Tạo Booking Hỏa Tốc 2H & Lấy Link Bản Đồ Trực Tiếp (Live Map Link)
- **Epic:** EPIC 07 – Ahamove Express 2H Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP07-T01 (`DONE`), EP04-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - Lớp `AhamoveProvider` (`backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-provider.ts`) implements `IShippingProvider`:
    - `readonly carrierCode = 'AHAMOVE'`.
    - `createShipment(req: CreateShipmentDto): Promise<ShipmentResultDto>`:
      - Kiểm tra bán kính $\le 10\text{ km}$ (DEC-01).
      - Xây dựng điểm lấy hàng (Showroom gần nhất) và điểm giao hàng (Khách).
      - Gọi `POST /v1/order/create?token=${token}` với `payment_method: 'BALANCE'` (Shop trả cước qua tài khoản doanh nghiệp), `order_time: 0`, `remarks` kèm ghi chú đơn hàng.
      - Khóa chuyến xe chống tạo trùng bằng `tracking_number = req.shipmentCode`.
      - AC1: Ahamove trả về mã đơn hợp lệ (dạng `22VMV54W`).
      - AC2: Lấy đường dẫn Live Tracking Map trực tiếp từ response hoặc qua `GET /v3/orders/{id}/shared-link?token=${token}`, lưu vào `shipments.tracking_url` (`https://ahamove.com/share/...`).
      - Tạo Phiếu Giao Hàng nội bộ khổ A6 (Ahamove không hỗ trợ in tem nhiệt A6) có barcode đơn hàng.
    - `cancelShipment(trackingCode: string): Promise<boolean>`: Gọi `POST /v1/order/cancel`.
    - `parseWebhook(rawBody, headers): ParsedWebhookDto`: Chuẩn hóa webhook từ Ahamove (`order_id`, `status`, `dropoff_status`).
  - Cập nhật `ShippingModule` (`backend/src/modules/shipping/shipping.module.ts`):
    - Đăng ký `AhamoveClient`, `AhamoveProvider`.
    - Đưa `AHAMOVE` vào token đa đối tác `SHIPPING_PROVIDERS` map (`GHN`, `AHAMOVE`, `MOCK`).
  - Bổ sung `trackingUrl?: string | null` vào `DispatchShipmentResponseDto` và cập nhật `ShipmentOrchestratorService.dispatchShipment()`.
- **Kiểm thử:** `ahamove-provider.spec.ts` (4/4 tests PASS bao phủ booking thành công, sinh mã 22VMV, live map tracking url, hủy đơn và parse webhook).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

### [2026-11-16] EP07-T03: Xây Dựng Ahamove Status Mapper & Xử Lý Điều Phối Lại Khi Tài Xế Hủy
- **Epic:** EPIC 07 – Ahamove Express 2H Integration
- **Trạng thái:** `DONE`
- **Dependencies:** EP07-T02 (`DONE`).
- **Thay đổi kỹ thuật:**
  - File `backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-status.mapper.ts`:
    - Hàm thuần khiết `mapAhamoveStatus(orderStatus, dropoffStatus)`: Đối chiếu đồng thời trạng thái đơn hàng và trạng thái điểm trả hàng.
    - Mapping chuẩn:
      - `ASSIGNING` / `IDLE` $\rightarrow$ `CREATED`
      - `ACCEPTED` / `ALLOCATING` $\rightarrow$ `DRIVER_ASSIGNED`
      - `PICKED` / `BUYING` $\rightarrow$ `IN_TRANSIT`
      - `IN_PROCESS` + `DELIVERING` $\rightarrow$ `OUT_FOR_DELIVERY`
      - `COMPLETED` / `SUCCESS` $\rightarrow$ `DELIVERED`
      - `FAILED` / `REJECTED` / `CUSTOMER_REFUSED` $\rightarrow$ `DELIVERY_FAILED`
      - `RETURNING` $\rightarrow$ `RETURNING`
      - `RETURNED` $\rightarrow$ `RETURNED`
      - `CANCELLED` $\rightarrow$ `CANCELLED`
    - **[CRITICAL CORRECTION]**: Bất kỳ mã trạng thái lạ nào (ví dụ `vehicle_seized_by_traffic_police`, `driver_quits_job`, null, empty) $\implies$ Trả về `'EXCEPTION'` (TUYỆT ĐỐI KHÔNG tự động gán `'IN_TRANSIT'`) và ghi `logger.error` cảnh báo hệ thống.
  - Lớp `AhamoveRedispatchService` (`backend/src/modules/shipping/application/services/ahamove-redispatch.service.ts`):
    - `handleDriverCancellation(trackingCode: string, reason?: string)`:
      - Kiểm tra số lần tài xế đã hủy trong `carrierMetadata.driverCancellations`.
      - **Re-dispatch tự động $\le 2$ lần:** Gọi lại `AhamoveProvider.createShipment`, cập nhật `trackingCode` mới, lưu lịch sử hủy vào `carrierMetadata`, phát Outbox Event `AHAMOVE_DRIVER_REASSIGNED`.
      - **Quá 2 lần ($> 2$ lần):** Chuyển `Shipment.status = 'DISPATCH_FAILED'`, phát Outbox Event `AHAMOVE_MANUAL_INTERVENTION_REQUIRED` và ghi log cảnh báo ERROR cho điều phối viên can thiệp.
- **Kiểm thử:**
  - `ahamove-status.mapper.spec.ts`: 16/16 tests PASS.
  - `ahamove-redispatch.service.spec.ts`: 5/5 tests PASS (re-dispatch lần 1, lần 2, chuyển DISPATCH_FAILED ở lần 3 kèm Outbox event, validation tracking code).
  - `epic-07-integrated-flow.spec.ts`: 4/4 tests PASS (End-to-End flow: Báo giá cước $\rightarrow$ Chặn đơn $> 10\text{ km}$ $\rightarrow$ Dispatch Ahamove sinh 22VMV + Live Map Link $\rightarrow$ Webhook mapper mã lạ sang EXCEPTION $\rightarrow$ Re-dispatch tự động 2 lần rồi DISPATCH_FAILED).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100% sạch sẽ.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 07

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP07-T01** | Hiện Thực Hóa Ahamove Client & Báo Phí Hỏa Tốc | `DONE` | 8/8 PASS (`ahamove-client.spec.ts`) |
| **EP07-T02** | Tạo Booking Hỏa Tốc 2H & Lấy Link Bản Đồ Trực Tiếp | `DONE` | 4/4 PASS (`ahamove-provider.spec.ts`) |
| **EP07-T03** | Xây Dựng Ahamove Status Mapper & Xử Lý Điều Phối Lại Khi Tài Xế Hủy | `DONE` | 25/25 PASS (`ahamove-status.mapper.spec.ts`, `ahamove-redispatch.service.spec.ts`, `epic-07-integrated-flow.spec.ts`) |

---

## EPIC 08: Webhook Inbox & Tracking Orchestration

### [2026-11-16] EP08-T01: Xây Dựng Webhook Inbox Bền Vững & Chống Trùng Lặp (Inbox & Deduplication)
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - Prisma Schema & Database Migration:
    - Thêm model `ShippingWebhookInbox` (`shipping_webhook_inbox`) trong `backend/prisma/schema.prisma` với các cột: `id`, `carrier_code`, `event_id`, `event_type`, `tracking_code`, `payload` (JSONB), `processed_status` ('PENDING', 'PROCESSED', 'FAILED', 'IGNORED'), `error_message`, `received_at`, `processed_at`.
    - Ràng buộc cấp DB: `CONSTRAINT uq_webhook_carrier_event UNIQUE (carrier_code, event_id)`.
    - Chỉ mục: `idx_webhook_inbox_status_received` trên `(processed_status, received_at)`, `idx_webhook_inbox_tracking` trên `(tracking_code)`.
    - Migration: `20261116180000_add_shipping_webhook_inbox` áp dụng thành công trên Neon PostgreSQL.
  - Lớp `WebhookInboxService` (`backend/src/modules/async-infrastructure/webhooks/webhook-inbox.service.ts`):
    - `recordWebhook(carrierCode, payload, headers)`:
      - Tự động trích xuất `eventId` hoặc tính toán mã băm SHA256 Fingerprint xác định:
        $$\text{SHA256}(\text{carrierCode} + ':' + \text{trackingCode} + ':' + \text{status} + ':' + \text{occurredAt})$$
      - Xử lý xung đột duy nhất (P2002): Trả về `{ isDuplicate: true, status: 'ALREADY_PROCESSED', inbox: existingRecord }` an toàn, không ném exception làm crash ingress worker.
      - Trích xuất dữ liệu đa hình theo nhà vận chuyển (`GHN`: `OrderCode`, `Status`, `Time`; `AHAMOVE`: `_id`, `status`, `dropoff_status`, `timestamp`; Generic).
      - Các phương thức hỗ trợ vòng đời inbox: `markProcessed`, `markFailed`, `markIgnored`.
  - Controller `WebhookIngressController` (`backend/src/modules/async-infrastructure/webhooks/webhook-ingress.controller.ts`):
    - `POST /api/v1/internal/webhooks/consume` (Tiếp nhận từ Cloudflare Queue Consumer).
    - `POST /api/v1/webhooks/ghn` (Tiếp nhận trực tiếp từ GHN).
    - `POST /api/v1/webhooks/ahamove` (Tiếp nhận trực tiếp từ Ahamove).
    - `POST /api/v1/webhooks/shipping/:carrierCode` (Đa hình theo hãng).
  - Module `AsyncInfrastructureModule`: Đăng ký và export `WebhookInboxService` và `WebhookIngressController`.
- **Kiểm thử:**
  - `webhook-inbox.service.spec.ts`: 5/5 tests PASS (AC1: Deduplication 10 lần gửi cùng event; AC2: Fingerprint SHA256; Concurrency 20 requests đồng thời; Lifecycle states).
  - `webhook-ingress.controller.spec.ts`: 4/4 tests PASS (Consume, GHN, Ahamove, Generic carrier).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

### [2026-11-16] EP08-T02: Xây Dựng Pipeline Xử Lý Webhook & Chuyển Đổi Trạng Thái Đơn Hàng (State Transition Pipeline)
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - File `backend/src/modules/async-infrastructure/webhooks/webhook-processor.service.ts`:
    - Lớp `WebhookProcessorService`:
      - `processEvent(inboxId: string)`:
        - Tải bản ghi từ `shipping_webhook_inbox`.
        - Tìm kiếm `Shipment` tương ứng theo `trackingCode` / `carrierReferenceId` / `shipmentCode`.
        - Ánh xạ mã trạng thái đối tác sang `ShipmentStatus` qua các status mappers (`mapGHNStatus`, `mapAhamoveStatus`, mock).
        - **State Transition Guard (`isValidShipmentTransition`)**:
          - Chặn lùi trạng thái khi đã ở terminal states (`DELIVERED`, `RETURNED`, `CANCELLED`).
          - Chặn các sự kiện gửi trễ hoặc bị lộn xộn (ví dụ: `OUT_FOR_DELIVERY` không nhận lại `IN_TRANSIT`).
          - Hỗ trợ giao lại từ `DELIVERY_FAILED` sang `OUT_FOR_DELIVERY` / `IN_TRANSIT`, và chuyển hoàn sang `RETURNING`.
          - Đưa các mã lạ chưa nhận diện về `EXCEPTION`.
        - Mở PostgreSQL transaction (`prisma.$transaction`):
          - Cập nhật `Shipment.status`.
          - Khi `status = 'DELIVERED'`: Lưu `deliveredAt = NOW()`, cập nhật `codStatus = 'COD_COLLECTED'`.
          - Khi `status = 'DELIVERY_FAILED'`: Tăng `failedAttempts`.
          - Ghi nhận lịch sử `ShipmentEvent` (bảo vệ chống trùng lặp `[carrierCode, eventId]`).
          - Phát sự kiện Outbox `SHIPMENT_STATUS_UPDATED` qua `IOutboxWriter`.
          - Gọi `OrderStateAggregator.computeOrderStatus` để tự động tính toán lại trạng thái Order cha (`PARTIALLY_DELIVERED`, `DELIVERED`, `SHIPPED`, v.v.).
          - Đánh dấu bản ghi inbox `processedStatus = 'PROCESSED'`.
      - `processWebhook(carrierCode, payload, headers)`: Pipeline kết hợp nhận và xử lý đồng bộ.
  - Module `AsyncInfrastructureModule`: Đăng ký `WebhookProcessorService`, import `forwardRef(() => OmsModule)`.
- **Kiểm thử:**
  - `webhook-processor.service.spec.ts`: 12/12 tests PASS bao phủ toàn diện:
    - Pure function `isValidShipmentTransition`: 6 test cases (Chặn lùi DELIVERED, Chặn lùi RETURNED/CANCELLED, Chặn OUT_FOR_DELIVERY -> IN_TRANSIT, Cho phép tiến độ thuận, Cho phép DELIVERY_FAILED -> re-attempt / RETURNING, Cho phép EXCEPTION).
    - AC1: Nhận webhook `delivered` -> Cập nhật DELIVERED, deliveredAt, codStatus=COD_COLLECTED, gọi OrderStateAggregator (PASS).
    - AC2: Chống lùi trạng thái khi nhận webhook sai thứ tự -> Đánh dấu IGNORED, giữ nguyên DELIVERED (PASS).
    - Tích hợp Ahamove: IN_PROCESS + DELIVERING -> OUT_FOR_DELIVERY, mã lạ -> EXCEPTION (PASS).
    - Idempotency & Error handling: Shipment không tồn tại -> FAILED, đã PROCESSED -> ALREADY_PROCESSED (PASS).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 08

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP08-T01** | Xây Dựng Webhook Inbox Bền Vững & Chống Trùng Lặp | `DONE` | 9/9 PASS (`webhook-inbox.service.spec.ts`, `webhook-ingress.controller.spec.ts`) |
| **EP08-T02** | Xây Dựng Pipeline Xử Lý Webhook & Chuyển Đổi Trạng Thái Đơn Hàng | `DONE` | 12/12 PASS (`webhook-processor.service.spec.ts`) |
### [2026-11-16] EP08-T03: Xử Lý Giao Thất Bại & Luồng Chuyển Hoàn Tự Động (Delivery Attempts & RTO)
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - Prisma Schema & Database Migration:
    - Thêm model `ShipmentAttempt` (`shipment_attempts`) trong `backend/prisma/schema.prisma` với các cột: `id`, `shipment_id`, `attempt_number`, `attempted_at`, `failure_reason_code`, `failure_reason_detail`, `carrier_raw_status`, `created_at`.
    - Ràng buộc DB: `CONSTRAINT uq_shipment_attempt UNIQUE (shipment_id, attempt_number)`, `FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE`.
    - Quan hệ `attempts ShipmentAttempt[]` trên model `Shipment`.
    - Migration: `20261116190000_add_shipment_attempts` áp dụng thành công trên Neon PostgreSQL.
  - Lớp `ShipmentAttemptService` (`backend/src/modules/shipping/application/services/shipment-attempt.service.ts`):
    - `recordFailedAttempt(shipmentId, dto)`:
      - Tạo bản ghi `ShipmentAttempt` theo `attemptNumber = failedAttempts + 1`.
      - Khi `failedAttempts < 3`: Chuyển `Shipment.status = 'DELIVERY_FAILED'`, phát Outbox Event `DELIVERY_ATTEMPT_FAILED`. Đơn hàng cha KHÔNG bị hủy (AC1).
      - Khi `failedAttempts >= 3`: Tự động chuyển `Shipment.status = 'RETURNING'` và phát Outbox Event `SHIPMENT_RETURNING_TRIGGERED`.
      - Đồng bộ trạng thái đơn hàng cha qua `OrderStateAggregator`.
    - `getAttempts(shipmentId)`: Lấy lịch sử lần thử theo thứ tự tăng dần.
  - Lớp `ReturnToOriginService` (`backend/src/modules/shipping/application/services/return-to-origin.service.ts`):
    - `receiveRtoShipment(shipmentId, dto)`:
      - Kiểm tra trạng thái Shipment hợp lệ cho tiếp nhận chuyển hoàn.
      - **Kiểm tra bao bì (AC2):**
        - Nếu `packageCondition === 'INTACT'` (Nguyên vẹn / nguyên seal):
          - Hoàn nhập chính xác số lượng từng món vào đúng `InventoryLot` ban đầu qua `InventoryReservationItem`.
          - Tăng `quantity` trên bảng `Inventory` (Sellable Stock).
        - Nếu `packageCondition === 'DAMAGED'` (Hư hỏng, bể vỡ):
          - Chuyển vào diện cách ly: Tăng `quantity` và `quarantinedQuantity` trên `Inventory` (Available Quantity không đổi).
          - Tuyệt đối không hoàn nhập vào `InventoryLot` để chặn xuất bán.
      - Cập nhật `Shipment.status = 'RETURNED'`, lưu metadata RTO, cập nhật `FulfillmentOrder.status = 'RETURNED'`.
      - Phát Outbox Event `SHIPMENT_RETURNED_TO_ORIGIN`.
      - Gọi `OrderStateAggregator` đồng bộ Order cha.
  - Controller `AdminShippingController`:
    - `POST /api/v1/admin/shipments/:id/attempts/failed`
    - `GET /api/v1/admin/shipments/:id/attempts`
    - `POST /api/v1/admin/shipments/:id/receive-rto`
  - DTOs: `RecordFailedAttemptDto`, `ShipmentAttemptResponseDto`, `ReceiveRtoShipmentDto`, `ReceiveRtoResponseDto`.
- **Kiểm thử:**
  - `shipment-attempt.service.spec.ts`: 5/5 tests PASS (AC1: Lần 1 và 2 DELIVERY_FAILED không hủy đơn; Lần 3 RETURNING; Lịch sử attempts; NotFound exception).
  - `return-to-origin.service.spec.ts`: 4/4 tests PASS (AC2: Tiếp nhận INTACT khôi phục lô FEFO và Sellable Stock; Tiếp nhận DAMAGED đưa vào QUARANTINED; Validation trạng thái; NotFound exception).
  - `epic-08-integrated-flow.spec.ts`: 4/4 tests PASS (End-to-End trọn vẹn 4 giai đoạn EPIC 08: Ingress & Deduplication -> Pipeline & State Guard -> Attempts Tracking -> RTO Warehouse Flow).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 08

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP08-T01** | Xây Dựng Webhook Inbox Bền Vững & Chống Trùng Lặp | `DONE` | 9/9 PASS (`webhook-inbox.service.spec.ts`, `webhook-ingress.controller.spec.ts`) |
| **EP08-T02** | Xây Dựng Pipeline Xử Lý Webhook & Chuyển Đổi Trạng Thái Đơn Hàng | `DONE` | 12/12 PASS (`webhook-processor.service.spec.ts`) |
| **EP08-T03** | Xử Lý Giao Thất Bại & Luồng Chuyển Hoàn Tự Động | `DONE` | 13/13 PASS (`shipment-attempt.service.spec.ts`, `return-to-origin.service.spec.ts`, `epic-08-integrated-flow.spec.ts`) |

---

## EPIC 09: Event-Driven Async Infrastructure

### [2026-11-16] EP09-T01: Xây Dựng Outbox Relay Worker (PostgreSQL to Cloudflare Queue)
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - Client `CloudflareQueueClient` (`backend/src/modules/async-infrastructure/outbox/cloudflare-queue.client.ts`):
    - Interface `ICloudflareQueueClient` với các phương thức `sendMessage`, `sendBatch`.
    - Hỗ trợ Mock mode khi `CLOUDFLARE_QUEUE_MOCK_ENABLED=true` hoặc không cấu hình `CLOUDFLARE_QUEUE_PRODUCER_URL`.
    - Gửi HTTP POST sang Cloudflare Worker Producer với Bearer token và timeout 5s.
    - Xử lý các mã lỗi: HTTP 429 (Rate limit), HTTP 5xx, và Network Timeout.
  - Scheduler `OutboxRelayScheduler` (`backend/src/modules/async-infrastructure/outbox/outbox-relay.scheduler.ts`):
    - Chạy định kỳ mỗi 3 giây qua NestJS `@Cron('*/3 * * * * *')`.
    - Mở transaction với truy vấn bảo vệ concurrency:
      ```sql
      SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count
      FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED;
      ```
    - Khi gửi thành công: Cập nhật `status = 'PUBLISHED'`, `published_at = NOW()`, `last_error = NULL`.
    - Khi gửi thất bại: Tăng `retry_count`, lưu `last_error`. Nếu gặp lỗi 429 hoặc 5xx/mạng $\implies$ Tự động kích hoạt cơ chế tạm dừng `triggerBackoff(10000)` (10 giây).
  - Module `AsyncInfrastructureModule`: Đăng ký và export `CloudflareQueueClient`, `CLOUDFLARE_QUEUE_CLIENT`, `OutboxRelayScheduler`.
- **Kiểm thử:**
  - `outbox-relay.scheduler.spec.ts`: 8/8 tests PASS (AC1: Concurrency 2 workers quét 100 events không trùng lặp; AC2: Lỗi mạng giữ nguyên PENDING và tăng retry_count; Xử lý 429 backoff; Mock mode và live fetch).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

### [2026-11-16] EP09-T02: Triển Khai Cloudflare Worker Webhook Ingress Tại Edge
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - Khởi tạo thư mục `cloudflare-workers/` tại root dự án với cấu hình Cloudflare Worker chuẩn ESM:
    - `cloudflare-workers/package.json`: Cấu hình dependencies `@cloudflare/workers-types`, `wrangler`.
    - `cloudflare-workers/tsconfig.json`: Cấu hình TypeScript target ES2022.
    - `cloudflare-workers/wrangler.toml`: Cấu hình name `glowup-logistics-ingress`, queue producer binding `LOGISTICS_WEBHOOK_QUEUE`, và queue consumer binding kèm DLQ `glowup-logistics-webhooks-dlq`.
  - Type definitions `cloudflare-workers/src/types.ts`: Giao diện `Queue`, `Message`, `MessageBatch`, `Env`, `LogisticsWebhookMessage`.
  - Edge Worker Handler `cloudflare-workers/src/index.ts`:
    - Endpoint `GET /health`: Trả 200 OK.
    - Endpoint `POST /webhooks/ghn`: Xác thực secret token từ header/query đối chiếu `GHN_WEBHOOK_SECRET`. Nếu sai $\implies$ Trả HTTP 401 (AC2). Nếu đúng $\implies$ Đẩy vào Queue qua `LOGISTICS_WEBHOOK_QUEUE.send(...)` và **chỉ trả 200 OK khi đã Enqueue thành công** (AC3). Nếu Queue lỗi $\implies$ Trả HTTP 500 để GHN tự động retry.
    - Endpoint `POST /webhooks/ahamove`: Xác thực `AHAMOVE_WEBHOOK_SECRET`, enqueue và trả 200 OK.
    - Endpoint `POST /produce`: Nhận publish sự kiện nội bộ.
- **Kiểm thử:**
  - `cloudflare-worker-ingress-consumer.spec.ts`: 5/5 tests Ingress PASS (Health check, AC2: Sai token trả 401, AC3: Đúng token enqueue và trả 200 OK, Ahamove token, Queue failure trả 500).
- **Biên dịch:** Toàn bộ file TypeScript hợp chuẩn.

---

### [2026-11-16] EP09-T03: Triển Khai Cloudflare Queue Consumer & Internal Command Dispatcher
- **Trạng thái:** `DONE` (Hoàn thành triển khai & kiểm thử tự động đạt chuẩn).
- **Phạm vi thay đổi:**
  - Queue Consumer Handler `cloudflare-workers/src/consumer.ts`:
    - `handleQueueBatch(batch, env)`: Kéo message theo lô (`max_batch_size = 10`), gọi HTTP POST về NestJS internal endpoint `${NESTJS_INTERNAL_URL}/api/v1/internal/webhooks/consume` với header `X-Internal-Token`.
    - Khi NestJS trả HTTP 2xx $\implies$ Gọi `msg.ack()` để xóa khỏi Queue (AC1).
    - Khi NestJS trả HTTP 5xx hoặc gặp sự cố mạng $\implies$ Gọi `msg.retry()` để Queue đẩy lại sau (AC2). Sau 3 lần thất bại tự động đưa vào Dead Letter Queue.
    - Khi NestJS trả HTTP 4xx $\implies$ Gọi `msg.ack()` để tránh retry lặp vô hạn.
  - NestJS Guard & Controller:
    - Guard `InternalTokenGuard` (`backend/src/modules/async-infrastructure/webhooks/internal-token.guard.ts`): Xác thực `X-Internal-Token` / `Bearer token` chống truy cập trái phép.
    - Controller `InternalWebhookController` (`backend/src/modules/async-infrastructure/webhooks/internal-webhook.controller.ts`): Nhận request từ consumer, ủy quyền cho `WebhookProcessorService` để chuyển đổi trạng thái đơn hàng và lưu inbox.
- **Kiểm thử:**
  - `internal-webhook.controller.spec.ts`: 6/6 tests PASS (InternalTokenGuard: missing/invalid/valid tokens; consumeWebhook & dispatchFromQueue endpoints).
  - `cloudflare-worker-ingress-consumer.spec.ts`: 3/3 tests Consumer PASS (AC1: Batch 10 acks; AC2: 5xx retry; 4xx ack).
  - `epic-09-integrated-flow.spec.ts`: 1/1 test PASS (Khép kín toàn bộ 3 giai đoạn: Ingress Edge $\rightarrow$ Queue $\rightarrow$ Consumer $\rightarrow$ NestJS Dispatcher $\rightarrow$ Outbox Relay).
- **Biên dịch:** `npm run build` (`nest build`) thành công 100%.

---

## Bảng Theo Dõi Trạng Thái Tasks EPIC 09

| Task ID | Tên Nhiệm Vụ | Trạng Thái | Test Coverage / Evidence |
| :--- | :--- | :--- | :--- |
| **EP09-T01** | Xây Dựng Outbox Relay Worker (PostgreSQL to Cloudflare Queue) | `DONE` | 8/8 PASS (`outbox-relay.scheduler.spec.ts`) |
| **EP09-T02** | Triển Khai Cloudflare Worker Webhook Ingress Tại Edge | `DONE` | 5/5 PASS (`cloudflare-worker-ingress-consumer.spec.ts`) |
| **EP09-T03** | Triển Khai Cloudflare Queue Consumer & Internal Command Dispatcher | `DONE` | 10/10 PASS (`internal-webhook.controller.spec.ts`, `cloudflare-worker-ingress-consumer.spec.ts`, `epic-09-integrated-flow.spec.ts`) |



