# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 04 – FULFILLMENT & WMS OPERATIONS
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-04`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (WMS Operations, FEFO Picking, Barcode Verification, Actual Packing & Weighing, Package Entity, 3PL Handover & Order Aggregation)  
**Thời điểm lập:** 2026-11-16T15:30:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 04

EPIC 04 hiện thực hóa toàn bộ nghiệp vụ vận hành kho bãi (WMS) và hoàn tất đơn hàng tại chỗ (Showroom & Kho Tổng), kết nối chặt chẽ giữa tồn kho giữ chỗ FEFO (Epic 02) và điều phối đa đơn hàng OMS (Epic 03) để sẵn sàng bàn giao cho các đơn vị vận chuyển 3PL (Epic 05):

1. **Quản Lý Danh Sách Nhặt Hàng & Quét Barcode Xác Thực (Picking Workflow):** Cung cấp API trực quan cho nhân viên kho/cửa hàng truy xuất danh sách nhặt hàng (Pick List) kèm mã lô chỉ định chuẩn FEFO; bắt đầu nhặt hàng (`ALLOCATED` $\rightarrow$ `PICKING`); đối chiếu quét mã vạch và số lô thực tế; ngăn chặn tuyệt đối việc nhặt sai lô hoặc sai số lượng (`BATCH_MISMATCH`, `QUANTITY_MISMATCH`); cập nhật trạng thái `PICKED` khi khớp 100%.
2. **Quy Trình Đóng Gói, Cân Đo Kiện Thực Tế (Packing & Packages):** Ghi nhận chính xác kích thước và trọng lượng thực tế (grams, cm); tạo các thực thể `Package` và `PackageItem` với ràng buộc toàn vẹn cơ sở dữ liệu; hỗ trợ đóng 1 hoặc nhiều kiện (`packages`); tự động khởi tạo vận đơn `Shipment` ở trạng thái `PENDING_CREATION` với đối tác tương ứng (`GHN` hoặc `AHAMOVE`); phát hành Transactional Outbox Event `SHIPMENT_DISPATCH_REQUESTED`.
3. **Quy Trình Xác Nhận Bàn Giao Kiện Hàng Cho Tài Xế (Handover Workflow):** Kiểm tra điều kiện tiên quyết trước khi xuất xưởng (bắt buộc vận đơn đã được 3PL cấp `tracking_code`, ném `SHIPMENT_NOT_READY` nếu thiếu); cập nhật trạng thái `HANDED_OVER` cho cả `FulfillmentOrder` và `Shipment`; kích hoạt `OrderStateAggregator` đồng bộ trạng thái đơn hàng cha sang `SHIPPED` hoặc `PARTIALLY_SHIPPED`; phát hành Transactional Outbox Event `FO_HANDED_OVER`.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP04-T01  | Quản Lý Danh Sách Nhặt Hàng & Quét Barcode Xác Thực (Picking Workflow)   | Medium (M)  | [HOÀN THÀNH]  |
| EP04-T02  | Quy Trình Đóng Gói, Cân Đo Kiện Thực Tế (Packing & Packages)             | Medium (M)  | [HOÀN THÀNH]  |
| EP04-T03  | Quy Trình Xác Nhận Bàn Giao Kiện Hàng Cho Tài Xế (Handover Workflow)     | Small (S)   | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks                                                                  | Enterprise  | 3/3 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP04-T01** | 1. Quét sai mã lô (Batch Code) hệ thống báo lỗi `BATCH_MISMATCH` và từ chối hoàn thành.<br>2. Quét đủ số lượng và đúng lô $\implies$ FO chuyển sang `PICKED`.<br>3. Cung cấp API Pick List trực quan.<br>4. Idempotent cho các thao tác chuyển trạng thái. | - `PickingService` tại `picking.service.ts`.<br>- Đối chiếu 100% mã lô và số lượng thực tế với `inventory_reservation_items`.<br>- Migration `20261116150000_add_packages_and_shipment_links` bổ sung `picked_at`.<br>- Endpoints: `GET /pick-list`, `POST /start-picking`, `POST /complete-picking`.<br>- Test suite: `picking.service.spec.ts` (10/10 PASS). | **PASS** |
| **EP04-T02** | 1. Một FO có thể đóng thành 1 hoặc nhiều packages.<br>2. Cân nặng và kích thước thực tế được lưu chính xác, không dùng số ước tính.<br>3. Tạo `Shipment` ở trạng thái `PENDING_CREATION` gắn với `fulfillment_order_id`.<br>4. Ghi Transactional Outbox Event `SHIPMENT_DISPATCH_REQUESTED`. | - `PackingService` tại `packing.service.ts`.<br>- Check constraints cơ sở dữ liệu: `actual_weight_grams > 0`, `length_cm > 0`, `width_cm > 0`, `height_cm > 0`.<br>- Tự động phân loại đối tác vận chuyển: `EXPRESS_2H` $\rightarrow$ `AHAMOVE`, `STANDARD` $\rightarrow$ `GHN`.<br>- Endpoint: `POST /complete-packing`.<br>- Test suite: `packing.service.spec.ts` (11/11 PASS). | **PASS** |
| **EP04-T03** | 1. Chưa có mã vận đơn mà bấm bàn giao $\implies$ Throw `BadRequestException('SHIPMENT_NOT_READY: Kiện hàng chưa có mã vận đơn từ đối tác vận chuyển!')`.<br>2. Bàn giao thành công $\implies$ `handed_over_at` được ghi nhận, FO chuyển sang `HANDED_OVER`.<br>3. Kích hoạt `OrderStateAggregator` cập nhật trạng thái đơn cha sang `SHIPPED`.<br>4. Ghi Transactional Outbox Event `FO_HANDED_OVER`. | - `HandoverService` tại `handover.service.ts`.<br>- Chặn xuất kho nếu `Shipment.trackingCode` chưa có từ 3PL.<br>- Tích hợp gọi `OrderStateAggregator.computeOrderStatus(fo.orderId, tx)`.<br>- Endpoint: `POST /confirm-handover`.<br>- Test suite: `handover.service.spec.ts` (7/7 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Toàn Vẹn Hệ Thống

### 3.1 Ranh Giới Module & Tính Đóng Gói (Modular Monolith Boundaries)
- **Module `FulfillmentModule` độc lập:**
  - Nằm đúng thư mục kiến trúc: `backend/src/modules/fulfillment/`.
  - Phụ thuộc đúng hướng vào `AsyncInfrastructureModule` (Transactional Outbox) và `OmsModule` (Order State Aggregation).
  - Tách bạch rõ ràng 3 tầng: `presentation` (DTOs, AdminFulfillmentController), `application` (PickingService, PackingService, HandoverService), và quan hệ database qua `PrismaService`.
  - Đăng ký sạch sẽ trong `AppModule`.

### 3.2 Toàn Vẹn Cơ Sở Dữ Liệu & Ràng Buộc Check Constraints (Database Integrity)
- Migration `20261116150000_add_packages_and_shipment_links` đã áp dụng thành công lên cơ sở dữ liệu PostgreSQL (AWS Neon):
  - Check constraints vật lý ở cấp DB:
    - `chk_package_weight_positive`: `CHECK (actual_weight_grams > 0)`
    - `chk_package_length_positive`: `CHECK (length_cm > 0)`
    - `chk_package_width_positive`: `CHECK (width_cm > 0)`
    - `chk_package_height_positive`: `CHECK (height_cm > 0)`
    - `chk_package_item_quantity_positive`: `CHECK (quantity > 0)`
  - Foreign Keys & Indexes:
    - `idx_packages_fo_id` trên `packages(fulfillment_order_id)`.
    - `idx_package_items_package_id` trên `package_items(package_id)`.
    - `uq_shipment_package` UNIQUE trên `shipment_packages(shipment_id, package_id)`.
    - `idx_shipments_fulfillment_order_id` trên `shipments(fulfillment_order_id)`.

### 3.3 Đảm Bảo Giao Dịch ACID & Transactional Outbox Pattern
- **Tính nguyên tử 100% trong đóng gói (`completePacking`):** Tạo `Shipment`, tạo các `Package`, tạo các `PackageItem`, tạo liên kết `ShipmentPackage`, cập nhật `fulfillment_orders.status = 'PACKED'`, và ghi nhận outbox event `SHIPMENT_DISPATCH_REQUESTED` đều nằm trong một giao dịch cơ sở dữ liệu duy nhất (`prisma.$transaction`).
- **Tính nguyên tử trong bàn giao (`confirmHandover`):** Cập nhật `fulfillment_orders.status = 'HANDED_OVER'`, `shipments.status = 'HANDED_OVER'`, đồng bộ `OrderStateAggregator` cho đơn cha, và ghi nhận outbox event `FO_HANDED_OVER` cùng diễn ra trong `tx`. Bất kỳ lỗi nào phát sinh đều rollback hoàn toàn.

### 3.4 Cơ Chế Chống Thao Tác Trùng Lặp (Idempotency Protection)
- **Picking:** Gọi lại `startPicking` khi đơn đã ở `PICKING` hoặc `completePicking` khi đơn đã ở `PICKED` đều trả về thành công mà không gây lỗi hoặc trùng lặp dữ liệu.
- **Packing:** Gọi lại `completePacking` khi đơn đã ở `PACKED` trả về ngay danh sách kiện hàng và mã vận đơn hiện tại.
- **Handover:** Gọi lại `confirmHandover` khi đơn đã ở `HANDED_OVER` trả về ngay trạng thái hiện tại, không gọi lại `OrderStateAggregator` hay ghi trùng lặp outbox event.

---

## 4. Bằng Chứng Kiểm Thử Độc Lập (Verification & Test Evidence)

### 4.1 Kết Quả Chạy Toàn Bộ Test Suites Thuộc Epic 04
Toàn bộ 4 test suites thuộc `src/modules/fulfillment/` đã được thực thi và đạt **29/29 tests PASS (100%)**:

```
PASS src/modules/fulfillment/application/services/__tests__/picking.service.spec.ts (22.307 s)
  PickingService (EP04-T01)
    getPickList
      √ phải trả về danh sách nhặt hàng kèm mã lô FEFO chỉ định từ reservation
      √ phải ném NotFoundException nếu FulfillmentOrder không tồn tại
    startPicking
      √ phải chuyển trạng thái ALLOCATED -> PICKING và gán assignedPickerId
      √ phải xử lý idempotent nếu đơn đã ở trạng thái PICKING
      √ phải ném ConflictException nếu đơn không ở trạng thái ALLOCATED
    completePicking
      √ phải ném NotFoundException nếu FulfillmentOrder không tồn tại
      √ phải ném BadRequestException nếu đơn chưa ở trạng thái PICKING
      √ phải ném BadRequestException BATCH_MISMATCH nếu quét sai mã lô (AC1)
      √ phải ném BadRequestException QUANTITY_MISMATCH nếu quét thiếu hoặc thừa số lượng
      √ phải hoàn thành nhặt hàng thành công chuyển sang PICKED khi quét đúng 100% lô và số lượng (AC2)

PASS src/modules/fulfillment/application/services/__tests__/packing.service.spec.ts (22.315 s)
  PackingService (EP04-T02)
    Validation & Error Handling
      √ phải ném NotFoundException nếu FulfillmentOrder không tồn tại
      √ phải ném BadRequestException nếu FulfillmentOrder chưa ở trạng thái PICKED
      √ phải ném BadRequestException nếu danh sách packages rỗng
      √ phải ném BadRequestException nếu cân nặng thực tế <= 0 (AC2)
      √ phải ném BadRequestException nếu kích thước thực tế <= 0 (AC2)
      √ phải ném BadRequestException nếu đóng gói sản phẩm không thuộc đơn hàng
      √ phải ném BadRequestException nếu số lượng đóng gói không khớp (QUANTITY_MISMATCH)
    Đóng Gói Thành Công (AC1 & AC2)
      √ phải đóng gói thành công 1 package với đầy đủ kích thước, trọng lượng thực tế và tạo Shipment GHN (AC1 & AC2)
      √ phải đóng gói thành công nhiều packages (2 kiện) cho 1 đơn hàng FO (AC1)
      √ phải tự động gán carrierCode = AHAMOVE nếu shippingServiceCode = EXPRESS_2H
      √ phải xử lý idempotent khi đơn đã ở trạng thái PACKED

PASS src/modules/fulfillment/application/services/__tests__/handover.service.spec.ts (22.308 s)
  HandoverService (EP04-T03)
    Validation & Error Handling
      √ phải ném NotFoundException nếu FulfillmentOrder không tồn tại
      √ phải ném BadRequestException nếu FulfillmentOrder chưa ở trạng thái PACKED
      √ phải ném BadRequestException nếu đơn hàng chưa có vận đơn liên kết
      √ phải ném BadRequestException nếu kiện hàng chưa có mã vận đơn trackingCode từ 3PL (AC1)
      √ phải ném BadRequestException nếu trackingCode là chuỗi rỗng (AC1)
    Bàn Giao Thành Công (AC2)
      √ phải bàn giao thành công cho tài xế và kích hoạt cập nhật trạng thái đơn cha (AC2)
      √ phải xử lý idempotent khi đơn đã ở trạng thái HANDED_OVER

PASS src/modules/fulfillment/__tests__/epic-04-integrated-flow.spec.ts (22.323 s)
  Epic 04 Integrated Flow: WMS Picking -> Packing -> Handover Lifecycle
    √ phải thực thi trơn tru toàn bộ vòng đời WMS: Nhặt hàng (FEFO) -> Đóng gói (Cân đo) -> Bàn giao (3PL Tracking & Aggregation) (52 ms)

Test Suites: 4 passed, 4 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        23.791 s
```

### 4.2 Kết Quả Kiểm Thử Hồi Quy (Regression Testing)
Chạy toàn bộ 6 test suites của `src/modules/oms/` (Epic 03) để bảo đảm không có hồi quy:
- `order-state-aggregator.spec.ts`: 11/11 PASS
- `distance-calculator.service.spec.ts`: 8/8 PASS
- `shipping-quote.service.spec.ts`: 10/10 PASS
- `hybrid-order-router.spec.ts`: 8/8 PASS
- `create-order.use-case.spec.ts`: 4/4 PASS
- `epic-03-integrated-flow.spec.ts`: 4/4 PASS
- **Tổng cộng: 45/45 tests PASS (100%).**

### 4.3 Kiểm Tra Biên Dịch & Rà Soát Mã Nguồn
- **NestJS Compilation:** `npm run build` (`nest build`) đạt **Exit Code 0** sạch sẽ.
- **Rà soát mã nguồn:** Đã quét toàn bộ `backend/src/modules/fulfillment/**/*.ts` tìm kiếm `TODO`, `FIXME`, `HACK`, `XXX`, `console.log`.
  - **Kết quả: 0 phát hiện.** Không có code tạm hay rác debug.

---

## 5. Đánh Giá Khuyết Tật & Rủi Ro Kỹ Thuật (Defect Assessment)

| Mức Độ Nghiêm Trọng | Số Lượng | Mô Tả & Biện Pháp Xử Lý |
| :--- | :---: | :--- |
| **Critical (Khẩn cấp)** | 0 | Không có. Không có nguy cơ mất tính toàn vẹn dữ liệu hay vi phạm nghiệp vụ. |
| **High (Cao)** | 0 | Không có. Mọi ràng buộc FEFO, cân đo thực tế và mã vận đơn đều được kiểm soát chặt chẽ. |
| **Medium (Trung bình)** | 0 | Không có. Check constraints đảm bảo không bị lọt dữ liệu rác vào database. |
| **Low (Thấp / Ghi chú)** | 0 | Đã xử lý triệt để (bao gồm cả mã hóa fallback cho trường hợp chưa cấp tracking code). |

---

## 6. Kết Luận & Kế Hoạch Bàn Giao (Sign-Off & Next Steps)

- **Kết luận nghiệm thu:** **PASS TUYỆT ĐỐI (100% ĐẠT CHUẨN)**.
- **Tính sẵn sàng cho Epic tiếp theo:** Toàn bộ thực thể `Package` và `Shipment` ở trạng thái `PENDING_CREATION` kèm sự kiện Transactional Outbox `SHIPMENT_DISPATCH_REQUESTED` đã hoàn toàn sẵn sàng cho **EPIC 05: Shipping Provider Abstraction & Dispatch Orchestration**.
- **Chuyển giao:** Hệ thống tạm dừng tại điểm kiểm soát chất lượng (Quality Gate) để báo cáo và chờ User Review / Acceptance trước khi chuyển sang Epic 05.
