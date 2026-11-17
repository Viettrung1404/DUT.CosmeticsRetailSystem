# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 14 – MULTI-CHANNEL REVERSE LOGISTICS (STORE DROP-OFF & GHN RETURN PICKUP)
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-14`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P1 (Vận Chuyển Thu Hồi Đa Kênh: Tiếp Nhận Tại Quầy Showroom Phân Lập Chi Nhánh, Điều Phối Bưu Tá GHN Thu Gom Tận Nhà Với Mã Vận Đơn Ngược Chuẩn LAD, Tiếp Nhận Kiện Hàng Hoàn Tại Tổng Kho Bằng Quét Mã Vận Đơn Barcode & Tuyệt Đối Cách Ly Tồn Kho Quarantined)  
**Thời điểm lập:** 2026-11-17T11:30:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`, `DES-08-P1-P2-IMPLEMENTATION-ROADMAP`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn - 37/37 Tests Pass, Zero P0 Regressions, 100% Type-Safe Build)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 14

EPIC 14 hoàn thiện hạ tầng tiếp nhận và luân chuyển hàng hoàn đa kênh cho toàn bộ chuỗi cung ứng GlowUp (bao gồm 7 Showrooms bán lẻ và 2 Tổng kho phân phối):

1. **Quy Trình Tiếp Nhận Hàng Hoàn Tại Cửa Hàng (Store Drop-off Workflow) (EP14-T01):**
   - Mở rộng cơ chế kiểm soát dữ liệu phân quyền `@LocationScoped` và `LocationScopeGuard` hỗ trợ tài nguyên `RETURN_ORDER` (phân giải `dropoffLocationId` hoặc `storeId` của hồ sơ RMA). Nhân viên showroom chỉ được tiếp nhận các hồ sơ mang đến đúng showroom thuộc phạm vi phân quyền của mình.
   - Xây dựng `ReceiveStoreDropoffUseCase`:
     - Kiểm tra trạng thái hồ sơ RMA (chỉ cho phép các hồ sơ ở trạng thái `SUBMITTED`, `APPROVED`, `AWAITING_RETURN`).
     - Sinh mã biên bản tiếp nhận duy nhất định dạng `RCP-YYYYMMDD-XXXX`.
     - Thực thi Transaction ACID: Tạo bản ghi `ReturnReceipt`, tăng `quarantined_quantity` và tổng `quantity` trên bảng `inventory` tại Showroom tiếp nhận.
     - **Bảo đảm quy tắc bất biến sống còn (AC3): Tuyệt đối không làm tăng `available_quantity` bán lẻ** (do cột `available_quantity` tự động trừ đi `quarantined_quantity`).
     - Ghi nhật ký kho `inventory_transactions` với loại giao dịch `RETURN_INBOUND`.
     - Cập nhật trạng thái `ReturnOrder` sang `RECEIVED`.
     - Ghi nhận sự kiện miền `RMA_RECEIVED_AT_STORE` vào bảng `outbox_events` trong cùng một transaction.

2. **Tích Hợp Vận Chuyển Thu Gom Tận Nhà Với GHN Reverse Logistics (EP14-T02):**
   - Xây dựng `ReverseShippingService`:
     - Kiểm tra tính hợp lệ của hồ sơ: Bắt buộc kênh `CARRIER_PICKUP`, bắt buộc có địa chỉ lấy hàng chi tiết (`pickupAddress`).
     - Ngăn chặn tạo trùng lặp vận đơn thu gom đang hoạt động (chặn xung đột trạng thái).
     - Phân giải kho/showroom đích tiếp nhận hàng hoàn (ưu tiên Tổng kho Tân Bình hoặc showroom phân bổ).
     - Sinh mã vận đơn thu hồi nội bộ (`SHP-REV-YYYYMMDD-XXXX`) và mã bưu tá đối tác chuẩn GHN Reverse (`LADXXXXXX`) kèm URL in tem nhãn A5.
     - Thực thi Transaction ACID: Tạo bản ghi `Shipment` với `shipmentType = 'RETURN_PICKUP'`, `carrierCode = 'GHN'`, trạng thái `READY_TO_PICK`; cập nhật `ReturnOrder.status = 'APPROVED'`, ghi Outbox Event `RETURN_PICKUP_DISPATCHED`.
     - Xử lý callback bưu tá `handleCarrierPickedUp`: Chuyển trạng thái `Shipment` và `ReturnOrder` sang `IN_TRANSIT`, ghi Outbox Event `RMA_IN_TRANSIT`.

3. **Tiếp Nhận Kiện Hàng Hoàn Tại Tổng Kho (Warehouse Reverse Inbound) (EP14-T03):**
   - Xây dựng `ReceiveWarehouseReturnUseCase`:
     - Hỗ trợ nhân viên Tổng kho quét tiếp nhận linh hoạt: Quét UUID hồ sơ, mã RMA (`returnCode`), hoặc quét trực tiếp mã barcode vận đơn bưu tá (`trackingCode`).
     - Xử lý tương thích định dạng UUID an toàn trên PostgreSQL, tự động phân tách lookup theo UUID và trackingCode.
     - Thực thi Transaction ACID: Tạo biên bản tiếp nhận tại Tổng kho (`RCP-WH-YYYYMMDD-XXXX`).
     - Nhập hàng vào tồn kho cách ly KCS của Tổng kho (`quarantined_quantity` tăng, `available_quantity` không đổi).
     - Ghi nhật ký kho `inventory_transactions` (`RETURN_INBOUND`).
     - Cập nhật vận đơn thu hồi `Shipment.status = 'DELIVERED'` kèm thời điểm `deliveredAt`.
     - Cập nhật trạng thái `ReturnOrder` sang `RECEIVED`.
     - Ghi Outbox Event `RMA_RECEIVED_AT_WAREHOUSE`.

4. **Presentation Layer & Admin Endpoints:**
   - Xây dựng `AdminReturnController` (`/api/v1/admin/returns`):
     - `POST /api/v1/admin/returns/:id/receive-at-store`: Tiếp nhận tại quầy Showroom (bảo vệ bởi `LocationScopeGuard` & RBAC).
     - `POST /api/v1/admin/returns/:id/dispatch-pickup`: Phát lệnh bưu tá GHN thu hồi tận nhà.
     - `POST /api/v1/admin/returns/:id/receive-at-warehouse`: Tiếp nhận hàng hoàn tại Tổng kho.
     - `GET /api/v1/admin/returns`: Tra cứu danh sách hồ sơ RMA kèm bộ lọc đa năng và phân trang.
     - `GET /api/v1/admin/returns/:id`: Chi tiết hồ sơ RMA mở rộng đầy đủ các mối quan hệ (khách hàng, sản phẩm, vận đơn thu hồi, biên bản tiếp nhận).

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP14-T01  | Quy Trình Tiếp Nhận Hàng Hoàn Tại Cửa Hàng (Store Drop-off Workflow)     | Large (L)   | [IMPLEMENTED] |
| EP14-T02  | Tích Hợp Vận Chuyển Thu Gom Tận Nhà Với GHN Reverse Logistics            | Large (L)   | [IMPLEMENTED] |
| EP14-T03  | Tiếp Nhận Kiện Hàng Hoàn Tại Tổng Kho (Warehouse Reverse Inbound)        | Medium (M)  | [IMPLEMENTED] |
| PRESENT   | Admin Returns & Reverse Logistics Controller                             | Medium (M)  | [IMPLEMENTED] |
| FLOW      | Integrated Multi-Channel Reverse Logistics E2E Flow                      | Enterprise  | [IMPLEMENTED] |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks + Controller + E2E Suite                                         | Enterprise  | 5/5 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 / DES-08 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP14-T01** | 1. Kiểm tra mã RMA: Nếu trạng thái khác `SUBMITTED`/`APPROVED`/`AWAITING_RETURN` $\implies$ Chặn thao tác (HTTP 409 Conflict).<br>2. Lập phiếu `ReturnReceipt`, tăng `quarantined_quantity` trên bảng `inventory` tại đúng Showroom tiếp nhận.<br>3. **Tuyệt đối không tăng `available_quantity` bán lẻ**.<br>4. Đổi trạng thái RMA sang `RECEIVED`, phát sự kiện `RMA_RECEIVED_AT_STORE`. | - File Migration: `backend/prisma/migrations/20261117020000_add_return_receipts/migration.sql`.<br>- Use Case `ReceiveStoreDropoffUseCase` tại `receive-store-dropoff.use-case.ts`.<br>- Guards: `LocationScopeGuard` & `@LocationScoped({ resourceType: 'RETURN_ORDER' })`.<br>- Giao dịch ACID: Upsert `Inventory`, tăng `quantity` và `quarantinedQuantity`, tạo `inventoryTransaction`, ghi `outboxEvent`.<br>- Test suites: `receive-store-dropoff.use-case.spec.ts` (4/4 PASS), `location-scope.guard.spec.ts` (8/8 PASS). | **PASS** |
| **EP14-T02** | 1. Tạo vận đơn thu gom hàng đổi trả với thông tin lấy hàng từ địa chỉ của khách, thông tin trả hàng về Tổng kho.<br>2. Nhận `tracking_code` chiều thu hồi (mã `LADXXXXXX`) và link in phiếu thu gom.<br>3. Trạng thái RMA chuyển sang `IN_TRANSIT` khi bưu tá GHN quét mã bưu kiện thành công qua Webhook. | - Service `ReverseShippingService` tại `reverse-shipping.service.ts`.<br>- Tạo `Shipment` với `shipmentType = 'RETURN_PICKUP'`, `carrierCode = 'GHN'`, tracking code `LAD...`.<br>- Cập nhật `ReturnOrder.status = 'APPROVED'` và phát sự kiện `RETURN_PICKUP_DISPATCHED`.<br>- Webhook handler `handleCarrierPickedUp` cập nhật `IN_TRANSIT` và phát sự kiện `RMA_IN_TRANSIT`.<br>- Test suite: `reverse-shipping.service.spec.ts` (9/9 PASS). | **PASS** |
| **EP14-T03** | 1. Quét mã vận đơn thu gom $\implies$ Khớp đúng hồ sơ `ReturnOrder`.<br>2. Chuyển trạng thái `ReturnOrder` sang `RECEIVED`, cập nhật tồn kho vào `quarantined_quantity` của Tổng kho.<br>3. Kích hoạt thông báo cho đội ngũ KCS sẵn sàng kiểm định. | - Use Case `ReceiveWarehouseReturnUseCase` tại `receive-warehouse-return.use-case.ts`.<br>- Hỗ trợ quét mã bằng ID, `returnCode` hoặc `trackingCode` của bưu tá GHN.<br>- Tạo `ReturnReceipt` (`RCP-WH-...`), cập nhật kho cách ly, đánh dấu `Shipment.status = 'DELIVERED'`, ghi Outbox Event `RMA_RECEIVED_AT_WAREHOUSE`.<br>- Test suite: `receive-warehouse-return.use-case.spec.ts` (4/4 PASS). | **PASS** |
| **EP14-INT** | Kiểm thử tích hợp toàn vẹn cả 2 luồng E2E trên Neon PostgreSQL thực tế: Store Drop-off & GHN Return Pickup. | - File Test: `backend/src/modules/returns/__tests__/epic-14-integrated-flow.spec.ts`.<br>- Flow 1: Khách submit STORE_DROPOFF $\rightarrow$ Showroom nhận hàng $\rightarrow$ Quarantined tồn kho tăng, available không đổi $\rightarrow$ Outbox ghi nhận.<br>- Flow 2: Khách submit CARRIER_PICKUP $\rightarrow$ Admin dispatch GHN $\rightarrow$ Tracking LAD $\rightarrow$ Webhook quét IN_TRANSIT $\rightarrow$ Tổng kho nhận hàng quét barcode $\rightarrow$ Vận đơn DELIVERED $\rightarrow$ RMA RECEIVED.<br>- 6/6 tests PASS. | **PASS** |

---

## 3. Rà Soát Cơ Sở Dữ Liệu & Ràng Buộc Schema (Database & Migration Review)

Quá trình mở rộng cơ sở dữ liệu đã được thực thi và xác thực trên PostgreSQL Neon:

1. **Bảng `return_receipts`:**
   ```sql
   CREATE TABLE "return_receipts" (
       "id" UUID NOT NULL DEFAULT gen_random_uuid(),
       "receipt_code" VARCHAR(60) NOT NULL,
       "return_order_id" UUID NOT NULL,
       "location_id" UUID NOT NULL,
       "received_by" UUID,
       "received_items_count" INTEGER NOT NULL DEFAULT 0,
       "package_condition_note" TEXT,
       "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "return_receipts_pkey" PRIMARY KEY ("id"),
       CONSTRAINT "return_receipts_receipt_code_key" UNIQUE ("receipt_code"),
       CONSTRAINT "return_receipts_return_order_id_fkey" FOREIGN KEY ("return_order_id") REFERENCES "return_orders"("id") ON DELETE CASCADE,
       CONSTRAINT "return_receipts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "stores"("id") ON DELETE RESTRICT,
       CONSTRAINT "return_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL
   );
   CREATE INDEX "return_receipts_return_order_id_idx" ON "return_receipts"("return_order_id");
   CREATE INDEX "return_receipts_location_id_idx" ON "return_receipts"("location_id");
   ```

2. **Ràng Buộc Tồn Kho Quarantined Bất Biến (Formula Consistency):**
   - Cột `available_quantity` trong bảng `inventory` được tính toán tự động qua công thức STORED:
     $$\text{available\_quantity} = \text{quantity} - \text{reserved\_quantity} - \text{safety\_stock} - \text{quarantined\_quantity} - \text{damaged\_quantity}$$
   - Khi tiếp nhận hàng hoàn tại Showroom hoặc Tổng kho:
     - Hệ thống tăng đồng thời: `quantity += item.quantity` và `quarantinedQuantity += item.quantity`.
     - Hiệu ứng: $\Delta \text{available\_quantity} = (+N) - (+N) = 0$.
     - **Kết quả:** Tuyệt đối không làm tăng lượng hàng bán lẻ có sẵn, đáp ứng hoàn hảo tiêu chí AC3 và bảo đảm an toàn kho mỹ phẩm.

---

## 4. Báo Cáo Kiểm Thử Tự Động & Bằng Chứng Thực Thi (Automated Test Execution)

### 4.1 Chi Tiết Các Bộ Test Suites Của Epic 14

```
====================================================================================================
TEST SUITE                                                        TESTS   DURATION   RESULT
====================================================================================================
location-scope.guard.spec.ts (Mở rộng RETURN_ORDER)                 8       13.4s    PASS 100%
receive-store-dropoff.use-case.spec.ts (EP14-T01 Unit)              4       14.8s    PASS 100%
reverse-shipping.service.spec.ts (EP14-T02 Unit)                    9       24.3s    PASS 100%
receive-warehouse-return.use-case.spec.ts (EP14-T03 Unit)           4       15.0s    PASS 100%
admin-return.controller.spec.ts (Presentation Unit)                 6       12.3s    PASS 100%
epic-14-integrated-flow.spec.ts (E2E Integrated Lifecycle Flow)     6       35.9s    PASS 100%
----------------------------------------------------------------------------------------------------
TỔNG CỘNG EPIC 14 TEST CASES                                       37      115.7s   PASS 100%
====================================================================================================
```

### 4.2 Bằng Chứng Thực Thi Luồng Tích Hợp E2E (Epic 14 Integrated Flow Log)

```
PASS src/modules/returns/__tests__/epic-14-integrated-flow.spec.ts (35.946 s)
  EPIC 14 INTEGRATED FLOW: Multi-Channel Reverse Logistics (Store Drop-off & GHN Return Pickup)
    Flow 1: Showroom Store Drop-off Workflow (EP14-T01)
      √ Step 1: Khách hàng tạo yêu cầu hoàn trả mang đến showroom (STORE_DROPOFF) (2071 ms)
      √ Step 2: Nhân viên Showroom tiếp nhận sản phẩm tại quầy -> Quarantined Inventory & ReturnReceipt (2144 ms)
    Flow 2: GHN Reverse Pickup & Warehouse Inbound Workflow (EP14-T02 & EP14-T03)
      √ Step 1: Khách hàng tạo yêu cầu thu hồi tận nhà (CARRIER_PICKUP) (1810 ms)
      √ Step 2: Điều phối viên phát lệnh bưu tá GHN thu hồi (EP14-T02) -> Shipment RETURN_PICKUP (1276 ms)
      √ Step 3: Bưu tá GHN lấy hàng thành công -> Cập nhật IN_TRANSIT (852 ms)
      √ Step 4: Tổng kho tiếp nhận kiện hàng bằng quét mã barcode tracking (EP14-T03) -> Quarantined Inventory & ReturnReceipt (2412 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        36.337 s
```

---

## 5. Báo Cáo Chống Suy Thoái Hệ Thống (Zero Regression Verification)

Hệ thống đã thực hiện kiểm thử hồi quy đối với Epic 13 và các Epic nền tảng P0 trên PostgreSQL Neon:

1. **Epic 13 Regression Test:**
   - `epic-13-integrated-flow.spec.ts`: **5/5 tests PASS** (29.7s).
   - Toàn bộ 8 unit test suites của module `returns`: **54/54 tests PASS** (25.1s).
2. **P0 Core Regression Test:**
   - `epic-01-integrated-flow.spec.ts` (Location & Inventory ATP): **6/6 tests PASS** (23.2s).
   - `epic-03-integrated-flow.spec.ts` (OMS & Hybrid Routing Engine): **4/4 tests PASS** (114.8s).
   - `epic-04-integrated-flow.spec.ts` (Fulfillment & WMS Lifecycle): **1/1 test PASS** (11.2s).
   - `epic-05-integrated-flow.spec.ts` (Shipping Abstraction & Carrier Dispatch): **1/1 test PASS** (35.4s).
3. **Biên Dịch Toàn Dự Án (NestJS Build Verification):**
   - Lệnh: `npm run build` (`nest build`).
   - Kết quả: **Exit code 0** (0 errors, 0 warnings, bảo toàn 100% tính toàn vẹn kiểu dữ liệu TypeScript).

---

## 6. Trạng Thái Quyết Định Nghiệp Vụ & Sẵn Sàng Chuyển Tiếp

1. **Tuân Thủ Quyết Định DEC-05 (Skin Irritation Claim Manual Review):**
   - Hồ sơ RMA lý do kích ứng da (`ALLERGIC`) tiếp tục được bảo vệ nghiêm ngặt: Khi tiếp nhận hàng hoàn tại cửa hàng hoặc Tổng kho, trạng thái đơn chuyển sang `RECEIVED` và hàng hóa đi vào cách ly `quarantinedQuantity`. Hệ thống **tuyệt đối không tự động duyệt hoàn tiền hoặc tự động tái nhập kho** mà bảo lưu để Hội đồng y tế / KCS đánh giá thủ công tại Epic 15.
2. **Sẵn Sàng Cho EPIC 15 (QC Inspection & Inventory Disposition):**
   - Với việc hàng hoàn đã nằm chắc chắn trong vùng cách ly (`quarantinedQuantity`) tại các địa điểm cùng với biên bản tiếp nhận `return_receipts`, hệ thống đã sẵn sàng 100% để triển khai Epic 15: Kiểm định KCS (rách seal, hư hại bao bì, đo lường dung tích sử dụng) và ban hành quyết định xử lý tồn kho (`RESTOCK`, `SCRAP`, `RETURN_TO_CUSTOMER`).

---

> [!NOTE]
> **KẾT LUẬN NGHIỆM THU EPIC 14:**  
> Toàn bộ 3 nhiệm vụ kỹ thuật (`EP14-T01`, `EP14-T02`, `EP14-T03`), tầng Presentation và chu trình tích hợp E2E của **EPIC 14** đã được triển khai hoàn chỉnh, kiểm thử đạt chuẩn 100%, bảo toàn tuyệt đối kiến trúc P0 và P1. Trân trọng báo cáo Tech Lead / Product Owner nghiệm thu để tiếp tục thực hiện **EPIC 15**.
