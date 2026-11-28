# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 06 – GHN STANDARD INTEGRATION
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-06`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Tích Hợp Giao Hàng Tiêu Chuẩn 3PL: GHN E-Commerce API v2, Báo Giá Cước & Fallback Timeout 5s, Tạo Vận Đơn & Token In Nhãn Khổ A6, Status Mapper & Cô Lập Mã Trạng Thái Bất Thường)  
**Thời điểm lập:** 2026-11-16T17:00:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 06

EPIC 06 hiện thực hóa việc tích hợp trực tiếp với đối tác vận chuyển Giao Hàng Nhanh (GHN) theo chuẩn E-Commerce API v2, đảm bảo tính chuẩn xác, độ tin cậy cao và an toàn trước sự cố kết nối:

1. **Hiện Thực Hóa GHN Client & Báo Giá Cước API v2 (EP06-T01):**
   - Đóng gói HTTP Client `GHNClient` với Base URL chính thức `https://online-gateway.ghn.vn/shiip/public-api/v2`.
   - Xác thực qua HTTP headers bắt buộc: `Token` và `ShopId`.
   - Cài đặt phương thức `calculateFee(req: QuoteRequestDto)` gọi `POST /shipping-order/fee` với gói dịch vụ tiêu chuẩn `service_type_id: 2`.
   - AC1: Gửi đúng địa chỉ nhận hàng tại Đà Nẵng, GHN trả về cước phí chuẩn xác.
   - AC2: Cơ chế bảo vệ Timeout 5 giây (`AbortSignal.timeout(5000)`) và xử lý lỗi mạng/HTTP 5xx: Fallback về cước phí tĩnh dự phòng (22.000đ cho đơn nội tỉnh, 35.000đ cho đơn liên tỉnh).
   - Tích hợp bộ đệm Upstash Redis Cache 24 giờ cho danh mục hành chính Tỉnh/Huyện/Xã (`ghn:address:provinces`, `ghn:address:districts:${provinceId}`, `ghn:address:wards:${districtId}`).
2. **Tạo Vận Đơn GHN & Lấy Token In Nhãn Khổ A6 (EP06-T02):**
   - Hiện thực hóa `GHNProvider implements IShippingProvider` với `readonly carrierCode = 'GHN'`.
   - Đóng gói payload tạo đơn chuẩn theo tài liệu thiết kế DES-05 (dòng 306-330):
     - `payment_type_id: 1` (`[FACT]` Shop trả cước / người gửi trả cước cho GHN).
     - `required_note: 'KHONGCHOXEMHANG'` (`[GLOWUP POLICY]` bảo vệ mỹ phẩm seal, chống tráo hàng).
     - `note`: Ghi chú bảo quản hàng mỹ phẩm cao cấp.
     - `client_order_code = req.shipmentCode` (dùng làm khóa chống tạo trùng đơn trên hệ thống GHN).
     - Trọng lượng (grams) và kích thước 3 chiều (cm) thực tế từ kiện hàng `Package`.
     - Danh sách chi tiết các mặt hàng `{ name, code, quantity, price }`.
   - AC1: Nhận mã bưu kiện hợp lệ từ GHN (dạng `LADXXXXX`).
   - AC2: Gọi `POST /a5/gen-token` lấy token in nhãn A6 nhiệt, cấu hình đường dẫn xem trước và in nhãn nhiệt: `https://online-gateway.ghn.vn/a5/public-api/printA5?token=${labelToken}` lưu vào `shipment.shipping_label_url`.
   - Cung cấp hàm `cancelShipment` gọi `POST /switch-status/cancel` và hàm `parseWebhook` chuẩn hóa dữ liệu bưu kiện.
3. **Xây Dựng GHN Status Mapper & Xử Lý Mã Trạng Thái Bất Thường (EP06-T03):**
   - Xây dựng hàm thuần khiết `mapGHNStatus(ghnStatus: string): string`.
   - AC1: Ánh xạ 100% các mã trạng thái chuẩn trong tài liệu GHN v2 về `ShipmentStatus` nội bộ.
   - AC2 `[CRITICAL CORRECTION]`: Tiếp nhận bất kỳ mã lạ nào không nằm trong danh mục (ví dụ `unknown_code_xyz`, `hub_fire_evacuated`, null, chuỗi rỗng) $\implies$ Trả về `'EXCEPTION'` (TUYỆT ĐỐI KHÔNG tự động gán `'IN_TRANSIT'`) và ghi `logger.error` cảnh báo hệ thống để nhân viên vận hành xử lý thủ công.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP06-T01  | Hiện Thực Hóa GHN Client & Báo Giá Cước API v2                           | Medium (M)  | [HOÀN THÀNH]  |
| EP06-T02  | Tạo Vận Đơn GHN & Lấy Token In Nhãn Khổ A6                               | Medium (M)  | [HOÀN THÀNH]  |
| EP06-T03  | Xây Dựng GHN Status Mapper & Xử Lý Mã Trạng Thái Bất Thường              | Small (S)   | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks                                                                  | Enterprise  | 3/3 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP06-T01** | 1. Gửi đúng địa chỉ nhận hàng tại Đà Nẵng, GHN trả về cước phí chuẩn xác.<br>2. Lỗi timeout trả về cước fallback theo bảng giá tĩnh dự phòng.<br>3. Cache danh mục địa giới hành chính vào Redis. | - Lớp `GHNClient` tại `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-client.ts`.<br>- Headers: `Token` và `ShopId`.<br>- Phương thức `calculateFee` gọi `POST /shipping-order/fee`.<br>- Bắt timeout 5s (`AbortSignal.timeout(5000)`): Fallback về 22.000đ nội tỉnh / 35.000đ liên tỉnh (AC2).<br>- Tích hợp `UpstashRedisService` cache Tỉnh/Huyện/Xã với TTL 24 giờ.<br>- Test suite: `ghn-client.spec.ts` (9/9 PASS). | **PASS** |
| **EP06-T02** | 1. GHN trả về mã bưu kiện hợp lệ (dạng `LADXXXXX`).<br>2. Đường dẫn in nhãn A6 mở ra trang xem trước tem in nhiệt chính xác.<br>3. `client_order_code = shipment_code` làm khóa chống tạo trùng trên GHN. | - Lớp `GHNProvider` tại `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn.provider.ts`.<br>- Đóng gói payload: `payment_type_id: 1` (Shop trả cước), `required_note: 'KHONGCHOXEMHANG'`, `client_order_code = req.shipmentCode`, COD, kích thước và trọng lượng thực tế.<br>- Sinh mã tracking dạng `LADXXXXX` (AC1).<br>- Gọi `POST /a5/gen-token` lấy token in nhãn A6: sinh URL `https://online-gateway.ghn.vn/a5/public-api/printA5?token=${labelToken}` lưu vào `shippingLabelUrl` (AC2).<br>- Test suite: `ghn-provider.spec.ts` (5/5 PASS). | **PASS** |
| **EP06-T03** | 1. 100% mã trạng thái tài liệu GHN v2 được ánh xạ đúng.<br>2. `[CRITICAL CORRECTION]` Nhận mã lạ `unknown_code_xyz` $\implies$ Trả về `'EXCEPTION'` và ghi log cảnh báo ERROR.<br>3. Không tự động fallback về `'IN_TRANSIT'`. | - Hàm `mapGHNStatus` tại `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-status.mapper.ts`.<br>- Ánh xạ đầy đủ 17 mã trạng thái chuẩn GHN v2.<br>- Mã lạ không thuộc danh mục hoặc lỗi dữ liệu: ghi `logger.error` và trả về `'EXCEPTION'` (AC2).<br>- Test suites: `ghn-status.mapper.spec.ts` (21/21 PASS), `epic-06-integrated-flow.spec.ts` (3/3 PASS). | **PASS** |

---

## 3. Đánh Giá Kiến Trúc & Tính Toàn Vẹn Kỹ Thuật

### 3.1 Ranh Giới Modular Monolith & Clean Architecture
- **Mô đun độc lập:** Toàn bộ adapter GHN được đóng gói tại `backend/src/modules/shipping/infrastructure/adapters/ghn/`:
  - `ghn-client.ts`: Đóng gói HTTP layer tương tác với GHN v2.
  - `ghn.provider.ts`: Thực thi port `IShippingProvider`.
  - `ghn-status.mapper.ts`: Hàm thuần khiết ánh xạ trạng thái.
- **Provider Registry Map (`SHIPPING_PROVIDERS`):**
  - Đăng ký map các hãng vận chuyển trong `ShippingModule`:
    - Carrier `GHN` $\rightarrow$ `GHNProvider`
    - Carrier `MOCK` $\rightarrow$ `MockShippingProvider`
  - Cơ chế hỗ trợ cờ `SHIPPING_MOCK_ENABLED=true`: Trong môi trường kiểm thử giả lập, tự động trỏ mọi giao vận sang `MockShippingProvider` mà không làm thay đổi logic gọi của `ShipmentOrchestratorService`.

### 3.2 Cơ Chế Bảo Vệ Sự Cố Kết Nối & Idempotency
- **Khóa chống tạo trùng đơn (Deduplication):** Sử dụng `client_order_code = shipment.shipmentCode`. Nếu phía GHN đã nhận yêu cầu tạo đơn trước đó, hệ thống ngăn chặn việc tạo trùng hai bưu kiện khác nhau cho cùng một kiện hàng.
- **Timeout Protection:**
  - Báo giá cước (`calculateFee`): Timeout tối đa 5 giây. Nếu GHN quá tải hoặc mạng gián đoạn, hệ thống tự động trả về cước fallback tĩnh dự phòng, ngăn chặn việc gián đoạn trải nghiệm checkout của khách hàng.
  - Tạo vận đơn (`createShipment`): Timeout tối đa 15 giây. Kết hợp cơ chế khôi phục `CREATION_UNKNOWN` của `ShipmentOrchestratorService` đã xây dựng ở Epic 05.

### 3.3 Cách Ly Trạng Thái Bất Thường (`EXCEPTION` Status Isolation)
- Khắc phục triệt để lỗ hổng nghiêm trọng từ bản thiết kế cũ (DES-05 dòng 1199 từng có `default: return 'IN_TRANSIT'`).
- Mọi mã trạng thái lạ chưa được đăng ký trong danh mục tài liệu GHN v2 (ví dụ: bưu cục gặp hỏa hoạn, thiên tai, hàng bị tịch thu, hoặc GHN đổi mã mới) đều được đưa ngay về trạng thái `'EXCEPTION'` và phát cảnh báo lỗi cấp `ERROR`, yêu cầu nhân viên đối soát kiểm tra thủ công, bảo vệ an toàn cho chuỗi cung ứng.

---

## 4. Bằng Chứng Kiểm Thử Độc Lập (Verification & Test Evidence)

### 4.1 Toàn Bộ Test Suites Của Shipping Module (8 Suites - 62 Tests PASS)

```
PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-status.mapper.spec.ts (50.444 s)
  GHNStatusMapper (EP06-T03)
    AC1: 100% mã trạng thái tài liệu GHN v2 được ánh xạ đúng
      √ should map GHN status "ready_to_pick" to "CREATED" (5 ms)
      √ should map GHN status "picking" to "DRIVER_ASSIGNED" (1 ms)
      √ should map GHN status "picked" to "IN_TRANSIT" (1 ms)
      √ should map GHN status "storing" to "IN_TRANSIT"
      √ should map GHN status "sorting" to "IN_TRANSIT"
      √ should map GHN status "transporting" to "IN_TRANSIT" (1 ms)
      √ should map GHN status "delivering" to "OUT_FOR_DELIVERY"
      √ should map GHN status "money_collect_delivering" to "OUT_FOR_DELIVERY" (1 ms)
      √ should map GHN status "delivered" to "DELIVERED"
      √ should map GHN status "delivery_fail" to "DELIVERY_FAILED" (1 ms)
      √ should map GHN status "waiting_to_return" to "RETURNING"
      √ should map GHN status "return" to "RETURNING"
      √ should map GHN status "return_transporting" to "RETURNING"
      √ should map GHN status "return_sorting" to "RETURNING"
      √ should map GHN status "returning" to "RETURNING"
      √ should map GHN status "returned" to "RETURNED"
      √ should map GHN status "cancel" to "CANCELLED"
      √ should be case-insensitive and trim extra whitespaces
    AC2: [CRITICAL CORRECTION] Nhận mã lạ unknown_code_xyz => Trả về EXCEPTION và ghi log ERROR
      √ should map unknown status "unknown_code_xyz" to "EXCEPTION" and log ERROR (1 ms)
      √ should map unexpected carrier status "damaged_during_storm" to "EXCEPTION"
      √ should handle null, undefined or empty strings safely by mapping to "EXCEPTION" and logging error (1 ms)

PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-client.spec.ts (53.754 s)
  GHNClient (EP06-T01)
    AC1: Gửi đúng địa chỉ nhận hàng tại Đà Nẵng, GHN trả về cước phí chuẩn xác
      √ should calculate shipping fee successfully when GHN API returns 200 OK (16 ms)
      √ should calculate fee for same province delivery (estimated 2 days) (4 ms)
    AC2: Lỗi timeout trả về cước fallback theo bảng giá tĩnh dự phòng
      √ should return fallback fee (35.000 VND inter-province) when fetch times out (2 ms)
      √ should return fallback fee (22.000 VND same-province) when fetch throws HTTP error (2 ms)
      √ should return fallback fee if recipient district cannot be resolved (2 ms)
    Address Master Data & Upstash Redis Cache
      √ should fetch provinces from GHN and store in Redis (1 ms)
      √ should fetch districts and cache with provinceId key (2 ms)
      √ should fetch wards and cache with districtId key (2 ms)
      √ should resolve district ID and ward code by fuzzy name (2 ms)

PASS src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-provider.spec.ts (53.777 s)
  GHNProvider (EP06-T02)
    AC1 & AC2: Tạo vận đơn GHN & Lấy Token In Nhãn Khổ A6
      √ should create shipment successfully, returning valid tracking code LADXXXXX and A6 print label URL (16 ms)
      √ should throw error when GHN does not return order_code (18 ms)
      √ should fallback to order_code print url if A6 token generation fails (3 ms)
    cancelShipment & parseWebhook
      √ should call cancelOrder on GHNClient (2 ms)
      √ should parse GHN webhook body correctly (2 ms)

PASS src/modules/shipping/__tests__/epic-06-integrated-flow.spec.ts (62.985 s)
  EPIC 06: GHN Standard Integration - End-to-End Integrated Flow
    √ STAGE 1: GHN Client báo giá cước vận chuyển chuẩn xác & Fallback khi Timeout (5 ms)
    √ STAGE 2: Dispatch Shipment qua GHN Provider - Sinh mã LADXXXXX và tem nhãn nhiệt A6 (1715 ms)
    √ STAGE 3: Nhận Webhook GHN - Ánh xạ trạng thái và cô lập mã bất thường vào EXCEPTION (2 ms)

PASS src/modules/shipping/infrastructure/__tests__/shipping-abstraction.migration.spec.ts (51.446 s)
PASS src/modules/shipping/infrastructure/adapters/mock/__tests__/mock-shipping.provider.spec.ts (67.892 s)
PASS src/modules/shipping/__tests__/epic-05-integrated-flow.spec.ts (72.228 s)
PASS src/modules/shipping/application/services/__tests__/shipment-orchestrator.service.spec.ts (74.188 s)

Test Suites: 8 passed, 8 total
Tests:       62 passed, 62 total
Snapshots:   0 total
Time:        76.045 s
Ran all test suites matching /src\\modules\\shipping/i.
```

### 4.2 Kiểm Thử Hồi Quy Các Module Liên Quan (Regression Testing)
- **Lệnh chạy:** `npm test -- handover.service.spec.ts packing.service.spec.ts fefo-allocation.service.spec.ts`
- **Kết quả:** `PASS - 3 test suites, 26 passed, 26 total`.
  - `handover.service.spec.ts`: 7/7 PASS.
  - `packing.service.spec.ts`: 11/11 PASS.
  - `fefo-allocation.service.spec.ts`: 8/8 PASS.

### 4.3 Kiểm Thử Biên Dịch Hệ Thống (NestJS Build Verification)
- **Lệnh chạy:** `npm run build` (`nest build`)
- **Kết quả:** `SUCCESS - Exit Code 0` (toàn bộ ứng dụng biên dịch thành công không có lỗi type/module).

---

## 5. Danh Sách Tệp Đã Sửa Đổi & Tạo Mới

### 5.1 Tệp Mới Tạo (Untracked Files)
1. `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-client.ts`: HTTP Client kết nối GHN v2, API tính phí, fallback timeout 5s, cache Tỉnh/Huyện/Xã qua Upstash Redis.
2. `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn.provider.ts`: Adapter thực thi `IShippingProvider` cho GHN v2, tạo vận đơn, sinh mã `LADXXXXX`, lấy token in tem nhiệt A6.
3. `backend/src/modules/shipping/infrastructure/adapters/ghn/ghn-status.mapper.ts`: Pure function ánh xạ 100% mã trạng thái GHN v2 và cô lập mã lạ về `EXCEPTION` kèm log lỗi.
4. `backend/src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-client.spec.ts`: Test suite cho `GHNClient` (9 tests PASS).
5. `backend/src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-provider.spec.ts`: Test suite cho `GHNProvider` (5 tests PASS).
6. `backend/src/modules/shipping/infrastructure/adapters/ghn/__tests__/ghn-status.mapper.spec.ts`: Test suite cho `mapGHNStatus` (21 tests PASS).
7. `backend/src/modules/shipping/__tests__/epic-06-integrated-flow.spec.ts`: Test suite tích hợp trọn vẹn luồng GHN từ tính phí $\rightarrow$ dispatch $\rightarrow$ in nhãn A6 $\rightarrow$ nhận webhook và cô lập exception (3 tests PASS).
8. `docs/2-design/EPIC-COMPLETION-REVIEW-EPIC-06.md`: Tài liệu báo cáo nghiệm thu hoàn thành Epic 06.

### 5.2 Tệp Đã Cập Nhật (Modified Files)
1. `backend/src/modules/shipping/shipping.module.ts`: Đăng ký `GHNClient`, `GHNProvider`, token đa đối tác `SHIPPING_PROVIDERS`, điều phối linh hoạt giữa Mock và GHN.
2. `backend/src/modules/shipping/index.ts`: Export các thành phần GHN phục vụ liên module.
3. `backend/src/modules/shipping/application/services/shipment-orchestrator.service.ts`: Hỗ trợ tự động phân giải provider theo `shipment.carrierCode`.
4. `docs/2-design/DES-07-FULFILLMENT-WORK-BREAKDOWN.md`: Đánh dấu `EP06-T01`, `EP06-T02`, `EP06-T03` sang `[DONE]`.
5. `docs/2-design/IMPLEMENTATION-LOG.md`: Ghi nhật ký triển khai chi tiết cho 3 tasks thuộc Epic 06.
6. `docs/2-design/IMPLEMENTATION-HANDOFF.md`: Nâng phiên bản handoff lên v1.9.0-ENTERPRISE, ghi nhận 21/37 Tasks DONE (56.8%).

---

## 6. Kết Luận & Sẵn Sàng Cho Epic 07

- Toàn bộ 3 Implementation Tasks của **EPIC 06: GHN Standard Integration** đã được triển khai hoàn chỉnh, tuân thủ nghiêm ngặt các nguyên tắc Clean Architecture, giao dịch an toàn và các tiêu chuẩn kiểm thử tự động.
- Không có bất kỳ lỗi biên dịch nào (`nest build` thành công), không có test nào thất bại (8/8 test suites, 62/62 tests PASS).
- Trạng thái mã nguồn sạch sẽ, không tự ý commit/push theo quy định.
- **Hệ thống đã sẵn sàng 100% để chuyển sang EPIC 07: Ahamove Express 2H Integration.**
