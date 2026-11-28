# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 07 – AHAMOVE EXPRESS 2H INTEGRATION
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-07`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Tích Hợp Giao Hàng Hỏa Tốc 2H: Ahamove On-Demand Delivery API v1/v3, Báo Giá Cước Tức Thời & Kiểm Soát Bán Kính 10km [DEC-01], Tạo Booking Hỏa Tốc & Live Tracking Map Link, Ahamove Status Mapper & Tự Động Re-dispatch Khi Tài Xế Hủy Chuyến)  
**Thời điểm lập:** 2026-11-16T17:30:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 07

EPIC 07 hiện thực hóa việc tích hợp trực tiếp với đối tác giao vận Ahamove phục vụ đơn hàng hỏa tốc trong vòng 2 giờ (Express 2H) theo tiêu chuẩn On-Demand Delivery API v1/v3, đảm bảo độ chính xác theo tọa độ địa lý, độ tin cậy kết nối và tự động hóa xử lý sự cố tài xế:

1. **Hiện Thực Hóa Ahamove Client & Báo Phí Hỏa Tốc (EP07-T01):**
   - Đóng gói HTTP Client `AhamoveClient` với Base URL chính thức `https://partner-api.ahamove.com` (cấu hình linh hoạt qua `AHAMOVE_API_URL`).
   - Xác thực qua Bearer Token / API Key doanh nghiệp (`AHAMOVE_API_TOKEN` / `AHAMOVE_API_KEY`).
   - Cài đặt phương thức `calculateFee(req: QuoteRequestDto)` gọi `POST /v1/order/estimated_fee` với gói dịch vụ xe máy tức thời:
     - `SGN-BIKE`: Khu vực TP. Hồ Chí Minh.
     - `HAN-BIKE`: Khu vực Hà Nội.
   - **DEC-01 (Giới hạn bán kính hỏa tốc 2H):** Áp dụng công thức Haversine tính toán khoảng cách đại hình cầu kết hợp hệ số uốn lượn đô thị 1.3. Nếu khoảng cách $> 10\text{ km}$ đường bộ $\implies$ Ném ngay `BadRequestException('AHAMOVE_SERVICE_UNAVAILABLE: Khoảng cách vượt quá giới hạn bán kính 10km')`.
   - AC1: Báo giá hợp lệ trong nội thành trả về cước phí chuẩn xác VND và `estimatedDeliveryDays: 0` (giao tức thời trong 2 giờ).
   - AC2: Bán kính $> 10\text{ km}$ hoặc địa chỉ ngoài vùng phục vụ bị chặn ngay lập tức.
   - Cơ chế bảo vệ Timeout 5 giây (`AbortSignal.timeout(5000)`) và xử lý lỗi mạng.

2. **Tạo Booking Hỏa Tốc 2H & Lấy Link Bản Đồ Trực Tiếp (EP07-T02):**
   - Hiện thực hóa `AhamoveProvider implements IShippingProvider` với `readonly carrierCode = 'AHAMOVE'`.
   - Cài đặt phương thức `createShipment(req: CreateShipmentDto)` gọi `POST /v1/order/create`:
     - Kiểm tra khoảng cách $\le 10\text{ km}$ (DEC-01).
     - `payment_method: 'BALANCE'` (Shop thanh toán cước trực tiếp từ tài khoản đối tác doanh nghiệp).
     - `order_time: 0` (yêu cầu điều phối xe tức thời).
     - Khóa chuyến xe chống đặt trùng bằng `tracking_number = req.shipmentCode`.
   - AC1: Nhận mã cuốc xe hợp lệ từ Ahamove (dạng `22VMV54W`).
   - AC2: Lấy đường dẫn Live Tracking Map trực tiếp từ response hoặc gọi `GET /v3/orders/{id}/shared-link` (`https://ahamove.com/share/...`) và lưu vào `shipments.tracking_url` cho khách hàng theo dõi tài xế thời gian thực.
   - Tự động sinh liên kết Phiếu Giao Hàng nội bộ khổ A6 có barcode đơn hàng (do Ahamove không hỗ trợ API in tem nhiệt A6).

3. **Xây Dựng Ahamove Status Mapper & Xử Lý Điều Phối Lại Khi Tài Xế Hủy (EP07-T03):**
   - Xây dựng hàm thuần khiết `mapAhamoveStatus(orderStatus, dropoffStatus)`: Đối chiếu đồng thời trạng thái đơn hàng (`ASSIGNING`, `ACCEPTED`, `IN_PROCESS`, `COMPLETED`, `CANCELLED`) và trạng thái điểm trả hàng (`DELIVERING`, `SUCCESS`, `FAILED`).
   - **[CRITICAL CORRECTION]**: Tiếp nhận bất kỳ mã lạ nào (ví dụ `vehicle_seized_by_traffic_police`, `driver_quits_job`, null, chuỗi rỗng) $\implies$ Trả về `'EXCEPTION'` (TUYỆT ĐỐI KHÔNG tự động gán `'IN_TRANSIT'`) và ghi `logger.error` cảnh báo hệ thống.
   - Triển khai `AhamoveRedispatchService.handleDriverCancellation(trackingCode, reason)`:
     - Tự động re-dispatch tối đa 2 lần khi tài xế hủy chuyến.
     - Lần 1 và 2: Đặt cuốc xe mới qua `AhamoveProvider.createShipment`, cập nhật `trackingCode` mới, phát Outbox Event `AHAMOVE_DRIVER_REASSIGNED`.
     - Quá 2 lần ($> 2$ lần): Chuyển `Shipment.status = 'DISPATCH_FAILED'`, phát Outbox Event `AHAMOVE_MANUAL_INTERVENTION_REQUIRED` và phát cảnh báo cấp ERROR để điều phối viên can thiệp thủ công.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP07-T01  | Hiện Thực Hóa Ahamove Client & Báo Phí Hỏa Tốc                           | Medium (M)  | [HOÀN THÀNH]  |
| EP07-T02  | Tạo Booking Hỏa Tốc 2H & Lấy Link Bản Đồ Trực Tiếp (Live Map Link)      | Medium (M)  | [HOÀN THÀNH]  |
| EP07-T03  | Xây Dựng Ahamove Status Mapper & Xử Lý Điều Phối Lại Khi Tài Xế Hủy      | Medium (M)  | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks                                                                  | Enterprise  | 3/3 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP07-T01** | 1. Gửi đúng 2 điểm đi và đến trong nội thành, Ahamove trả về giá cước hợp lệ.<br>2. Bán kính $> 10\text{ km}$ hoặc ngoài vùng phục vụ $\implies$ Báo lỗi không khả dụng dịch vụ (DEC-01).<br>3. Timeout 5 giây bảo vệ hệ thống. | - Lớp `AhamoveClient` tại `backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-client.ts`.<br>- Tự động xác định gói cước xe máy `SGN-BIKE` (Hồ Chí Minh) / `HAN-BIKE` (Hà Nội).<br>- Tính toán Haversine kết hợp hệ số uốn lượn đô thị 1.3: Chặn mọi đơn có khoảng cách $> 10\text{ km}$ (AC2).<br>- Gọi `POST /v1/order/estimated_fee` với timeout 5s (`AbortSignal.timeout(5000)`).<br>- Trả về cước hợp lệ và `estimatedDeliveryDays = 0` (AC1).<br>- Test suite: `ahamove-client.spec.ts` (8/8 PASS). | **PASS** |
| **EP07-T02** | 1. Ahamove trả về mã đơn (dạng `22VMV54W`).<br>2. Khách hàng mở `tracking_url` xem được vị trí tài xế trên bản đồ.<br>3. Khóa chuyến xe qua `tracking_number = shipment_code` chống đặt trùng. | - Lớp `AhamoveProvider` tại `backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-provider.ts`.<br>- Gọi `POST /v1/order/create` với `payment_method: 'BALANCE'`, `order_time: 0`, khóa chuyến xe bằng `tracking_number = req.shipmentCode`.<br>- Nhận mã cuốc xe dạng `22VMV54W` (AC1).<br>- Lấy link live map từ response hoặc qua `GET /v3/orders/{id}/shared-link` và lưu vào `shipment.tracking_url` (`https://ahamove.com/share/...`) (AC2).<br>- Sinh mã in Phiếu Giao Hàng nội bộ khổ A6 có barcode.<br>- Test suite: `ahamove-provider.spec.ts` (4/4 PASS). | **PASS** |
| **EP07-T03** | 1. Tài xế bấm hủy $\implies$ Hệ thống tự động tìm tài xế mới trong 30 giây (Re-dispatch tối đa 2 lần).<br>2. `[CRITICAL CORRECTION]` Bất kỳ trạng thái lạ nào đều được đưa về `EXCEPTION`.<br>3. Sau 2 lần thất bại $\implies$ Chuyển `DISPATCH_FAILED` và bắn cảnh báo điều phối viên. | - Hàm `mapAhamoveStatus` tại `backend/src/modules/shipping/infrastructure/adapters/ahamove/ahamove-status.mapper.ts`.<br>- Ánh xạ toàn diện trạng thái cuốc xe; mã lạ ném về `'EXCEPTION'` + `logger.error` (AC2).<br>- Lớp `AhamoveRedispatchService` tại `backend/src/modules/shipping/application/services/ahamove-redispatch.service.ts`.<br>- Re-dispatch tự động $\le 2$ lần: Gọi lại `AhamoveProvider.createShipment`, cập nhật `trackingCode` mới, ghi Outbox Event `AHAMOVE_DRIVER_REASSIGNED` (AC1).<br>- Vượt quá 2 lần: Cập nhật `status = 'DISPATCH_FAILED'`, phát Outbox Event `AHAMOVE_MANUAL_INTERVENTION_REQUIRED` (AC3).<br>- Test suites: `ahamove-status.mapper.spec.ts` (16/16 PASS), `ahamove-redispatch.service.spec.ts` (5/5 PASS), `epic-07-integrated-flow.spec.ts` (4/4 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Toàn Vẹn Kỹ Thuật

### 3.1 Ranh Giới Modular Monolith & Clean Architecture
- **Mô đun độc lập:** Toàn bộ adapter và dịch vụ Ahamove được đóng gói chặt chẽ trong `backend/src/modules/shipping/`:
  - `infrastructure/adapters/ahamove/ahamove-client.ts`: Đóng gói HTTP REST client tương tác Ahamove API.
  - `infrastructure/adapters/ahamove/ahamove-provider.ts`: Cài đặt cổng `IShippingProvider` cho hãng `AHAMOVE`.
  - `infrastructure/adapters/ahamove/ahamove-status.mapper.ts`: Hàm thuần khiết đối chiếu trạng thái.
  - `application/services/ahamove-redispatch.service.ts`: Dịch vụ điều phối tự động re-dispatch khi tài xế hủy.
- **Provider Registry Map (`SHIPPING_PROVIDERS`):**
  - Mở rộng Map đăng ký đối tác vận chuyển trong `ShippingModule`:
    - Carrier `GHN` $\rightarrow$ `GHNProvider`
    - Carrier `AHAMOVE` $\rightarrow$ `AhamoveProvider`
    - Carrier `MOCK` $\rightarrow$ `MockShippingProvider`
  - `ShipmentOrchestratorService` tự động tra cứu Provider dựa trên `shipment.carrierCode`, không phát sinh logic hardcode rẽ nhánh hãng vận chuyển.

### 3.2 Tuân Thủ Tuyệt Đối Quyết Định Nghiệp Vụ DEC-01
- **Công thức Haversine nhân hệ số uốn lượn đô thị 1.3:**
  $$\text{Distance} = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \varphi}{2}\right) + \cos(\varphi_1)\cos(\varphi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right) \times 1.3$$
- Bất kỳ đơn hàng nào có khoảng cách giữa địa chỉ cửa hàng xuất và địa chỉ người nhận $> 10.0\text{ km}$ đều bị từ chối ngay tại tầng tính cước và tầng tạo vận đơn, đảm bảo tài xế xe máy Ahamove luôn hoàn tất giao hàng trong khung giờ cam kết 2 giờ.

### 3.3 Cách Ly Trạng Thái Bất Thường (`EXCEPTION` Isolation)
- Khắc phục triệt để rủi ro nhận mã trạng thái không xác định từ Ahamove (ví dụ sự cố giao thông, tạm giữ phương tiện, sự cố thời tiết cực đoan).
- Mọi mã trạng thái không hợp lệ đều được map về `'EXCEPTION'` và ghi log cảnh báo cấp `ERROR`. Tuyệt đối không fallback tự động về `'IN_TRANSIT'`.

### 3.4 Khả Năng Tự Phục Hồi Khi Tài Xế Hủy Chuyến (Resilient Driver Re-allocation)
- Quá trình giao hàng hỏa tốc on-demand có tỷ lệ tài xế hủy chuyến nhất định (hỏng xe, kẹt xe, bận việc).
- `AhamoveRedispatchService` theo dõi lịch sử số lần hủy thông qua trường `carrierMetadata.driverCancellations`.
- Cho phép hệ thống tự động đặt lại chuyến xe tối đa 2 lần mà không cần nhân viên vận hành can thiệp.
- Khi chạm ngưỡng quá 2 lần, hệ thống lập tức khóa đơn sang `DISPATCH_FAILED` và phát Transactional Outbox Event `AHAMOVE_MANUAL_INTERVENTION_REQUIRED` để điều phối viên can thiệp kịp thời.

---

## 4. Bằng Chứng Kiểm Thử Độc Lập (Verification & Test Evidence)

### 4.1 Toàn Bộ Test Suites Của Shipping Module (13 Suites - 99 Tests PASS 100%)

```
PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-client.spec.ts (97.346 s)
PASS src/modules/shipping/infrastructure/adapters/ahamove/__tests__/ahamove-client.spec.ts (97.366 s)
PASS src/modules/shipping/infrastructure/adapters/ahamove/__tests__/ahamove-status.mapper.spec.ts
PASS src/modules/shipping/infrastructure/adapters/ahamove/__tests__/ahamove-provider.spec.ts
PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-status.mapper.spec.ts (102.189 s)
PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-provider.spec.ts (102.304 s)
PASS src/modules/shipping/application/services/__tests__/ahamove-redispatch.service.spec.ts (102.54 s)
PASS src/modules/shipping/infrastructure/__tests__/shipping-abstraction.migration.spec.ts (104.223 s)
PASS src/modules/shipping/__tests__/epic-06-integrated-flow.spec.ts (107.804 s)
PASS src/modules/shipping/infrastructure/adapters/mock/__tests__/mock-shipping.provider.spec.ts (107.924 s)
PASS src/modules/shipping/__tests__/epic-07-integrated-flow.spec.ts (112.938 s)
PASS src/modules/shipping/application/services/__tests__/shipment-orchestrator.service.spec.ts (114.878 s)
PASS src/modules/shipping/__tests__/epic-05-integrated-flow.spec.ts (116.189 s)

Test Suites: 13 passed, 13 total
Tests:       99 passed, 99 total
Snapshots:   0 total
Time:        118.9 s
```

### 4.2 Chi Tiết Kiểm Thử End-to-End Integrated Flow Epic 07 (`epic-07-integrated-flow.spec.ts`)

```
PASS src/modules/shipping/__tests__/epic-07-integrated-flow.spec.ts (25.575 s)
  EPIC 07: Ahamove Express 2H Integration - End-to-End Integrated Flow
    √ STAGE 1: Báo giá cước Hỏa tốc 2H & Chặn đơn vượt bán kính 10km (DEC-01) (29 ms)
    √ STAGE 2: Dispatch Shipment qua Ahamove Provider - Sinh mã 22VMV và Live Tracking Map link (1748 ms)
    √ STAGE 3: Nhận Webhook Ahamove & Xử lý Trạng Thái Bất Thường (3 ms)
    √ STAGE 4: Xử lý Tự Động Re-dispatch Khi Tài Xế Hủy Chuyến (Tối Đa 2 Lần) (4184 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### 4.3 Kiểm Thử Hồi Quy Các Modules Phụ Thuộc (Regression Tests - 3 Suites - 26 Tests PASS)

```
PASS src/modules/fulfillment/application/services/__tests__/handover.service.spec.ts (14.982 s)
PASS src/modules/fulfillment/application/services/__tests__/packing.service.spec.ts (14.995 s)
PASS src/modules/inventory/application/services/__tests__/fefo-allocation.service.spec.ts (25.804 s)

Test Suites: 3 passed, 3 total
Tests:       26 passed, 26 total
Snapshots:   0 total
Time:        27.07 s
```

### 4.4 Kiểm Thử Biên Dịch Mã Nguồn (NestJS Build Verification)

```
> glowup-backend@1.0.0 build
> nest build

Exit Code: 0 (Thành công 100%, không có lỗi type/syntax/module resolution).
```

---

## 5. Kết Luận & Đề Xuất Nghiệm Thu

1. **Kết quả:** EPIC 07 (`Ahamove Express 2H Integration`) đã hoàn thành **3/3 tasks (100%)**, vượt qua toàn bộ 99 bài test của Shipping Module, 26 bài test hồi quy WMS/Inventory và biên dịch NestJS thành công sạch sẽ.
2. **Đề xuất:** Kính trình Technical Director / Product Owner phê duyệt nghiệm thu EPIC 07 để chuyển giao và mở khóa sang **EPIC 08 – Webhook Inbox & Tracking Orchestration**.
