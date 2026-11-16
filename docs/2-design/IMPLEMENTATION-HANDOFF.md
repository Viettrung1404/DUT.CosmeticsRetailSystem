# IMPLEMENTATION HANDOFF: FULFILLMENT, LOGISTICS & RMA
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Phiên bản Handoff:** 1.12.0-ENTERPRISE  
**Thời điểm lập:** 2026-11-16T18:00:00+07:00  
**Tác giả:** Senior Backend Architect / Technical Lead  
**Trạng thái Epic:** 
- EPIC 01: Location & Inventory Foundation (100% DONE - 4/4 Tasks)
- EPIC 02: FEFO & Reservation Engine (100% DONE - 4/4 Tasks)
- EPIC 03: OMS & Hybrid Routing Engine (100% DONE - 4/4 Tasks: `EP03-T01` $\rightarrow$ `EP03-T04`)
- EPIC 04: Fulfillment & WMS Operations (100% DONE - 3/3 Tasks: `EP04-T01`, `EP04-T02`, `EP04-T03`)
- EPIC 05: Shipping Provider Abstraction (100% DONE - 3/3 Tasks: `EP05-T01`, `EP05-T02`, `EP05-T03`)
- EPIC 06: GHN Standard Integration (100% DONE - 3/3 Tasks: `EP06-T01`, `EP06-T02`, `EP06-T03`)
- EPIC 07: Ahamove Express 2H Integration (100% DONE - 3/3 Tasks: `EP07-T01`, `EP07-T02`, `EP07-T03`)
- EPIC 08: Webhook Inbox & Tracking Orchestration (100% DONE - 3/3 Tasks: `EP08-T01`, `EP08-T02`, `EP08-T03`)
- EPIC 09: Event-Driven Async Infrastructure (100% DONE - 3/3 Tasks: `EP09-T01`, `EP09-T02`, `EP09-T03`)
**Tiến độ tổng thể:** 30/37 Tasks DONE (81.1%). Sẵn sàng bàn giao và tiếp tục với **EPIC 10 – COD Reconciliation Engine**.


---

## A. Bối Cảnh Dự Án (Project Context)

GlowUp là chuỗi bán lẻ mỹ phẩm đa kênh (Omnichannel) sở hữu mạng lưới cửa hàng vật lý và kênh bán hàng trực tuyến (Web/Mobile App). Dự án đang bước vào giai đoạn triển khai cốt lõi phân hệ **Fulfillment, Logistics & RMA** cho đơn hàng Online và POS.

### 1. Đặc Thù Nghiệp Vụ Mỹ Phẩm
- **Hạn sử dụng & Lô hàng (Batches/Lots):** Phân bổ tồn kho bắt buộc tuân theo nguyên tắc **FEFO (First Expired, First Out)**. Mỹ phẩm cận date (dưới thời hạn lưu hành tối thiểu `MinRemainingShelfLifeDays`) không được phép xuất kho cho khách hàng Online.
- **Bảo quản & Phân loại tồn kho:** Số dư tồn kho phải phân đoạn chặt chẽ: Tồn vật lý (Physical On-Hand), Giữ chỗ (Reserved), Tồn an toàn (Safety Stock), Hàng cách ly kiểm định (Quarantined), Hàng lỗi/hỏng (Damaged).
- **Mạng lưới hoàn tất hỗn hợp (Hybrid Fulfillment):** Kết hợp Kho tổng trung tâm (Central DC) và Xuất hàng từ cửa hàng (Ship-from-Store).
- **Vận chuyển đa phương thức:**
  - Hỏa tốc 2H (Ahamove on-demand): Phân tuyến tới Showroom gần khách nhất trong bán kính tối đa 10 km đường bộ.
  - Tiêu chuẩn (GHN API v2): Ưu tiên xuất từ Kho tổng trung tâm; chỉ kích hoạt Tách đơn (Split Fulfillment) khi giá trị đơn $\ge 500.000$đ và thỏa mãn trần trợ giá vận chuyển.
- **RMA Đa kênh:** Đổi hàng, trả hàng, hoàn tiền, thu hồi tận nơi hoặc trả tại cửa hàng (Store Drop-off), phân định rõ ràng giữa "Đổi ý (7 ngày)" và "Khiếu nại kích ứng da".

---

## B. Kiến Trúc Kỹ Thuật Đã Thống Nhất (Architecture & Technical Decisions)

| Thành Phần | Công Nghệ Lựa Chọn | Trạng Thái / Quyết Định Kiến Trúc |
| :--- | :--- | :--- |
| **Backend Core** | **NestJS Modular Monolith** | Giữ mô hình Modular Monolith, chưa tách Microservices. Áp dụng Clean / Hexagonal Architecture trong từng module. Giao tiếp liên module qua Application Ports và Event Contracts. |
| **Database** | **PostgreSQL 16 (AWS Neon)** | Pooler connection qua AWS ap-southeast-1. Ràng buộc toàn vẹn logic ở cấp độ database engine (`CHECK constraints`). |
| **ORM** | **Prisma ORM v6.19** | Model mapping qua snake_case (`@map`). Sử dụng migrations tự động kết hợp SQL tùy biến cho Generated Stored columns và Check constraints. |
| **Cache Layer** | **Upstash Redis (`UpstashRedisService`)** | Tái sử dụng service REST-based sẵn có tại `@core/cache/upstash-redis.service.ts`. Dùng làm Cache-Aside cho ATP hot read, catalog và cache định tuyến. |
| **Async & Queues** | **Cloudflare Workers + Queues** | Cloudflare Worker nhận Webhook tại Edge $\rightarrow$ Đẩy vào Cloudflare Queue $\rightarrow$ Queue Consumer gọi NestJS Internal Command. |
| **Reliability** | **Transactional Outbox Pattern** | Mọi sự kiện miền phát sinh từ giao dịch (`ORDER_RESERVED`, `SHIPMENT_DISPATCHED`,...) phải được ghi vào bảng `outbox_events` trong cùng database transaction. Outbox Relay worker định kỳ quét với `FOR UPDATE SKIP LOCKED`. |
| **Tồn Kho & Khóa** | **Pessimistic Row Locking (`FOR UPDATE`)** | Khóa dòng tồn kho tại thời điểm giữ chỗ (Atomic Reservation), tuyệt đối không để xảy ra bán vượt tồn (Zero Overselling). |
| **Tái Sử Dụng Bảng** | **Mở rộng `Store` & `Inventory`** | **KHÔNG** tạo bảng mới `locations` hay `inventory_balances` rời rạc (tránh làm đứt gãy 15+ module hiện hữu). `Store` đại diện cho địa điểm vật lý; `Inventory` đại diện cho số dư tồn kho đa phân đoạn. |

---

## C. Quyết Định Nghiệp Vụ & Trạng Thái Phê Duyệt (Business Decisions)

Hệ thống đã chuẩn hóa và tích hợp 5 quyết định nghiệp vụ cốt lõi (DEC-01 $\rightarrow$ DEC-05):

| Mã Quyết Định | Nội Dung Quyết Định Nghiệp Vụ | Trạng Thái Phê Duyệt | Quy Định Kỹ Thuật Thực Thi |
| :--- | :--- | :--- | :--- |
| **DEC-01** | **Giao Hỏa Tốc 2H (Ahamove):** Giới hạn tối đa **10 km** tính theo quãng đường đường bộ thực tế. | `[APPROVED]` | Sử dụng Google Maps Distance Matrix hoặc OpenRouteService; nếu lỗi provider, tính Haversine $\times 1.3$ (hệ số uốn lượn đô thị). Quá 10 km $\implies$ vô hiệu hóa tùy chọn Express. |
| **DEC-02** | **Tách Đơn (Split Fulfillment):** Chỉ xem xét khi giá trị đơn hàng $\ge 500.000$đ (giá trị thực trả của hàng hóa, sau voucher, không gồm phí ship). | `[APPROVED]` | GlowUp trợ giá tối đa **35.000đ** cước phát sinh. Phần vượt trần phải xin xác nhận từ khách hoặc chuyển hướng gom hàng về Kho tổng trung tâm. |
| **DEC-03** | **Thời Hạn Đổi Ý (Change-of-Mind):** Khách có **7 ngày** gửi yêu cầu kể từ khi đơn chuyển trạng thái `DELIVERED`. | `[APPROVED]` | Tính theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7). Điều kiện tiên quyết: sản phẩm còn nguyên seal, chưa mở hộp. Hết 7 ngày cổng RMA đóng tự động cho lý do đổi ý. |
| **DEC-04** | **Phí Thu Hồi Trả Hàng:** Dao động **20.000đ – 30.000đ**, trừ trực tiếp vào khoản hoàn tiền nếu lỗi từ khách đổi ý. | `[APPROVED]` | Không hardcode cố định số tiền mà lấy theo bảng giá thực tế của đối tác 3PL (GHN Reverse) tại thời điểm duyệt yêu cầu. |
| **DEC-05** | **Khiếu Nại Kích Ứng Da:** Phân biệt rạch ròi với Đổi ý. Cho phép mở seal, hao hụt $\le 20\%$. | `[PENDING_LEGAL_REVIEW]` | Không bắt buộc nộp giấy khám da liễu đại trà nhưng phải tải ảnh chụp kích ứng thực tế và mô tả triệu chứng. Cần có bước kiểm duyệt thủ công (Escalation) của CSKH/Y tế. |

---

## D. Nguồn Tài Liệu Tham Chiếu Chuẩn (Source Documents)

Khi triển khai code, Coding Agent phải đối chiếu chặt chẽ với bộ ba tài liệu thiết kế:

1. **[docs/2-design/05_thiet_ke_fulfillment_logistics_rma.md](file:///d:/VS_Code/DUT/PBL6/docs/2-design/05_thiet_ke_fulfillment_logistics_rma.md) (Phiên bản v3.1-ENTERPRISE):**
   * Định nghĩa toàn diện về Domain Model, State Machines (Order độc lập Return, Shipment đa hình OUTBOUND/RETURN_PICKUP/INTER_STORE_TRANSFER, RMA đa luồng), quy trình 4 giai đoạn đối soát COD.
2. **[docs/2-design/DES-06-FULFILLMENT-IMPLEMENTATION-PLAN.md](file:///d:/VS_Code/DUT/PBL6/docs/2-design/DES-06-FULFILLMENT-IMPLEMENTATION-PLAN.md):**
   * Bản thiết kế kỹ thuật (Technical Blueprint) cho giai đoạn P0: Ranh giới Clean Architecture, cấu trúc DTO, API contracts, Outbox pattern, Retry logic cho 3PL timeout (`CREATION_UNKNOWN`).
3. **[docs/2-design/DES-07-FULFILLMENT-WORK-BREAKDOWN.md](file:///d:/VS_Code/DUT/PBL6/docs/2-design/DES-07-FULFILLMENT-WORK-BREAKDOWN.md):**
   * Bản phân rã công việc WBS gồm **12 Epics và 37 Tasks** theo nguyên lý Vertical Slice kèm ma trận phụ thuộc, Acceptance Criteria và Definition of Done (DoD).

---

## E. Tổng Quan 12 Epic & 37 Tasks

```
+--------+---------------------------------------+-------------+-------------+-------------+--------------------------------------------+
| MÃ     | TÊN EPIC                              | SỐ LƯỢNG    | ĐỘ PHỨC TẠP | TRẠNG THÁI  | PHẠM VI NGHIỆP VỤ & KỸ THUẬT CỐT LÕI       |
| EPIC   |                                       | TASKS       | TỔNG THỂ    | TIẾN ĐỘ     |                                            |
+--------+---------------------------------------+-------------+-------------+-------------+--------------------------------------------+
| EPIC 01| Location & Inventory Foundation       | 4 Tasks     | Medium      | [DONE]      | Schema Location, Balance, ATP, Outbox Base |
| EPIC 02| FEFO & Reservation Engine             | 4 Tasks     | Large       | [DONE]      | Lots FEFO, Row Lock, Multi-location Reserve|
| EPIC 03| OMS & Hybrid Routing Engine           | 4 Tasks     | Large       | [DONE]      | Road Distance, Split Fulfillment, Routing  |
| EPIC 04| Fulfillment & WMS Operations          | 3 Tasks     | Medium      | [DONE]      | Pick Lists, Packages, Actual Weight/Dim    |
| EPIC 05| Shipping Provider Abstraction         | 3 Tasks     | Medium      | [DONE]      | Interface 3PL, Polymorphic Shipment, Mock  |
| EPIC 06| GHN Standard Integration              | 3 Tasks     | Medium      | [DONE]      | GHN API v2, Fee Quote, A6 Label Token      |
| EPIC 07| Ahamove Express 2H Integration        | 3 Tasks     | Medium      | [DONE]      | Ahamove API v1/v3, Booking, Live Map Link  |
| EPIC 08| Webhook Inbox & Tracking Orchestration| 3 Tasks     | Large       | [DONE]      | Inbox Deduplication, Attempts, RTO Flow    |
| EPIC 09| Event-Driven Async Infrastructure     | 3 Tasks     | Large       | [DONE]      | Outbox Relay SKIP LOCKED, Cloudflare Queue |
| EPIC 10| COD Reconciliation Engine             | 2 Tasks     | Medium      | NOT_STARTED | 4-Stage COD Lifecycle, Discrepancy Matching|
| EPIC 11| Admin Operations Integration          | 3 Tasks     | Medium      | NOT_STARTED | LocationScopeGuard, Action Queue, OCC      |
| EPIC 12| Observability & Disaster Recovery     | 2 Tasks     | Small       | NOT_STARTED | Correlation Tracing, Dead-letter Replay    |
+--------+---------------------------------------+-------------+-------------+-------------+--------------------------------------------+
| TỔNG   | 12 Epics                              | 37 Tasks    | Enterprise  | 30/37 DONE  | Triển khai tuần tự theo Vertical Slice     |
+--------+---------------------------------------+-------------+-------------+-------------+--------------------------------------------+
```

---

## F. Tiến Độ Triển Khai Thực Tế (Task Progress)

> [!IMPORTANT]
> **Nguyên tắc xác thực tiến độ:** Chỉ nhiệm vụ nào có code thực tế, migration đã áp dụng trên DB và có test tự động kiểm chứng (PASS) mới được ghi nhận `DONE`.

| Mã Task | Tên Nhiệm Vụ | Trạng Thái | Bằng Chứng Kiểm Chứng (Verification Evidence) |
| :--- | :--- | :--- | :--- |
| **EP01-T01** | **Khởi Tạo Schema Locations & Inventory Balances** | `[DONE]` (CONFIRMED) | - Prisma schema mở rộng `Store` & `Inventory`.<br>- 2 Migrations đã chạy thành công trên PostgreSQL Neon.<br>- Seed script cập nhật 9 địa điểm (Kho Tân Bình, Kho Hà Nội, 3 Showroom HCM) và 200 bản ghi tồn kho mẫu.<br>- Test suite `inventory-balance.migration.spec.ts` đạt **6/6 PASS**.<br>- Ràng buộc `CHECK` chặn thành công vi phạm tồn kho âm và giữ chỗ vượt mức. |
| **EP01-T02** | **Thiết Lập Nền Tảng Transactional Outbox & Event Contract** | `[DONE]` (CONFIRMED) | - Prisma model `OutboxEvent` & migration `20261115161243_add_outbox_events_table` áp dụng thành công trên Neon.<br>- Tạo partial index `idx_outbox_events_pending` tối ưu cho worker polling.<br>- Module `AsyncInfrastructureModule` export `OutboxWriterService` & token `OUTBOX_WRITER`.<br>- Integration test `outbox-writer.spec.ts` đạt **5/5 PASS** (kiểm chứng ghi event, batch event, và rollback ACID 100%).<br>- Build NestJS (`nest build`) thành công 100%. |
| **EP01-T03** | **Xây Dựng Inventory Balance Domain Service & ATP Calculator** | `[DONE]` (CONFIRMED) | - Dịch vụ `AtpCalculatorService`: triển khai công thức ATP chuẩn xác, chặn số âm, đạt 11/11 tests PASS.<br>- Dịch vụ `InventoryBalanceService`: cung cấp `getBalance`, `getAtp`, `getBulkAtp`, `checkAvailability`, hỗ trợ TransactionClient `tx`, đạt 9/9 tests PASS.<br>- Đã export trong `InventoryModule`.<br>- Toàn bộ 20/20 unit tests PASS, regression tests PASS, build thành công. |
| **EP01-T04** | **API Quản Lý Địa Điểm & Kiểm Tra Năng Lực Hoàn Tất** | `[DONE]` (CONFIRMED) | - Dịch vụ `LocationService`: đánh giá giờ mở cửa Asia/Ho_Chi_Minh, kiểm tra capacity trong ngày, cache-aside Upstash Redis, đạt 8/8 tests PASS.<br>- Controller `LocationController`: cung cấp `GET /api/v1/locations` và `GET /api/v1/locations/:id/capacity`, đạt 2/2 tests PASS.<br>- Toàn bộ suite EPIC 01 đạt **41/41 tests PASS**, `nest build` thành công 100%. |
| **EP02-T01** | **Nâng Cấp Schema Lô Hàng Hạn Dùng & Cấu Hình Hạn Lưu Thông Tối Thiểu** | `[DONE]` (CONFIRMED) | - Model `InventoryLot` & trường `minShelfLifeDays` (180 ngày) trên `ProductVariant`.<br>- Migration `20261115165648_add_inventory_lots_and_min_shelf_life` áp dụng thành công trên Neon.<br>- Check constraints: `chk_lot_quantities`, không âm cho `quantity_on_hand`, `quantity_reserved`, `min_shelf_life_days`.<br>- B-Tree Index `idx_lots_fefo_search` trên `(location_id, product_variant_id, expiry_date ASC)`.<br>- Test suite `inventory-lot.migration.spec.ts` đạt **8/8 PASS**.<br>- Seed script khởi tạo 360 bản ghi `InventoryLot` mẫu. |
| **EP02-T02** | **Xây Dựng Dịch Vụ Phân Bổ Lô Hạn Gần Xuất Trước (FEFO Allocation Service)** | `[DONE]` (CONFIRMED) | - `FefoAllocationService.allocateAndLockLots(tx, locationId, items, options)` với Pessimistic Lock `FOR UPDATE`.<br>- Đọc `min_shelf_life_days` và chặn xuất hàng cận date (trừ cờ `isClearance = true`).<br>- Deadlock prevention: Sắp xếp items theo `variantId ASC`.<br>- Rollback an toàn khi `LOT_SHORTAGE`.<br>- Phương thức `releaseLockedLots` và `simulateAllocation` (read-only dry-run).<br>- Test suite `fefo-allocation.service.spec.ts` đạt **8/8 PASS** (5 kịch bản phân bổ). |
| **EP02-T03** | **Triển Khai Dịch Vụ Giữ Chỗ Tồn Kho Nguyên Tử (Atomic Inventory Reservation)** | `[DONE]` (CONFIRMED) | - Prisma Model `InventoryReservation` và `InventoryReservationItem`.<br>- PostgreSQL Migration `20261115172431_add_inventory_reservations` kèm Check `chk_reservation_status`, `chk_res_item_quantity_positive`, index `idx_res_cleanup`.<br>- `InventoryReservationService.createReservation(tx, request)`: Tích hợp khóa lô FEFO, tăng `reservedQuantity` trên balances, ghi ledger `RESERVATION_HOLD`, phát Outbox Event `INVENTORY_RESERVED`.<br>- Test suite `inventory-reservation.service.spec.ts` đạt **6/6 PASS** (Zero Overselling concurrency test). |
| **EP02-T04** | **Xây Dựng Tiến Trình Giải Phóng & Hết Hạn Giữ Chỗ (Reservation Expiration Engine)** | `[DONE]` (CONFIRMED) | - `InventoryReservationService.releaseReservation(tx, reservationId, options)` với khóa dòng `FOR UPDATE`, bảo vệ Idempotency, hoàn trả tồn kho trên lots & balances, ghi ledger `RESERVATION_RELEASE`, phát Outbox Event `RESERVATION_RELEASED`.<br>- Scheduler `ReservationCleanupScheduler` chạy nền quét bằng `SELECT ... FOR UPDATE SKIP LOCKED` tự động dọn dẹp các reservation quá hạn (`expires_at < NOW()`).<br>- Đăng ký vào `InventoryModule`.<br>- Test suite `reservation-expiration.spec.ts` đạt **4/4 PASS** (Active release, Idempotency, Scheduler sweep, Concurrency 2 workers). |
| **EP03-T01** | **Xây Dựng Dịch Vụ Tính Quãng Đường & Báo Giá Vận Chuyển** | `[DONE]` (CONFIRMED) | - `DistanceCalculatorService`: Haversine $\times 1.3$, từ điển tọa độ chuẩn 3 miền.<br>- `ShippingQuoteService`: Báo giá cước 2H (Ahamove) và Standard (GHN), xác thực hạn ngạch, kiểm tra ATP, cache-aside Upstash Redis/PostgreSQL với TTL 15 phút, validateQuote chống can thiệp giá.<br>- Migration `20261116010000_add_shipping_quotes` áp dụng thành công trên Neon PostgreSQL.<br>- Endpoints: `POST /api/v1/shipping/quotes`, `GET /api/v1/shipping/quotes/:quoteGroupId`.<br>- Test suites: `distance-calculator.service.spec.ts` (8/8 PASS), `shipping-quote.service.spec.ts` (10/10 PASS). |
| **EP03-T02** | **Triển Khai Chiến Lược Phân Tuyến Hỗn Hợp & Chia Đơn Có Kiểm Soát** | `[DONE]` (CONFIRMED) | - `HybridOrderRouter` tại `hybrid-order-router.ts`.<br>- Triển khai đầy đủ quyết định `DEC-01` (Hỏa tốc 2H: $\le 10$km, single location, mở cửa, còn hạn ngạch) và `DEC-02` (Split fulfillment: threshold $\ge 500$k, trần trợ giá 35k, tối đa 2 FOs).<br>- Test suite: `hybrid-order-router.spec.ts` đạt **8/8 PASS** (100% ma trận phân tuyến). |
| **EP03-T03** | **Tái Cấu Trúc Luồng Tạo Đơn Hàng & Đa Fulfillment Orders** | `[DONE]` (CONFIRMED) | - Model `FulfillmentOrder` và `FulfillmentOrderItem`.<br>- Migration `20261116010500_add_fulfillment_orders` đã apply thành công trên Neon DB.<br>- `CreateOrderUseCase`: Giao dịch nguyên tử `prisma.$transaction`, đối chiếu quote, FEFO reservation, cập nhật FO `ALLOCATED`, Outbox Event `ORDER_RESERVED`.<br>- Test suite: `create-order.use-case.spec.ts` đạt **4/4 PASS**. |
| **EP03-T04** | **Xây Dựng Bộ Tổng Hợp Trạng Thái Đơn Hàng (Order State Aggregator)** | `[DONE]` (CONFIRMED) | - Service `OrderStateAggregator` tại `order-state-aggregator.ts`.<br>- Tổng hợp trạng thái đơn cha: `PARTIALLY_DELIVERED`, `DELIVERED`, `SHIPPED`, cô lập hàng chuyển hoàn (RTO), tự động hoàn tất 24h theo `DEC-03`.<br>- Test suite: `order-state-aggregator.spec.ts` đạt **11/11 PASS**. |
| **EP04-T01** | **Quản Lý Danh Sách Nhặt Hàng & Quét Barcode Xác Thực (Picking Workflow)** | `[DONE]` (CONFIRMED) | - Model `Package`, `PackageItem`, `ShipmentPackage`, mở rộng `FulfillmentOrder` với `picked_at`.<br>- Migration `20261116150000_add_packages_and_shipment_links` áp dụng thành công trên Neon PostgreSQL.<br>- Service `PickingService`: `getPickList`, `startPicking`, `completePicking` đối chiếu 100% mã lô và số lượng FEFO (`BATCH_MISMATCH`, `QUANTITY_MISMATCH`).<br>- Controller `AdminFulfillmentController`: `/pick-list`, `/start-picking`, `/complete-picking`.<br>- Test suite: `picking.service.spec.ts` đạt **10/10 PASS**. |
| **EP04-T02** | **Quy Trình Đóng Gói, Cân Đo Kiện Thực Tế (Packing & Packages)** | `[DONE]` (CONFIRMED) | - Service `PackingService`: Bắt buộc cân nặng và kích thước thực tế lớn hơn 0 (`actualWeightGrams > 0`, `lengthCm > 0`, `widthCm > 0`, `heightCm > 0`), check constraints DB, hỗ trợ 1 hoặc nhiều kiện (`packages`).<br>- Mở transaction: tạo `Shipment` ở trạng thái `PENDING_CREATION`, tạo `Package`, `PackageItem`, `ShipmentPackage`, cập nhật FO sang `PACKED`, phát Outbox Event `SHIPMENT_DISPATCH_REQUESTED`.<br>- Controller `AdminFulfillmentController`: `POST /complete-packing`.<br>- Test suite: `packing.service.spec.ts` đạt **11/11 PASS**. |
| **EP04-T03** | **Quy Trình Xác Nhận Bàn Giao Kiện Hàng Cho Tài Xế (Handover Workflow)** | `[DONE]` (CONFIRMED) | - Service `HandoverService`: Chặn bàn giao nếu chưa có `tracking_code` từ 3PL (`SHIPMENT_NOT_READY`).<br>- Cập nhật FO và Shipment sang `HANDED_OVER`, gọi `OrderStateAggregator` đồng bộ trạng thái đơn cha sang `SHIPPED`, phát Outbox Event `FO_HANDED_OVER`.<br>- Controller `AdminFulfillmentController`: `POST /confirm-handover`.<br>- Test suite: `handover.service.spec.ts` đạt **7/7 PASS**.<br>- Integrated suite `epic-04-integrated-flow.spec.ts` đạt **1/1 PASS** (toàn bộ vòng đời WMS). |
| **EP05-T01** | **Thiết Kế Interface Giao Vận & Dữ Liệu Đa Hình (Shipping Provider Abstraction)** | `[DONE]` (CONFIRMED) | - Interface `IShippingProvider` và DTOs chuẩn quốc tế (grams, cm, VND).<br>- Mở rộng model `Shipment` đa hình: `shipment_type` (OUTBOUND, RETURN_PICKUP, INTER_STORE_TRANSFER), `return_order_id`, `actual_shipping_fee`, `carrier_reference_id`, `cod_status`, `tracking_url`.<br>- Migration `20261116170000_add_polymorphic_shipment_fields` áp dụng thành công trên Neon PostgreSQL kèm Check constraint `chk_shipment_type_ref`.<br>- Test suite `shipping-abstraction.migration.spec.ts` đạt **7/7 PASS**. |
| **EP05-T02** | **Xây Dựng Mock Shipping Provider & Simulation Test Harness** | `[DONE]` (CONFIRMED) | - Service `MockShippingProvider`: tính cước 25.000đ, sinh mã `MOCK-TRK-XXXXX`, link in nhãn, phân tích webhook.<br>- Dynamic DI: cấu hình `SHIPPING_MOCK_ENABLED=true` tự động inject `MockShippingProvider`.<br>- Simulation Controller `POST /api/v1/test/mock-carrier/trigger-status` mô phỏng sự kiện từ hãng, cập nhật DB, ghi `ShipmentEvent` và outbox event `SHIPMENT_STATUS_UPDATED`.<br>- Test suite `mock-shipping.provider.spec.ts` đạt **9/9 PASS**. |
| **EP05-T03** | **Xây Dựng Dịch Vụ Điều Phối Vận Đơn & Xử Lý Timeout (Shipment Orchestrator)** | `[DONE]` (CONFIRMED) | - Service `ShipmentOrchestratorService`: `dispatchShipment` với timeout bảo vệ 15s.<br>- Xử lý an toàn mẫu `CREATION_UNKNOWN` khi timeout hoặc lỗi mạng 5xx (AC1: không làm crash luồng).<br>- AC2: Chặn tạo lại khi `CREATION_UNKNOWN` yêu cầu đối soát.<br>- `reconcileCreationUnknown`: Đối soát tự động/thủ công chuyển sang `CREATED` hoặc reset về `PENDING_CREATION` để tạo lại.<br>- Controller `AdminShippingController`: `/dispatch` và `/reconcile`.<br>- Test suites: `shipment-orchestrator.service.spec.ts` đạt **7/7 PASS**, `epic-05-integrated-flow.spec.ts` đạt **1/1 PASS**. |
| **EP06 $\rightarrow$ 12** | 19 Tasks còn lại | `[NOT_STARTED]` | Chưa triển khai (không tạo trạng thái giả). |


---

## G. Hiện Trạng Mã Nguồn (Current Repository State)

### 1. Cấu Trúc Backend (`backend/src/`)
- Kiến trúc Modular Monolith chuẩn NestJS:
  - `src/modules/inventory/`: Đang chứa use-cases và repositories về tồn kho cơ bản.
  - `src/modules/orders/`: Quản lý đơn hàng, POS checkout, checkout online.
  - `src/core/cache/`: Chứa `UpstashRedisService` hoạt động hoàn chỉnh.
  - `src/modules/async-infrastructure/`: Thư mục đích cho Outbox và Queue integration.
  - `src/modules/fulfillment/`: Thư mục đích cho WMS, Picking, Packing.
  - `src/modules/shipping/`: Thư mục đích cho IShippingProvider và 3PL adapters.

### 2. Dữ Liệu Cơ Sở Dữ Liệu Thực Tế
- **Host:** PostgreSQL 16 trên AWS Neon (`ep-long-cake-a1ns962g-pooler.ap-southeast-1.aws.neon.tech`).
- **Product Variants:** 1.038 biến thể sản phẩm đang hoạt động.
- **Stores/Locations:** 9 địa điểm vật lý (`WH-TB`, `WH-HN`, `STORE-01` $\rightarrow$ `STORE-07`).
- **Inventory Records:** 6.422+ bản ghi số dư tồn kho với các cột:
  - `quantity`: Tồn vật lý.
  - `reserved_quantity`: Đang giữ chỗ.
  - `safety_stock`: Tồn an toàn bảo vệ Showroom.
  - `quarantined_quantity`: Hàng cách ly kiểm định/chờ tiêu hủy.
  - `damaged_quantity`: Hàng lỗi, hỏng bao bì.
  - `available_quantity`: Cột tự sinh (`GENERATED ALWAYS AS (quantity - reserved - safety - quarantined - damaged) STORED`).

---

## H. Danh Sách Tệp & Migration Đã Thay Đổi Chưa Commit

> [!WARNING]
> Tuyệt đối **KHÔNG** chạy `git reset --hard`, `git stash`, hay `git checkout` làm mất các thay đổi dưới đây.

### 1. Tệp Đã Sửa Đổi (Modified Files)
1. `backend/prisma/schema.prisma`:
   - Thêm `fulfillmentCapacityPerDay` trong model `Store`.
   - Thêm `safetyStock`, `quarantinedQuantity`, `damagedQuantity`, và `@@index([storeId, productVariantId], map: "idx_inventory_store_variant")` trong model `Inventory`.
   - Thêm model `OutboxEvent` (`outbox_events`) cho Transactional Outbox.
2. `backend/prisma/seed-stores.ts`:
   - Chuẩn hóa thông tin mạng lưới chi nhánh, tọa độ thực tế, công suất hoàn tất và chèn batch `createMany` số dư tồn kho ban đầu.
3. `backend/src/app.module.ts`:
   - Đăng ký `AsyncInfrastructureModule`.
4. `backend/src/modules/inventory/inventory.module.ts`:
   - Đăng ký và export `AtpCalculatorService`, `InventoryBalanceService`, `LocationService`, `LocationController`.
5. `docs/2-design/05_thiet_ke_fulfillment_logistics_rma.md`:
   - Bản thiết kế baseline v3.1-ENTERPRISE.
6. `docs/2-design/DES-07-FULFILLMENT-WORK-BREAKDOWN.md`:
   - Cập nhật trạng thái `EP01-T01` $\rightarrow$ `EP01-T04` sang `DONE` (Hoàn thành 100% EPIC 01).

### 2. Tệp & Thư Mục Mới Tạo (Untracked Files)
1. `backend/prisma/migrations/20261115155213_add_location_capacity_and_inventory_balances/migration.sql`:
   - Migration DDL bổ sung các cột mới vào bảng `inventory` và `stores`.
2. `backend/prisma/migrations/20261115155239_add_location_capacity_and_inventory_balances/migration.sql`:
   - Migration SQL tùy biến: Xóa ràng buộc cũ, thêm 3 check non-negative, thêm `chk_inventory_balances_logical`, và cập nhật cột STORED `available_quantity`.
3. `backend/prisma/migrations/20261115161243_add_outbox_events_table/migration.sql`:
   - Migration DDL tạo bảng `outbox_events`, index `idx_outbox_events_status_created` và Partial Index `idx_outbox_events_pending`.
4. `backend/src/modules/async-infrastructure/`:
   - `outbox/base-domain-event.ts`: Event contract CloudEvents spec.
   - `outbox/outbox-writer.interface.ts`: Interface `IOutboxWriter`.
   - `outbox/outbox-writer.service.ts`: `OutboxWriterService` hỗ trợ `record` và `recordMany`.
   - `outbox/__tests__/outbox-writer.spec.ts`: Integration test suite (5 tests PASS).
   - `async-infrastructure.module.ts` & `index.ts`.
5. `backend/src/modules/inventory/application/services/`:
   - `atp-calculator.service.ts`: Service tính toán ATP khả dụng theo công thức chuẩn.
   - `inventory-balance.service.ts`: Service truy vấn số dư và ATP (hỗ trợ `tx`).
   - `location.service.ts`: Service quản lý địa điểm, đánh giá giờ mở cửa VN và kiểm tra capacity.
   - `__tests__/atp-calculator.spec.ts`: Unit test suite ATP (11 tests PASS).
   - `__tests__/inventory-balance.service.spec.ts`: Unit test suite Inventory Balance (9 tests PASS).
   - `__tests__/location.service.spec.ts`: Unit test suite Location Service (8 tests PASS).
6. `backend/src/modules/inventory/presentation/controllers/`:
   - `location.controller.ts`: REST API endpoints `GET /locations`, `GET /locations/:id/capacity`.
   - `__tests__/location.controller.spec.ts`: Controller unit tests (2 tests PASS).
7. `backend/src/modules/inventory/presentation/dtos/`:
   - `location-query.dto.ts`, `location-response.dto.ts`, `location-capacity-response.dto.ts`.
8. `backend/src/modules/inventory/infrastructure/__tests__/inventory-balance.migration.spec.ts`:
   - Bộ kiểm thử tự động 6 test cases cho schema, check constraints và seed data.
9. `docs/2-design/DES-06-FULFILLMENT-IMPLEMENTATION-PLAN.md`:
   - Technical blueprint triển khai P0.
10. `docs/2-design/IMPLEMENTATION-LOG.md`:
   - Nhật ký chi tiết tiến độ triển khai từng nhiệm vụ.
11. `docs/2-design/IMPLEMENTATION-HANDOFF.md`:
   - Bản chụp trạng thái handoff hiện tại.

---

## I. Kết Quả Kiểm Thử Đã Xác Minh (Test Verification Results)

### 1. Toàn Bộ Test Suite (11 Test Suites - 73 Tests)
- **Lệnh chạy:** `npx jest src/modules/inventory/infrastructure/__tests__/inventory-lot.migration.spec.ts src/modules/inventory/application/services/__tests__/fefo-allocation.service.spec.ts src/modules/inventory/application/services/__tests__/inventory-reservation.service.spec.ts src/modules/inventory/application/services/__tests__/reservation-expiration.spec.ts --runInBand`
- **Kết quả:** `PASS - 11 passed, 73 passed, 73 total`
  - `inventory-balance.migration.spec.ts`: 6/6 PASS (Schema & DB Constraints).
  - `outbox-writer.spec.ts`: 5/5 PASS (Transactional Outbox ACID).
  - `atp-calculator.spec.ts`: 11/11 PASS (Mathematical Boundary & Formula).
  - `inventory-balance.service.spec.ts`: 9/9 PASS (Domain Service & Batching).
  - `location.service.spec.ts`: 8/8 PASS (Timezone Asia/Ho_Chi_Minh & Capacity Calculation).
  - `location.controller.spec.ts`: 2/2 PASS (REST Endpoints & Validation).
  - `epic-01-integrated-flow.spec.ts`: 6/6 PASS (Cohesive Integrated E2E Flow).
  - `inventory-lot.migration.spec.ts`: 8/8 PASS (FEFO Lots Schema, Constraints & Index).
  - `fefo-allocation.service.spec.ts`: 8/8 PASS (FEFO Allocation Algorithm & Pessimistic Locks).
  - `inventory-reservation.service.spec.ts`: 6/6 PASS (Zero Overselling Concurrency & Reservation ACID).
  - `reservation-expiration.spec.ts`: 4/4 PASS (Active Release, Idempotency, Scheduler Sweep, Concurrency SKIP LOCKED).
  - `distance-calculator.service.spec.ts`: 8/8 PASS (Haversine & Urban Winding Factor).
  - `shipping-quote.service.spec.ts`: 10/10 PASS (Quote calculation, Express 2H, GHN, Cache-aside & Anti-tampering).
  - `hybrid-order-router.spec.ts`: 8/8 PASS (Single location, Split fulfillment threshold & subsidies).
  - `create-order.use-case.spec.ts`: 4/4 PASS (Multi-FO Atomic ACID Order Creation).
  - `order-state-aggregator.spec.ts`: 11/11 PASS (Order Status Aggregation & 24h Auto-completion).
  - `epic-03-integrated-flow.spec.ts`: 4/4 PASS (E2E Order Routing & State Aggregator Flow).
  - `picking.service.spec.ts`: 10/10 PASS (Pick list, Barcode, Batch verification & FEFO alignment).
  - `packing.service.spec.ts`: 11/11 PASS (Actual weight & dimensions, multi-package & shipment creation).
  - `handover.service.spec.ts`: 7/7 PASS (Tracking code verification, 3PL handover & Order state update).
  - `epic-04-integrated-flow.spec.ts`: 1/1 PASS (Complete WMS Picking -> Packing -> Handover lifecycle).

  - `shipping-abstraction.migration.spec.ts`: 7/7 PASS (Polymorphic Shipment schema, DB check constraint).
  - `mock-shipping.provider.spec.ts`: 9/9 PASS (Mock Shipping provider contract, DI injection, DB updates).
  - `shipment-orchestrator.service.spec.ts`: 7/7 PASS (Dispatch orchestrator, timeout handling, OCC).
  - `epic-05-integrated-flow.spec.ts`: 1/1 PASS (Complete Packing -> Dispatch -> Handover lifecycle).
  - `ghn-client.spec.ts`: 9/9 PASS (Fee calculation, fallback static rates when timeout, Redis cache).
  - `ghn-provider.spec.ts`: 5/5 PASS (Create shipment, LADXXXXX tracking code, A6 print URL, cancel & webhook).
  - `ghn-status.mapper.spec.ts`: 21/21 PASS (100% GHN v2 status matrix, case-insensitive, unknown code to EXCEPTION).
  - `epic-06-integrated-flow.spec.ts`: 3/3 PASS (Integrated Quote -> Dispatch GHN -> Webhook parsing & Exception isolation).
  - `ahamove-client.spec.ts`: 8/8 PASS (Fee calculation, SGN/HAN-BIKE, coordinates validation, 10km radius block, timeout & error handling).
  - `ahamove-provider.spec.ts`: 4/4 PASS (Create booking, 22VMV tracking code, Live Tracking Map link, cancel & webhook).
  - `ahamove-status.mapper.spec.ts`: 16/16 PASS (Comprehensive matrix, combined status/dropoff_status, unknown code to EXCEPTION).
  - `ahamove-redispatch.service.spec.ts`: 5/5 PASS (Driver cancellation re-dispatch, max 2 attempts, DISPATCH_FAILED & outbox event).
  - `epic-07-integrated-flow.spec.ts`: 4/4 PASS (E2E Ahamove: Fee Quote & 10km block -> Dispatch & Live Map -> Status mapping & EXCEPTION -> Driver cancel auto re-dispatch 2x & DISPATCH_FAILED).
  - `webhook-inbox.service.spec.ts`: 5/5 PASS (AC1: Deduplication 10 payloads; AC2: Deterministic SHA256 Fingerprint; Concurrency 20 requests; Lifecycle states).
  - `webhook-ingress.controller.spec.ts`: 4/4 PASS (Internal Queue Consumer, GHN, Ahamove, Generic carrier).
  - `webhook-processor.service.spec.ts`: 12/12 PASS (Pure function State Transition Guard, AC1 DELIVERED & COD collection & Order sync, AC2 Late events IGNORED, Ahamove mapping, Idempotency).
  - `shipment-attempt.service.spec.ts`: 5/5 PASS (AC1: Failed attempt 1 & 2 do NOT cancel order; Attempt 3 triggers RETURNING & outbox event; Attempts history; Validation).
  - `return-to-origin.service.spec.ts`: 4/4 PASS (AC2: INTACT restored to FEFO lot & sellable stock; DAMAGED quarantined with no lot restore; Validation).
  - `epic-08-integrated-flow.spec.ts`: 4/4 PASS (End-to-End trọn vẹn 4 giai đoạn EPIC 08: Ingress & Deduplication -> Pipeline & State Guard -> Attempts Tracking -> RTO Warehouse Flow).
  - `outbox-relay.scheduler.spec.ts`: 8/8 PASS (AC1: Multi-worker concurrency with FOR UPDATE SKIP LOCKED; AC2: Zero message loss under network failure; Rate limit 429 backoff).
  - `cloudflare-worker-ingress-consumer.spec.ts`: 8/8 PASS (EP09-T02 Edge Ingress secret validation & queue send; EP09-T03 Consumer batch 10 & ack/retry handling).
  - `internal-webhook.controller.spec.ts`: 6/6 PASS (InternalTokenGuard token verification; Internal consume & dispatch endpoints).
  - `epic-09-integrated-flow.spec.ts`: 1/1 PASS (Complete asynchronous loop: Edge Ingress -> Cloudflare Queue -> Consumer -> NestJS Internal Dispatcher -> Outbox Relay).

### 2. Kiểm thử Toàn Diện Async Infrastructure Modules
- **Lệnh chạy:** `npm --prefix backend test -- src/modules/async-infrastructure/outbox/__tests__/outbox-relay.scheduler.spec.ts src/modules/async-infrastructure/__tests__/cloudflare-worker-ingress-consumer.spec.ts src/modules/async-infrastructure/webhooks/__tests__/internal-webhook.controller.spec.ts src/modules/async-infrastructure/webhooks/__tests__/webhook-ingress.controller.spec.ts src/modules/async-infrastructure/__tests__/epic-09-integrated-flow.spec.ts`
- **Kết quả:** `PASS - 5 passed, 5 total suites, 26 passed, 26 total tests`.

### 3. Kiểm thử Biên Dịch Hệ Thống (NestJS Build Verification)
- **Lệnh chạy:** `npm run build` (`nest build`)
- **Kết quả:** `SUCCESS - Exit Code 0` (toàn bộ các modules biên dịch thành công không có lỗi type/module).

---

## J. Vấn Đề Tồn Đọng, Nợ Kỹ Thuật & Rủi Ro Cần Lưu Ý (Known Issues & Risks)

1. **Git Branch Divergence:**
   - Đang làm việc trên nhánh `feat/be-fulfillment`. **Không thực hiện git push/rebase/reset.**
2. **Neon Database Cold Starts & Batching:**
   - Khi thao tác dữ liệu nhiều dòng, **bắt buộc dùng `createMany`, `updateMany` hoặc `$executeRaw`**, tránh chạy vòng lặp tuần tự nhiều câu lệnh đơn lẻ gây timeout.
3. **Module Cycle Avoidance:**
   - `AsyncInfrastructureModule` không import trực tiếp `OmsModule` để tránh chu trình với `InventoryModule`. `OrderStateAggregator` được tiêm với `@Optional()` trong `WebhookProcessorService` và resolve mượt mà tại runtime khi ứng dụng khởi chạy.

---

## K. Trạng Thái Hoàn Thành EPIC 09 & Nhiệm Vụ Tiếp Theo (Next Milestone)

```yaml
Epic Hoàn Thành: EPIC 09 – Event-Driven Async Infrastructure (3/3 Tasks DONE - 100%)
Các Nhiệm Vụ Đã Đạt Chuẩn DoD:
  - EP09-T01: Xây Dựng Outbox Relay Worker (PostgreSQL to Cloudflare Queue) (DONE)
  - EP09-T02: Triển Khai Cloudflare Worker Webhook Ingress Tại Edge (DONE)
  - EP09-T03: Triển Khai Cloudflare Queue Consumer & Internal Command Dispatcher (DONE)

Kế Hoạch Tiếp Theo:
  Epic Tiếp Theo: EPIC 10 – COD Reconciliation Engine
  Nhiệm Vụ Đầu Tiên: EP10-T01: Xây Dựng Vòng Đời Thu Hộ COD & Phân Bổ Khi Tách Đơn (4-Stage COD Lifecycle)
  Dependencies Cần Kiểm Tra:
    - Bảng cod_reconciliations và cod_reconciliation_items.
    - Quản lý trạng thái COD: COD_EXPECTED -> COD_COLLECTED -> SETTLEMENT_PENDING -> SETTLED.
    - Thuật toán phân bổ COD theo tỷ lệ giá trị kiện hàng khi đơn hàng bị tách kho.
```

---

## L. Hướng Dành Cho Coding Agent Trong Phiên Mới (Agent Instructions)

Khi tiếp tục phiên làm việc tiếp theo:
1. Xác nhận **`EPIC 09` đã hoàn thành 100% (3/3 Tasks)** và báo cáo nghiệm thu `EPIC-COMPLETION-REVIEW-EPIC-09.md` đã sẵn sàng để User review.
2. Kiểm tra chỉ đạo của User: Sau khi User nghiệm thu EPIC 09, bắt đầu triển khai **`EP10-T01: Xây Dựng Vòng Đời Thu Hộ COD & Phân Bổ Khi Tách Đơn`**.
3. Tuyệt đối không tự ý commit, push, stash hay revert các thay đổi trong working tree.

---
*Tài liệu kết thúc. Hệ thống đã sẵn sàng cho phiên triển khai tiếp theo!*

