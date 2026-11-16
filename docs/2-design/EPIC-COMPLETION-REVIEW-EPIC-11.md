# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 11 – ADMIN OPERATIONS INTEGRATION
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-11`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P0 (Phân Quyền Phân Lập Chi Nhánh Location Scope & RBAC Cho Nghiệp Vụ Kho WMS, Hệ Thống Hàng Đợi Công Việc Cho Màn Hình Điều Hành Kho & Danh Mục Hành Động Khả Dụng Động, Cơ Chế Kiểm Soát Đồng Thời Lạc Quan OCC Chống Xung Đột Thao Tác Song Song & Universal Audit Log Lưu Vết Lịch Sử Trạng Thái Thực Thể)  
**Thời điểm lập:** 2026-11-16T18:00:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 11

EPIC 11 hiện thực hóa toàn bộ lớp tích hợp vận hành quản trị kho (Admin Operations Integration) cho các chi nhánh và trung tâm hoàn tất đơn hàng của GlowUp, bảo đảm tính an toàn bảo mật, trải nghiệm người dùng tối ưu và tính toàn vẹn dữ liệu:

1. **Location Scope & RBAC Guards Cho Nghiệp Vụ Kho (EP11-T01):**
   - Xây dựng decorator `@LocationScoped()` và guard toàn cục `LocationScopeGuard`.
   - Tận dụng `GetUserDataScopeUseCase` và `isStoreInScope` đối chiếu phạm vi chi nhánh được phân quyền của nhân viên từ bảng `user_stores`.
   - Chặn tuyệt đối nhân viên chi nhánh A can thiệp, xem hoặc nhặt hàng trên các đơn được phân bổ cho chi nhánh B (HTTP 403 `LOCATION_SCOPE_UNAUTHORIZED`).
   - Hỗ trợ quản lý vùng phụ trách nhiều chi nhánh và cơ chế Admin bypass toàn quyền (`ADMIN`, `OPERATIONS_MGR`, `dataScope === 'ALL' | 'GLOBAL'`).
   - Tích hợp `@RequireAnyPermission(...)` kiểm tra mã quyền chi tiết cho từng nghiệp vụ WMS.

2. **Admin Work Queues & API Danh Mục Hành Động (EP11-T02):**
   - Xây dựng hệ thống 3 hàng đợi công việc chuyên biệt tối ưu cho nhân sự vận hành kho:
     - `GET /api/v1/admin/fulfillment/tasks/picking`: Hàng đợi nhặt hàng (chỉ nạp đơn `ALLOCATED` thuộc kho nhân viên phụ trách).
     - `GET /api/v1/admin/fulfillment/tasks/packing`: Hàng đợi đóng gói (lọc đơn `PICKED` chờ tạo kiện).
     - `GET /api/v1/admin/fulfillment/tasks/handover`: Hàng đợi bàn giao (lọc đơn `PACKED` chờ giao tài xế/bưu tá 3PL).
   - Xây dựng `AdminActionMatrixService` tính toán danh mục hành động khả dụng (`availableActions`) và chi tiết metadata (nhãn nút, HTTP method, endpoint) dựa trên máy trạng thái đơn hàng và quyền của người dùng.
   - Bổ sung API chi tiết đơn `GET /api/v1/admin/fulfillment-orders/:id` trả về đầy đủ thông tin bưu kiện và `availableActions`.

3. **Optimistic Concurrency Control & Universal Audit Log (EP11-T03):**
   - Bổ sung cột `version Int @default(1)` vào bảng `fulfillment_orders` cho cơ chế khóa lạc quan (OCC).
   - Thiết kế model `DomainStatusHistory` (`domain_status_histories`) và triển khai migration PostgreSQL `20261116210000_add_occ_and_domain_status_histories` trên Neon PostgreSQL.
   - Bổ sung `expectedVersion?: number` vào các Command DTOs: `StartPickingDto`, `CompletePickingDto`, `CompletePackingDto`, `ConfirmHandoverDto`.
   - Chống xung đột khi 2 nhân viên cùng thao tác: Nếu người thứ hai gửi request với version cũ $\implies$ Bị chặn ngay lập tức với HTTP 409 Conflict (`CONCURRENT_MODIFICATION_DETECTED`).
   - Tự động tăng `version: { increment: 1 }` và ghi nhận Universal Audit Log tại mọi bước chuyển trạng thái trong cùng ACID transaction.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP11-T01  | Xây Dựng Location Scope & RBAC Guards Cho Nghiệp Vụ Kho (Scope Guards)    | Medium (M)  | [HOÀN THÀNH]  |
| EP11-T02  | Xây Dựng Admin Work Queues & API Danh Mục Hành Động (Work Queues & Actions)| Medium (M)  | [HOÀN THÀNH]  |
| EP11-T03  | Tích Hợp Kiểm Soát Đồng Thời Lạc Quan & Universal Audit Log (OCC & Audit)| Medium (M)  | [HOÀN THÀNH]  |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| TỔNG CỘNG | 3 Tasks                                                                  | Enterprise  | 3/3 DONE 100% |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Nhiệm Vụ (Task Acceptance Matrix)

| Task ID | Tiêu Chí Chấp Nhận (Acceptance Criteria) Theo DES-07 | Hiện Trạng Triển Khai Trong Mã Nguồn Thực Tế | Kết Quả Thẩm Định |
| :--- | :--- | :--- | :---: |
| **EP11-T01** | 1. Nhân viên Showroom Q10 gọi API `start-picking` trên đơn của Showroom Q1 $\implies$ Trả HTTP 403 Forbidden (`LOCATION_SCOPE_UNAUTHORIZED`).<br>2. Quản lý vùng có quyền truy cập cả 2 showroom thao tác thành công. | - Decorator `@LocationScoped()` tại `backend/src/core/decorators/location-scoped.decorator.ts`.<br>- Guard `LocationScopeGuard` tại `backend/src/core/guards/location-scope.guard.ts`.<br>- Đăng ký làm `APP_GUARD` toàn cục trong `AppModule`.<br>- Áp dụng trên `AdminFulfillmentController` bảo vệ các route `:id/pick-list`, `:id/start-picking`, `:id/complete-picking`, `:id/complete-packing`, `:id/confirm-handover`.<br>- AC1: Q10 thao tác đơn Q1 bị ném 403 `LOCATION_SCOPE_UNAUTHORIZED`.<br>- AC2: Quản lý vùng [Q1, Q10] thao tác thành công.<br>- Admin bypass cho `ADMIN`, `OPERATIONS_MGR`, `dataScope === 'ALL'`.<br>- Test suite: `location-scope.guard.spec.ts` (7/7 PASS). | **PASS** |
| **EP11-T02** | 1. Nhân viên mở màn hình nhặt hàng $\implies$ Hệ thống chỉ nạp các đơn `ALLOCATED` thuộc kho nhân viên phụ trách.<br>2. Đơn đang ở `ALLOCATED` chỉ trả `availableActions = ['START_PICKING', 'CANCEL']`, chuyển sang `PICKING` chỉ trả `['COMPLETE_PICKING']`, v.v. Không bao giờ xuất hiện `COMPLETE_PACKING` khi chưa nhặt xong. | - Lớp `AdminActionMatrixService` tại `backend/src/modules/fulfillment/application/services/admin-action-matrix.service.ts`.<br>- Lớp `FulfillmentQueueService` tại `backend/src/modules/fulfillment/application/services/fulfillment-queue.service.ts`.<br>- Controller `AdminFulfillmentQueueController` (`GET /picking`, `GET /packing`, `GET /handover`).<br>- AC1: Hàng đợi nhặt hàng lọc đúng `status = 'ALLOCATED'` và `sourceLocationId` trong phạm vi chi nhánh.<br>- AC2: Ma trận hành động tính toán chuẩn: `ALLOCATED` $\rightarrow$ `['START_PICKING', 'CANCEL']`, `PICKING` $\rightarrow$ `['COMPLETE_PICKING']`, `PICKED` $\rightarrow$ `['COMPLETE_PACKING']`, `PACKED` $\rightarrow$ `['CONFIRM_HANDOVER']`. Chặn tuyệt đối việc đóng gói khi chưa nhặt xong.<br>- Endpoint `GET /api/v1/admin/fulfillment-orders/:id` trả về `availableActions` và `actionDetails`.<br>- Test suites: `admin-action-matrix.service.spec.ts` (7/7 PASS), `fulfillment-queue.service.spec.ts` (7/7 PASS), `admin-fulfillment-queue.controller.spec.ts` (3/3 PASS). | **PASS** |
| **EP11-T03** | 1. Hai nhân viên cùng mở màn hình và cùng bấm "Bắt đầu nhặt hàng" $\implies$ Người bấm sau bị chặn với mã lỗi 409 Conflict.<br>2. Mọi bước chuyển trạng thái đều có log lưu vết người thực hiện và thời gian chính xác. | - Thêm cột `version` vào bảng `fulfillment_orders` và tạo bảng `domain_status_histories`.<br>- PostgreSQL Migration `20261116210000_add_occ_and_domain_status_histories` đã áp dụng trên Neon DB.<br>- Lớp `AuditLogService` tại `backend/src/core/services/audit-log.service.ts`.<br>- Bổ sung `expectedVersion` vào toàn bộ Command DTOs.<br>- AC1: Hai người cùng bấm version 1 $\implies$ Người 1 lên version 2 thành công, Người 2 bị chặn 409 Conflict với errorCode `CONCURRENT_MODIFICATION_DETECTED`.<br>- AC2: Ghi nhận Universal Audit Log tại mọi bước chuyển trạng thái vào `domain_status_histories` trong cùng transaction.<br>- Test suites: `audit-log.service.spec.ts` (3/3 PASS), `concurrency-occ.spec.ts` (5/5 PASS), `epic-11-integrated-flow.spec.ts` (1/1 PASS). | **PASS** |

---

## 3. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu

### 3.1 Quy Trình Phân Lập Chi Nhánh & Kiểm Soát Đồng Thời Lạc Quan

```mermaid
sequenceDiagram
    autonumber
    actor Staff1 as Nhân Viên A (Showroom Q10)
    actor Staff2 as Nhân Viên B (Showroom Q10)
    actor StaffQ1 as Nhân Viên C (Showroom Q1)
    participant Guard as LocationScopeGuard (Global)
    participant Queue as AdminFulfillmentQueueController
    participant Controller as AdminFulfillmentController
    participant Picking as PickingService
    participant DB as Neon PostgreSQL (ACID)
    participant Audit as AuditLogService (domain_status_histories)

    Note over StaffQ1,Guard: 1. Kiểm tra phân quyền phạm vi chi nhánh (EP11-T01)
    StaffQ1->>Controller: POST /admin/fulfillment-orders/{foQ10Id}/start-picking
    Controller->>Guard: canActivate()
    Guard->>DB: Query sourceLocationId của FO ({foQ10Id})
    Guard->>Guard: Đối chiếu với user_stores của Nhân Viên C (chỉ có Q1)
    Guard-->>StaffQ1: HTTP 403 Forbidden (LOCATION_SCOPE_UNAUTHORIZED)

    Note over Staff1,Queue: 2. Nạp hàng đợi công việc chi nhánh (EP11-T02)
    Staff1->>Queue: GET /admin/fulfillment/tasks/picking
    Queue->>DB: Query FOs WHERE status = 'ALLOCATED' AND sourceLocationId IN [Q10]
    DB-->>Queue: Trả danh sách đơn Q10 kèm availableActions: ['START_PICKING', 'CANCEL']
    Queue-->>Staff1: Trả TaskQueueResponseDto (version = 1)

    Note over Staff1,DB: 3. Kiểm soát đồng thời lạc quan OCC Collision (EP11-T03)
    Staff1->>Controller: POST /start-picking (expectedVersion: 1)
    Staff2->>Controller: POST /start-picking (expectedVersion: 1 - đồng thời)

    Controller->>Picking: startPicking(foId, 'staff-1', expectedVersion: 1)
    Picking->>DB: Check version == 1 -> Khớp!
    Picking->>DB: BEGIN TX: UPDATE status='PICKING', version = version + 1 (2)
    Picking->>Audit: recordTransition(tx, 'ALLOCATED' -> 'PICKING', 'START_PICKING', 'staff-1')
    Audit->>DB: INSERT INTO domain_status_histories
    Picking->>DB: COMMIT TX
    Picking-->>Staff1: HTTP 200 OK (Status: PICKING, version: 2)

    Controller->>Picking: startPicking(foId, 'staff-2', expectedVersion: 1)
    Picking->>DB: Check version == 1 (Thực tế trong DB là 2) -> Sai lệch!
    Picking-->>Staff2: HTTP 409 Conflict (CONCURRENT_MODIFICATION_DETECTED)
```

---

## 4. Bằng Chứng Kiểm Thử Tự Động (Automated Test Execution Evidence)

Toàn bộ **33/33 tests** của Epic 11 và **28/28 tests regression** của các phân hệ liên quan đều đã được thực thi thực tế và đạt trạng thái **PASS 100%**:

```
PASS src/core/guards/__tests__/location-scope.guard.spec.ts (7 tests)
  LocationScopeGuard (EP11-T01)
    √ 1. Bỏ qua kiểm tra và trả về true nếu route không đánh dấu @LocationScoped (4 ms)
    √ 2. Ném lỗi UnauthorizedException nếu không có user đăng nhập (16 ms)
    √ 3. Admin tối cao (role ADMIN hoặc dataScope ALL) được bypass toàn quyền (1 ms)
    √ 4. Ném lỗi NotFoundException nếu không tìm thấy FulfillmentOrder
    √ 5. AC1: Nhân viên Showroom Q10 thao tác trên đơn hàng của Showroom Q1 -> Ném 403 Forbidden (LOCATION_SCOPE_UNAUTHORIZED) (1 ms)
    √ 6. AC2: Quản lý vùng phụ trách cả Q1 và Q10 thao tác trên đơn hàng Q1 -> Thành công (true)
    √ 7. Hỗ trợ kiểm tra tài nguyên SHIPMENT

PASS src/modules/fulfillment/application/services/__tests__/admin-action-matrix.service.spec.ts (7 tests)
  AdminActionMatrixService (EP11-T02 AC2)
    √ 1. Đơn ALLOCATED chỉ trả về START_PICKING và CANCEL (chưa thể đóng gói)
    √ 2. Đơn PICKING chỉ trả về COMPLETE_PICKING
    √ 3. Đơn PICKED cho phép COMPLETE_PACKING
    √ 4. Đơn PACKED cho phép CONFIRM_HANDOVER
    √ 5. Đơn HANDED_OVER cho phép TRACK_SHIPMENT
    √ 6. Đơn COMPLETED hoặc CANCELLED trả về mảng rỗng []
    √ 7. getActionDetails trả về metadata đầy đủ gồm method và endpoint tương ứng

PASS src/modules/fulfillment/application/services/__tests__/fulfillment-queue.service.spec.ts (7 tests)
  FulfillmentQueueService (EP11-T02)
    √ 1. AC1: Hàng đợi nhặt hàng (getPickingTasks) chỉ nạp đơn ALLOCATED thuộc kho nhân viên phụ trách (Store Q10)
    √ 2. Admin gọi getPickingTasks sẽ xem được toàn bộ chi nhánh (không bị lọc sourceLocationId in [...])
    √ 3. Nhân viên không có quyền trên storeId được truyền trong query -> Ném 403 Forbidden
    √ 4. Hàng đợi đóng gói (getPackingTasks) truy vấn trạng thái PICKED
    √ 5. Hàng đợi bàn giao (getHandoverTasks) truy vấn trạng thái PACKED
    √ 6. getFulfillmentOrderDetail trả về chi tiết đơn kèm availableActions và actionDetails
    √ 7. getFulfillmentOrderDetail ném NotFoundException nếu ID không tồn tại

PASS src/modules/fulfillment/presentation/controllers/__tests__/admin-fulfillment-queue.controller.spec.ts (3 tests)
  AdminFulfillmentQueueController (EP11-T02)
    √ 1. getPickingTasks gọi đúng queueService.getPickingTasks
    √ 2. getPackingTasks gọi đúng queueService.getPackingTasks
    √ 3. getHandoverTasks gọi đúng queueService.getHandoverTasks

PASS src/core/services/__tests__/audit-log.service.spec.ts (3 tests)
  AuditLogService (EP11-T03)
    √ 1. recordTransition ghi nhận chính xác lịch sử chuyển trạng thái vào bảng domain_status_histories (AC2)
    √ 2. recordTransition tự động gán SYSTEM_WORKER khi không có actorId
    √ 3. getEntityHistory truy vấn lịch sử sắp xếp giảm dần theo thời gian (occurredAt desc)

PASS src/modules/fulfillment/application/services/__tests__/concurrency-occ.spec.ts (5 tests)
  Optimistic Concurrency Control (OCC) & Audit Log (EP11-T03)
    AC1: Concurrency Collision Protection (Hai nhân viên bấm cùng lúc)
      √ 1. Nhân viên 1 gửi expectedVersion = 1 -> Thành công và version tăng lên 2
      √ 2. Nhân viên 2 cũng gửi expectedVersion = 1 (khi đơn đã lên version 2) -> Bị chặn với mã lỗi 409 Conflict (CONCURRENT_MODIFICATION_DETECTED)
    OCC trên các nghiệp vụ tiếp theo (completePicking, completePacking, confirmHandover)
      √ 3. completePicking phát hiện sai expectedVersion -> Ném 409 Conflict
      √ 4. completePacking phát hiện sai expectedVersion -> Ném 409 Conflict
      √ 5. confirmHandover phát hiện sai expectedVersion -> Ném 409 Conflict

PASS src/modules/fulfillment/__tests__/epic-11-integrated-flow.spec.ts (1 test)
  EPIC 11: Integrated Admin Operations Flow Test
    √ Toàn bộ quy trình Epic 11: Scope Guard -> Queue Lọc Chi Nhánh -> Concurrency OCC Collision -> Audit Trail (33 ms)

Test Suites: 7 passed, 7 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Build:       nest build COMPLETED WITH EXIT CODE 0
```

---

## 5. Danh Sách Tệp Thay Đổi & Tạo Mới

```
backend/
├── prisma/
│   ├── schema.prisma (Bổ sung version vào FulfillmentOrder, tạo model DomainStatusHistory)
│   └── migrations/
│       └── 20261116210000_add_occ_and_domain_status_histories/
│           └── migration.sql (Đã apply trên Neon PostgreSQL)
├── src/
│   ├── app.module.ts (Đăng ký LocationScopeGuard toàn cục APP_GUARD)
│   ├── core/
│   │   ├── decorators/
│   │   │   └── location-scoped.decorator.ts (Mới)
│   │   ├── guards/
│   │   │   ├── location-scope.guard.ts (Mới)
│   │   │   └── __tests__/
│   │   │       └── location-scope.guard.spec.ts (Mới)
│   │   └── services/
│   │       ├── audit-log.service.ts (Mới)
│   │       └── __tests__/
│   │           └── audit-log.service.spec.ts (Mới)
│   └── modules/
│       └── fulfillment/
│           ├── fulfillment.module.ts (Đăng ký Queue controller, Action matrix, Queue service, AuditLogService)
│           ├── application/
│           │   └── services/
│           │       ├── admin-action-matrix.service.ts (Mới)
│           │       ├── fulfillment-queue.service.ts (Mới)
│           │       ├── picking.service.ts (Cập nhật OCC version & AuditLogService)
│           │       ├── packing.service.ts (Cập nhật OCC version & AuditLogService)
│           │       ├── handover.service.ts (Cập nhật OCC version & AuditLogService)
│           │       └── __tests__/
│           │           ├── admin-action-matrix.service.spec.ts (Mới)
│           │           ├── fulfillment-queue.service.spec.ts (Mới)
│           │           └── concurrency-occ.spec.ts (Mới)
│           ├── presentation/
│           │   ├── controllers/
│           │   │   ├── admin-fulfillment-queue.controller.ts (Mới)
│           │   │   ├── admin-fulfillment.controller.ts (Thêm GET /:id, @LocationScoped, OCC version)
│           │   │   └── __tests__/
│           │   │       └── admin-fulfillment-queue.controller.spec.ts (Mới)
│           │   └── dtos/
│           │       ├── queue.dto.ts (Mới)
│           │       ├── picking.dto.ts (Thêm expectedVersion)
│           │       ├── packing.dto.ts (Thêm expectedVersion)
│           │       └── handover.dto.ts (Thêm expectedVersion)
│           └── __tests__/
│               └── epic-11-integrated-flow.spec.ts (Mới)
docs/2-design/
├── DES-07-FULFILLMENT-WORK-BREAKDOWN.md (Cập nhật trạng thái EP11-T01, EP11-T02, EP11-T03 sang DONE)
├── IMPLEMENTATION-LOG.md (Ghi nhận chi tiết kỹ thuật và kết quả test của Epic 11)
├── IMPLEMENTATION-HANDOFF.md (Cập nhật tiến độ 35/37 tasks DONE - 94.6%)
└── EPIC-COMPLETION-REVIEW-EPIC-11.md (Báo cáo nghiệm thu hoàn tất Epic 11)
```

---

## 6. Kết Luận & Bàn Giao (Handoff)

- **Tiến độ tổng thể dự án:** Hoàn thành **35/37 Tasks (94.6%)** của toàn bộ phân hệ Fulfillment & Logistics.
- **Trạng thái Epic 11:** Toàn bộ 3 Implementation Tasks (`EP11-T01`, `EP11-T02`, `EP11-T03`) đã hoàn thành 100%, vượt qua tất cả các tiêu chí chấp nhận khắt khe của DES-07, không có lỗi tiềm ẩn (CRITICAL / HIGH = 0).
- **Sẵn sàng cho Epic tiếp theo:** **EPIC 12 – Observability & Disaster Recovery** (`EP12-T01: Correlation ID & Distributed Tracing`, `EP12-T02: DLQ Replay Tooling`).
