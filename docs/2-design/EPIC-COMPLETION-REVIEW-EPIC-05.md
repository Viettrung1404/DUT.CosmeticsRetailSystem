# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 05 – SHIPPING PROVIDER ABSTRACTION
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-05`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (3PL Shipping Provider Abstraction, Polymorphic Shipment, Mock Carrier Adapter, Timeout & CREATION_UNKNOWN Recovery, Dispatch Orchestration)  
**Thời điểm lập:** 2026-11-16T16:00:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 05

EPIC 05 xây dựng lớp trừu tượng hóa giao vận (Shipping Provider Abstraction) độc lập, linh hoạt và có khả năng mở rộng cắm các hãng 3PL (GHN, Ahamove, ViettelPost, v.v.) mà không làm thay đổi core domain logic:

1. **Thiết Kế Interface Giao Vận & Dữ Liệu Đa Hình (Shipping Provider Abstraction):** Chuẩn hóa interface `IShippingProvider` với 4 phương thức cốt lõi (`calculateFee`, `createShipment`, `cancelShipment`, `parseWebhook`); chuẩn hóa toàn bộ DTOs theo chuẩn quốc tế (`grams`, `cm`, `VND`); mở rộng model `Shipment` đa hình hỗ trợ cả chiều giao đi (`OUTBOUND`), thu hồi đổi trả (`RETURN_PICKUP`) và điều chuyển liên kho (`INTER_STORE_TRANSFER`), kiểm soát bằng ràng buộc toàn vẹn cơ sở dữ liệu `chk_shipment_type_ref`.
2. **Xây Dựng Mock Shipping Provider & Simulation Test Harness:** Cung cấp adapter giả lập `MockShippingProvider` phục vụ kiểm thử cô lập không cần kết nối mạng hay sandbox bên ngoài; tính cước chuẩn 25.000đ; sinh mã tracking ngẫu nhiên dạng `MOCK-TRK-XXXXX`; link in nhãn; hỗ trợ cơ chế Dependency Injection động qua cấu hình `SHIPPING_MOCK_ENABLED=true`; cung cấp endpoint mô phỏng bắn webhook `POST /api/v1/test/mock-carrier/trigger-status` cập nhật trạng thái vận đơn thực tế và phát Transactional Outbox Event.
3. **Xây Dựng Dịch Vụ Điều Phối Vận Đơn & Xử Lý Timeout (Shipment Orchestrator):** Xử lý luồng tạo đơn sang 3PL sau khi đóng gói; khóa chống thao tác lặp; thiết lập cơ chế timeout 15s (`DEFAULT_DISPATCH_TIMEOUT_MS`); áp dụng mẫu khôi phục sự cố `CREATION_UNKNOWN` khi xảy ra timeout hoặc lỗi mạng 5xx (AC1: không làm crash luồng nghiệp vụ kho; AC2: chặn nhân viên bấm tạo lại ngay lập tức và yêu cầu đối soát); cung cấp quy trình đối soát `reconcileCreationUnknown` hỗ trợ tự động xác nhận đơn hoặc reset về `PENDING_CREATION` để thử lại an toàn.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP05-T01  | Thiết Kế Interface Giao Vận & Dữ Liệu Đa Hình (Shipping Provider Abs)   | Medium (M)  | [HOÀN THÀNH]  |
| EP05-T02  | Xây Dựng Mock Shipping Provider & Simulation Test Harness                | Small (S)   | [HOÀN THÀNH]  |
| EP05-T03  | Xây Dựng Dịch Vụ Điều Phối Vận Đơn & Xử Lý Timeout (Shipment Orchestrator)| Large (L)   | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks                                                                  | Enterprise  | 3/3 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP05-T01** | 1. Toàn bộ DTO của interface sử dụng chuẩn quốc tế (grams, cm, VND).<br>2. Schema hỗ trợ cả chiều gửi đi và chiều thu hồi đổi trả.<br>3. Ràng buộc `tracking_code UNIQUE` và kiểm soát đa hình qua check constraint. | - Interface `IShippingProvider` tại `shipping-provider.interface.ts`.<br>- DTOs tại `shipping-provider.dto.ts` (`weightGrams`, `lengthCm`, `widthCm`, `heightCm`, `codAmountVnd`).<br>- Model `Shipment` mở rộng `shipment_type`, `return_order_id`, `actual_shipping_fee`, `carrier_reference_id`, `cod_status`, `tracking_url`.<br>- Migration `20261116170000_add_polymorphic_shipment_fields` áp dụng thành công trên Neon PostgreSQL kèm Check constraint `chk_shipment_type_ref`.<br>- Test suite: `shipping-abstraction.migration.spec.ts` (7/7 PASS). | **PASS** |
| **EP05-T02** | 1. Khi cấu hình `SHIPPING_MOCK_ENABLED=true`, hệ thống tự động sử dụng Mock Provider.<br>2. Bắn status giả lập cập nhật đúng trạng thái Shipment trong cơ sở dữ liệu.<br>3. Toàn bộ test integration chạy độc lập không cần internet. | - `MockShippingProvider` tại `mock-shipping.provider.ts`: tính phí 25.000đ, sinh mã `MOCK-TRK-XXXXX`, link in nhãn.<br>- Dynamic DI: `provide: SHIPPING_PROVIDER` inject `MockShippingProvider` khi cờ `SHIPPING_MOCK_ENABLED=true` hoặc `NODE_ENV !== 'production'`.<br>- Endpoint: `POST /api/v1/test/mock-carrier/trigger-status` cập nhật DB, ghi nhận `ShipmentEvent`, ghi Outbox Event `SHIPMENT_STATUS_UPDATED`.<br>- Test suite: `mock-shipping.provider.spec.ts` (9/9 PASS). | **PASS** |
| **EP05-T03** | 1. Timeout không làm crash luồng nghiệp vụ kho.<br>2. Trạng thái `CREATION_UNKNOWN` ngăn chặn nhân viên bấm tạo lại đơn ngay lập tức.<br>3. Cung cấp quy trình đối soát `reconcileCreationUnknown`.<br>4. Idempotency guard khi đơn đã có mã vận đơn. | - `ShipmentOrchestratorService` tại `shipment-orchestrator.service.ts`.<br>- Timeout protection 15s: Bắt lỗi an toàn, cập nhật `status = 'CREATION_UNKNOWN'`, ghi Outbox Event `SHIPMENT_CREATION_UNKNOWN`, trả về response an toàn không throw crash luồng (AC1).<br>- Chặn tạo lại khi `CREATION_UNKNOWN`: ném `BadRequestException` yêu cầu đối soát (AC2).<br>- Phương thức `reconcileCreationUnknown`: chuyển `CREATED` nếu có đơn hoặc reset về `PENDING_CREATION` nếu chưa có.<br>- Controller: `AdminShippingController` (`/dispatch`, `/reconcile`).<br>- Test suites: `shipment-orchestrator.service.spec.ts` (7/7 PASS), `epic-05-integrated-flow.spec.ts` (1/1 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Toàn Vẹn Hệ Thống

### 3.1 Ranh Giới Module & Tính Đóng Gói (Modular Monolith Boundaries)
- **Module `ShippingModule` độc lập:**
  - Nằm đúng thư mục kiến trúc: `backend/src/modules/shipping/`.
  - Tuân thủ Clean / Hexagonal Architecture:
    - `domain/ports/`: Chứa interface `IShippingProvider` và token `SHIPPING_PROVIDER`.
    - `domain/dtos/`: Chứa các DTOs chuẩn quốc tế (grams, cm, VND).
    - `infrastructure/adapters/mock/`: Chứa `MockShippingProvider`.
    - `application/services/`: Chứa `ShipmentOrchestratorService`.
    - `presentation/controllers/`: Chứa `TestMockCarrierController` và `AdminShippingController`.
  - Đăng ký sạch sẽ trong `AppModule`, export `SHIPPING_PROVIDER`, `MockShippingProvider` và `ShipmentOrchestratorService`.

### 3.2 Toàn Vẹn Cơ Sở Dữ Liệu & Ràng Buộc Check Constraints (Database Integrity)
- Migration `20261116170000_add_polymorphic_shipment_fields` đã áp dụng thành công lên cơ sở dữ liệu PostgreSQL (AWS Neon):
  - Check constraint vật lý ở cấp DB:
    ```sql
    ALTER TABLE "shipments" ADD CONSTRAINT "chk_shipment_type_ref" CHECK (
        (shipment_type = 'OUTBOUND' AND (fulfillment_order_id IS NOT NULL OR order_id IS NOT NULL)) OR
        (shipment_type = 'RETURN_PICKUP' AND return_order_id IS NOT NULL) OR
        (shipment_type = 'INTER_STORE_TRANSFER')
    );
    ```
  - Khóa ngoại & Indexes:
    - Foreign key `shipments_return_order_id_fkey` liên kết với `return_orders(id)`.
    - Index `idx_shipments_return_order_id` trên `shipments(return_order_id)`.
    - Composite Index `idx_shipments_carrier_tracking` trên `shipments(carrier_code, tracking_code)`.

### 3.3 Đảm Bảo Giao Dịch ACID & Transactional Outbox Pattern
- **Tính nguyên tử trong Dispatch (`dispatchShipment`):** Cập nhật `Shipment` (`status = 'CREATED'`, `trackingCode`, `carrierReferenceId`, `shippingLabelUrl`) và ghi nhận outbox event `SHIPMENT_CREATED` diễn ra trong cùng một database transaction (`prisma.$transaction`).
- **Xử lý sự cố mạng & Timeout:** Khi xảy ra lỗi mạng 5xx hoặc timeout > 15s, trạng thái được cập nhật sang `CREATION_UNKNOWN` và ghi nhận outbox event `SHIPMENT_CREATION_UNKNOWN` trong `tx`. Không làm gián đoạn hay crash tiến trình của nhân viên kho.
- **Tính nguyên tử trong Đối Soát (`reconcileCreationUnknown`):** Cập nhật trạng thái `CREATED` hoặc `PENDING_CREATION` đi kèm outbox event tương ứng (`SHIPMENT_RECONCILED_CREATED` hoặc `SHIPMENT_RESET_TO_PENDING`) trong một giao dịch cơ sở dữ liệu duy nhất.

---

## 4. Bằng Chứng Kiểm Thử Độc Lập (Verification & Test Evidence)

### 4.1 Kết Quả Chạy Toàn Bộ Test Suites Thuộc Epic 05
Toàn bộ 4 test suites thuộc `src/modules/shipping/` đã được thực thi và đạt **24/24 tests PASS (100%)**:

```
PASS src/modules/shipping/__tests__/epic-05-integrated-flow.spec.ts (24.229 s)
  EPIC 05: Shipping Provider Abstraction & Dispatch Integrated Lifecycle
    √ Hoàn thành toàn bộ vòng đời hoàn tất: Packing -> 3PL Dispatch (MOCK) -> Carrier In-Transit -> Handover (5950 ms)

PASS src/modules/shipping/application/services/__tests__/shipment-orchestrator.service.spec.ts (12.305 s)
  EP05-T03: Shipment Orchestrator Service & Timeout Recovery (CREATION_UNKNOWN)
    1. Happy Path & Idempotency
      √ Điều phối tạo vận đơn thành công và chuyển trạng thái sang CREATED (2148 ms)
      √ Idempotent: Gọi dispatchShipment lần 2 trả về ngay kết quả hiện tại không gọi lại 3PL (883 ms)
    2. Acceptance Criteria 1: Timeout Handling (CREATION_UNKNOWN)
      √ AC1: Khi đối tác bị timeout (> 15s hoặc cấu hình), không crash luồng và chuyển status sang CREATION_UNKNOWN (2196 ms)
    3. Acceptance Criteria 2: Block Retries on CREATION_UNKNOWN
      √ AC2: Khi vận đơn đang ở CREATION_UNKNOWN, chặn nhân viên bấm dispatch tạo lại đơn ngay lập tức (1673 ms)
    4. Reconciliation Engine: reconcileCreationUnknown
      √ Đối soát khi hãng xác nhận ĐÃ CÓ đơn (carrierFound: true) -> Chuyển CREATED (1330 ms)
      √ Đối soát khi hãng xác nhận CHƯA CÓ đơn (carrierFound: false) -> Reset về PENDING_CREATION để tạo lại (2694 ms)
      √ Từ chối đối soát nếu vận đơn không ở trạng thái CREATION_UNKNOWN (746 ms)

PASS src/modules/shipping/infrastructure/adapters/mock/__tests__/mock-shipping.provider.spec.ts (11.21 s)
  EP05-T02: Mock Shipping Provider & Simulation Test Harness
    1. MockShippingProvider Unit Contract
      √ AC1: Khi cấu hình SHIPPING_MOCK_ENABLED=true, container inject đúng MockShippingProvider (5 ms)
      √ Tính phí calculateFee trả về 25.000đ cố định và dự kiến giao sau 2 ngày (1 ms)
      √ Tạo vận đơn createShipment sinh mã tracking MOCK-TRK-XXXXX và link in nhãn (2 ms)
      √ Hủy vận đơn cancelShipment trả về true
      √ Phân tích webhook parseWebhook chuẩn hóa sự kiện từ đối tác (2 ms)
    2. Simulation Test Harness: POST /api/v1/test/mock-carrier/trigger-status
      √ AC2: Bắn status giả lập cập nhật đúng trạng thái Shipment trong cơ sở dữ liệu (1416 ms)
      √ Bắn status DELIVERED cập nhật deliveredAt trong cơ sở dữ liệu (1021 ms)
      √ Bắn status DELIVERY_FAILED tăng failed_attempts trong cơ sở dữ liệu (1171 ms)
      √ Báo lỗi NotFoundException nếu trackingCode không tồn tại (429 ms)

PASS src/modules/shipping/infrastructure/__tests__/shipping-abstraction.migration.spec.ts
  EP05-T01: Polymorphic Shipments Schema & Shipping Provider Abstraction Contract
    1. Schema & Check Constraint: chk_shipment_type_ref
      √ AC2.1: Cho phép tạo vận đơn OUTBOUND với fulfillmentOrderId (214 ms)
      √ AC2.2: Cho phép tạo vận đơn RETURN_PICKUP với returnOrderId (207 ms)
      √ AC2.3: Cho phép tạo vận đơn INTER_STORE_TRANSFER không bắt buộc fulfillment_order_id hay return_order_id (201 ms)
      √ AC2.4: Chặn vi phạm chk_shipment_type_ref khi RETURN_PICKUP không có return_order_id (378 ms)
      √ AC2.5: Chặn vi phạm chk_shipment_type_ref khi OUTBOUND không có fulfillment_order_id VÀ không có order_id (199 ms)
    2. DTOs & Interface Contract Verification
      √ AC1: Kiểm tra DTOs tuân thủ chuẩn quốc tế (grams, cm, VND) (1 ms)
      √ Kiểm tra kiểu dữ liệu IShippingProvider compile đúng cấu trúc

Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        50.647 s
```

### 4.2 Kết Quả Kiểm Thử Hồi Quy (Regression Testing)
Toàn bộ các test suite liên quan trực tiếp đến hoàn tất đơn hàng và vận chuyển (Fulfillment WMS và Legacy Shipments) đã được chạy lại và đạt **30/30 tests PASS (100%)**:
- `packing.service.spec.ts`: 11/11 PASS
- `handover.service.spec.ts`: 7/7 PASS
- `epic-04-integrated-flow.spec.ts`: 1/1 PASS
- `prisma-shipment.repository.spec.ts`: 11/11 PASS

### 4.3 Kiểm Thử Biên Dịch Mã Nguồn (NestJS Build Verification)
- **Lệnh thực thi:** `npm run build` (`nest build`)
- **Kết quả:** `SUCCESS - Exit Code 0` (Toàn bộ mã nguồn biên dịch thành công không có bất kỳ lỗi cú pháp hay kiểu dữ liệu nào).

---

## 5. Bảng Phân Loại Khiếm Khuyết (Defect Classification)

| Mức Độ (Severity) | Số Lượng | Mô Tả & Đánh Giá Tác Động | Biện Pháp Khắc Phục / Trạng Thái |
| :--- | :---: | :--- | :--- |
| **CRITICAL** | 0 | Không có lỗi sai lệch dữ liệu, vi phạm ACID hay lỗi bảo mật. | - |
| **HIGH** | 0 | Không có luồng nghiệp vụ hoàn tất hoặc điều phối nào bị đứt gãy. | - |
| **MEDIUM** | 0 | Tất cả validation, timeout handling và check constraints DB đều đạt 100%. | - |
| **LOW** | 0 | Mã nguồn sạch sẽ, tuân thủ Clean Architecture và NestJS standards. | - |

---

## 6. Kết Luận & Đề Xuất Bàn Giao

- **Đánh Giá Nghiệm Thu:** **`PASS`** (Toàn bộ 3 Tasks thuộc EPIC 05 đã hoàn thành đầy đủ, đạt 100% Acceptance Criteria và có bằng chứng kiểm thử thực tế).
- **Mức Độ Sẵn Sàng Triển Khai Tiếp Theo:**
  - Hệ thống đã sẵn sàng cho **EPIC 06 – GHN Standard Integration** (Bắt đầu với `EP06-T01: Hiện Thực Hóa GHN Client & Báo Giá Cước API v2`).
  - Giao diện trừu tượng `IShippingProvider` và dịch vụ điều phối `ShipmentOrchestratorService` đã hoàn chỉnh để tiếp nhận các adapter 3PL cụ thể của Giao Hàng Nhanh và Ahamove.
