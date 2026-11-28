# BÁO CÁO NGHIỆM THU HOÀN THÀNH EPIC: EPIC 16 – PARTIAL REFUND ALLOCATION & GATEWAY SETTLEMENT ENGINE
**Mã tài liệu:** `EPIC-COMPLETION-REVIEW-EPIC-16`  
**Dự án:** GlowUp Omnichannel Cosmetics Retail Platform  
**Trọng tâm:** Giai đoạn P1 (Động Cơ Phân Bổ Tiền Hoàn Thực Trả Từng Phần, Lưu Vết Dòng Tiền Từng Mặt Hàng, Khấu Trừ Phí Vận Chuyển Thu Hồi DEC-04, Cơ Chế Chống Hoàn Trùng / Vượt Hạn Mức, Khôi Phục Điểm Thưởng Tích Lũy, Tích Hợp Cổng Thanh Toán Hoàn Tiền Tự Động Với Khả Năng Chịu Lỗi Mạng TC-RMA-11 & Idempotency TC-RMA-12)  
**Thời điểm lập:** 2026-11-17T13:05:00+07:00  
**Người thực hiện:** Senior Backend Architect / Technical Lead  
**Tài liệu đối chiếu:** `DES-05 v3.1-ENTERPRISE`, `DES-06 v2.0-ENTERPRISE`, `DES-07-FULFILLMENT-WORK-BREAKDOWN`, `DES-08-P1-P2-IMPLEMENTATION-ROADMAP`  
**Trạng thái thẩm định:** `PASS` (100% Acceptance Criteria Đạt Chuẩn - 132/132 Returns Tests Pass, Zero P0 Regressions, 100% Type-Safe Production Build)

---

## 1. Epic Scope & Danh Sách Tasks Thuộc Epic 16

EPIC 16 hoàn thiện tầng nghiệp vụ quyết toán tài chính, phân bổ tiền hoàn và giải ngân hoàn tiền cho toàn bộ hệ thống bán lẻ đa kênh GlowUp:

1. **Xây Dựng Thuật Toán Phân Bổ Tiền Hoàn Thực Trả (RefundCalculatorService) (EP16-T01):**
   - Triển khai công thức phân bổ chiết khấu Voucher đơn hàng và Điểm thưởng tích lũy theo tỷ lệ giá trị niêm yết đóng góp của từng món hàng trong đơn gốc (TC-RMA-17, AC1):
     $$\text{itemRatio} = \frac{\text{lineSubtotal}}{\text{orderSubtotal}}$$
     $$\text{lineVoucherDiscount} = \text{round}(\text{orderDiscountAmount} \times \text{itemRatio})$$
     $$\text{lineNetCash} = \max(0, \text{lineSubtotal} - \text{lineVoucherDiscount} - \text{linePointsDiscountVnd})$$
   - **Bảo toàn bất biến tài chính (Financial Invariants):**
     - $\text{TotalRefundCash} \le \text{TotalCapturedCash}$ (Tổng tiền hoàn tiền mặt không bao giờ vượt quá số tiền thực tế khách đã thanh toán) (AC2).
     - $\text{PointsToRestore} \le \text{TotalPointsUsed}$ (Số điểm tích lũy khôi phục không bao giờ vượt quá số điểm khách đã tiêu) (AC3).
   - **Khấu trừ chi phí vận chuyển thu hồi theo quyết định DEC-04 (TC-RMA-17, AC4):**
     - Trả hàng do khách đổi ý (`CHANGE_OF_MIND`) qua bưu tá lấy tận nhà (`CARRIER_PICKUP`): Khấu trừ 25.000đ vào tổng số tiền hoàn tiền mặt.
     - Trả hàng tại quầy Showroom (`STORE_DROPOFF`) hoặc các lý do do lỗi sản phẩm / vận chuyển / kích ứng da (`DEC-05`): Miễn phí thu hồi 0đ.
   - Hỗ trợ làm tròn số nguyên tiền Việt Nam Đồng (VND).

2. **Mở Rộng Schema Lệnh Hoàn Tiền Chi Tiết Từng Dòng (RefundItem & RefundExecutionService) (EP16-T02):**
   - **Migration CSDL PostgreSQL:** `20261117040000_add_refund_items` tạo bảng `refund_items` (`id`, `refund_id`, `order_item_id`, `return_item_id`, `quantity`, `amount`, `points_restored`, `created_at`, `updated_at`).
   - Check constraints: `chk_refund_items_quantity_positive`, `chk_refund_items_amount_non_negative`, `chk_refund_items_points_non_negative`.
   - Indexes: `idx_refund_items_refund`, `idx_refund_items_order_item`, `idx_refund_items_return_item`.
   - **Dịch vụ `RefundExecutionService`:**
     - **Cơ chế chống hoàn trùng / vượt hạn mức (Anti-duplication protection, AC1):** Truy vấn toàn bộ lịch sử `refund_items` của từng `order_item_id`. Nếu đã hoàn đủ số lượng (`alreadyRefundedQty >= orderItem.quantity`) hoặc đã hoàn đủ tiền (`alreadyRefundedAmount >= orderItem.totalPrice`) $\implies$ Ném lỗi `BadRequestException` từ chối khởi tạo refund thứ hai.
     - Chỉ tạo hoàn tiền cho các món đạt chuẩn KCS (`inspectionStatus = 'PASSED'`).
     - Phương thức `previewRefundForReturn(returnOrderId, deductedShippingFee)` hỗ trợ tính trước (Preview / Quote).
     - Khởi tạo lệnh hoàn tiền ở trạng thái `PENDING`.

3. **Tích Hợp Cổng Thanh Toán Hoàn Tiền Tự Động (PaymentRefundGatewayService & Adapter) (EP16-T03):**
   - **Adapter `PaymentRefundGatewayAdapter`:** Giao tiếp cổng thanh toán trực tuyến (VNPay / MoMo / SePay) hoặc tạo phiếu ủy nhiệm chi ngân hàng / đối soát tiền mặt tại Showroom.
   - **Dịch vụ `PaymentRefundGatewayService`:**
     - `approveRefund(refundId, approverUserId, note)`: Phê duyệt lệnh hoàn tiền trước khi phát lệnh chuyển tiền (`PENDING` $\implies$ `APPROVED`).
     - `executeRefund(refundId, operatorUserId, idempotencyKey)`: Kích hoạt chuyển tiền tự động.
     - **Bảo vệ Idempotency (TC-RMA-12, AC1):** Gửi kèm `idempotencyKey`; nếu `refund.status === 'COMPLETED'`, lập tức trả về giao dịch hiện tại mà không tái gọi cổng thanh toán.
     - **Xử lý sự cố mạng & lỗi 5xx an toàn (TC-RMA-11, AC2):** Nếu cổng thanh toán gặp lỗi timeout (504) hoặc chối từ giao dịch $\implies$ Giữ trạng thái `refund.status = 'PROCESSING'`, không ném lỗi unhandled 500 hay làm crash tiến trình worker, giúp điều phối viên đối soát an toàn.
     - **Cập nhật Transaction ACID (AC3):**
       - Cập nhật `Refund.status = 'COMPLETED'`, lưu `refundTransactionId`.
       - Khôi phục điểm thưởng tích lũy vào ví khách hàng (`Customer.totalPoints`).
       - Ghi nhật ký lịch sử điểm thưởng `LoyaltyPointsTransaction` loại `REFUND_RESTORE`.
       - Cập nhật trạng thái hồ sơ đổi trả `ReturnOrder.status = 'COMPLETED'`.
       - Ghi nhật ký trạng thái `ReturnStatusHistory`.
       - Phát sinh sự kiện Transactional Outbox `REFUND_COMPLETED`.

4. **Presentation Layer & Admin Endpoints:**
   - Cập nhật `AdminReturnController`:
     - `POST /api/v1/admin/returns/:id/calculate-refund`: Tính thử số tiền hoàn và điểm khôi phục.
     - `POST /api/v1/admin/returns/:id/create-refund`: Khởi tạo lệnh hoàn tiền chi tiết từng dòng.
     - `GET /api/v1/admin/returns/refunds/:refundId`: Xem chi tiết lệnh hoàn tiền và các dòng sản phẩm liên quan.
     - `POST /api/v1/admin/returns/refunds/:refundId/approve`: Phê duyệt lệnh hoàn tiền.
     - `POST /api/v1/admin/returns/refunds/:refundId/execute`: Giải ngân hoàn tiền qua cổng thanh toán / tiền mặt.

```
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| Task ID   | Tên Nhiệm Vụ                                                             | Độ Phức Tạp | Trạng Thái    |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
| EP16-T01  | Xây Dựng Thuật Toán Phân Bổ Tiền Hoàn Thực Trả (RefundCalculatorService) | Large (L)   | [IMPLEMENTED] |
| EP16-T02  | Mở Rộng Schema Lệnh Hoàn Tiền Chi Tiết Từng Dòng (RefundExecutionService)| Medium (M)  | [IMPLEMENTED] |
| EP16-T03  | Tích Hợp Cổng Thanh Toán Hoàn Tiền Tự Động (PaymentRefundGatewayService)  | Large (L)   | [IMPLEMENTED] |
| PRESENT   | Admin Endpoints Phân Bổ, Khởi Tạo, Duyệt & Giải Ngân Hoàn Tiền          | Medium (M)  | [IMPLEMENTED] |
| INTEGRATE | Epic 16 End-to-End Partial Refund Allocation & Settlement Flow           | Large (L)   | [IMPLEMENTED] |
+-----------+--------------------------------------------------------------------------+-------------+---------------+
```

---

## 2. Ma Trận Nghiệm Thu Acceptance Criteria Chi Tiết

| Nhiệm Vụ | Yêu Cầu Kỹ Thuật / Acceptance Criteria (AC) | Kết Quả Thực Tế Codebase | Trạng Thái |
| :--- | :--- | :--- | :--- |
| **EP16-T01** | **AC1 (TC-RMA-17):** Phân bổ đều voucher giảm giá đơn hàng theo tỷ lệ: Đơn 1M voucher 100k, món 200k hoàn đúng 180.000đ. | `RefundCalculatorService.calculateRefund` tính đúng `voucherAlloc = 20k`, hoàn ròng `180.000đ`. | **PASS** |
| **EP16-T01** | **AC2:** Bất biến tài chính tiền mặt: $\text{TotalRefundCash} \le \text{TotalCapturedCash}$. | Thuật toán kiểm tra và chặn trường hợp tổng tiền hoàn vượt mức thanh toán thực tế của đơn. | **PASS** |
| **EP16-T01** | **AC3:** Bất biến điểm thưởng: Số điểm khôi phục $\le$ số điểm thực tế đã tiêu. | Tỷ lệ điểm phân bổ chính xác theo từng sản phẩm, kiểm tra không vượt tổng `loyaltyPointsUsed`. | **PASS** |
| **EP16-T01** | **AC4 (DEC-04):** Khấu trừ 25.000đ phí thu hồi cho `CHANGE_OF_MIND` qua `CARRIER_PICKUP`; miễn phí 0đ cho `STORE_DROPOFF` hoặc lỗi sản phẩm. | `RefundCalculatorService` khấu trừ đúng 25.000đ khi trả hàng tận nhà do đổi ý, giữ nguyên 0đ cho Showroom và lỗi kỹ thuật. | **PASS** |
| **EP16-T02** | **AC1:** Chống hoàn trùng: Chặn tạo lệnh hoàn tiền thứ 2 cho cùng 1 món đã hoàn đủ tiền/số lượng. | `RefundExecutionService.createRefundForReturn` ném `BadRequestException` khi sản phẩm đã được hoàn đủ. | **PASS** |
| **EP16-T02** | **AC2:** Khóa ngoại và ràng buộc toàn vẹn bảng `refund_items` với `refunds`, `order_items`, `return_order_items`. | Schema Prisma và Migration `chk_refund_items_*` thực thi ràng buộc chặt chẽ. | **PASS** |
| **EP16-T03** | **AC1 (TC-RMA-12):** Bảo vệ Idempotency: Click đúp hoặc gọi lại `executeRefund` không gọi cổng 2 lần. | `PaymentRefundGatewayService.executeRefund` kiểm tra `refund.status === 'COMPLETED'`, trả về kết quả cũ ngay lập tức. | **PASS** |
| **EP16-T03** | **AC2 (TC-RMA-11):** Xử lý lỗi mạng/504 an toàn: Giữ trạng thái `PROCESSING`, không crash hệ thống. | `PaymentRefundGatewayService.executeRefund` bắt lỗi mạng, cập nhật `PROCESSING`, ghi log lỗi chi tiết. | **PASS** |
| **EP16-T03** | **AC3:** Cập nhật trạng thái ACID: Khôi phục điểm ví khách hàng, chuyển `ReturnOrder` sang `COMPLETED`, phát Outbox `REFUND_COMPLETED`. | Transaction ACID cập nhật `Customer.totalPoints`, tạo `LoyaltyPointsTransaction`, cập nhật `ReturnOrder.status = 'COMPLETED'`, tạo Outbox `REFUND_COMPLETED`. | **PASS** |

---

## 3. Bằng Chứng Thực Thi Kiểm Thử Tự Động (Test Coverage & Evidence)

Toàn bộ 5 bộ kiểm thử tự động của Epic 16 đã được thực thi và vượt qua 100%:

```
PASS src/modules/returns/infrastructure/__tests__/refund-items.migration.spec.ts (5/5 tests PASS)
  EP16-T02: RefundItems Migration & Constraint Tests
    √ 1. should enforce positive quantity constraint on refund_items
    √ 2. should enforce non-negative amount constraint on refund_items
    √ 3. should enforce non-negative points_restored constraint on refund_items
    √ 4. should cascade delete refund_items when refund is deleted
    √ 5. should support querying refund items by order_item_id and return_item_id

PASS src/modules/returns/application/services/__tests__/refund-calculator.service.spec.ts (9/9 tests PASS)
  EP16-T01: RefundCalculatorService Unit Tests
    √ 1. should calculate proportional refund for voucher discount accurately (TC-RMA-17, AC1)
    √ 2. should deduct return shipping fee for CHANGE_OF_MIND via CARRIER_PICKUP (DEC-04, AC4)
    √ 3. should NOT deduct return shipping fee for STORE_DROPOFF even for CHANGE_OF_MIND
    √ 4. should NOT deduct return shipping fee for ALLERGIC (DEC-05) or DEFECTIVE reasons
    √ 5. should restore proportional loyalty points when loyalty points were used (AC3)
    √ 6. should handle partial quantity refund correctly
    √ 7. should enforce Financial Invariant: Gross refund cannot exceed order total amount (AC2)
    √ 8. should throw BadRequestException when requested quantity exceeds item quantity
    √ 9. should throw BadRequestException when item does not belong to order

PASS src/modules/returns/application/services/__tests__/refund-execution.service.spec.ts (6/6 tests PASS)
  EP16-T02: RefundExecutionService Unit Tests
    √ 1. should create refund and refund_items successfully for PASSED return items
    √ 2. should reject refund creation if ReturnOrder status is not RESOLUTION_PENDING or INSPECTING
    √ 3. should reject refund creation if no items are PASSED
    √ 4. should prevent duplicate refund creation if items already fully refunded (AC1)
    √ 5. should preview refund breakdown correctly via previewRefundForReturn
    √ 6. should throw NotFoundException when return order does not exist

PASS src/modules/returns/application/services/__tests__/payment-refund-gateway.service.spec.ts (7/7 tests PASS)
  EP16-T03: PaymentRefundGatewayService Unit Tests
    √ 1. should execute refund successfully and restore points (AC1, AC3)
    √ 2. should be idempotent: returns existing completed refund without re-calling gateway (TC-RMA-12, AC1)
    √ 3. should handle gateway network/5xx error safely without crashing (TC-RMA-11, AC2)
    √ 4. should handle gateway decline gracefully
    √ 5. should approve refund successfully when in PENDING status
    √ 6. should reject approveRefund if status is not PENDING
    √ 7. should throw NotFoundException when refund not found

PASS src/modules/returns/presentation/controllers/__tests__/admin-return.controller.spec.ts (13/13 tests PASS)
  AdminReturnController Unit Tests
    √ calculateRefund: should delegate to RefundExecutionService.previewRefundForReturn
    √ createRefund: should delegate to RefundExecutionService.createRefundForReturn
    √ getRefundDetail: should delegate to RefundExecutionService.getRefundById
    √ approveRefund: should delegate to PaymentRefundGatewayService.approveRefund
    √ executeRefund: should delegate to PaymentRefundGatewayService.executeRefund

PASS src/modules/returns/__tests__/epic-16-integrated-flow.spec.ts (10/10 tests PASS trên PostgreSQL Neon AWS)
  EPIC 16 INTEGRATED FLOW: Partial Refund Allocation & Gateway Settlement Engine
    1. Standard RMA Store Dropoff -> QC PASSED -> Pro-rata Refund Execution (TC-RMA-17)
      √ 1.1 should create ReturnOrder via Store Dropoff for Item A (200k)
      √ 1.2 should receive goods at store and complete QC inspection (PASSED)
      √ 1.3 should calculate pro-rata refund breakdown accurately (TC-RMA-17, DEC-04)
      √ 1.4 should create Refund and RefundItem with PENDING status (EP16-T02)
      √ 1.5 should approve refund (PENDING -> APPROVED) by Finance (EP16-T03)
      √ 1.6 should execute settlement via Gateway, restore customer points, and complete RMA (EP16-T03)
      √ 1.7 Anti-Duplication: reject creating 2nd refund for already refunded item (AC1)
      √ 1.8 Idempotency: calling executeRefund second time returns existing record (TC-RMA-12)
    2. Carrier Pickup with CHANGE_OF_MIND Shipping Deduction (DEC-04)
      √ 2.1 should deduct 25.000đ return shipping fee for CARRIER_PICKUP with CHANGE_OF_MIND (DEC-04)
    3. Gateway Error / Network Timeout Resilience (TC-RMA-11, AC2)
      √ 3.1 should hold status at PROCESSING and not crash on Gateway 504 / timeout (TC-RMA-11)
```

---

## 4. Bằng Chứng Hồi Quy Toàn Bộ Hệ Thống (Zero Regression Verification)

1. **Returns Module Regression Test:**
   - Chạy toàn bộ test suites trong `src/modules/returns/`:
   - **Kết quả:** `Test Suites: 19 passed, 19 total | Tests: 132 passed, 132 total` (100% PASS).
2. **P0 Core Commerce & Fulfillment Regression Test:**
   - `epic-01-integrated-flow.spec.ts` (Location & Inventory): **PASS**.
   - `epic-02-integrated-flow.spec.ts` (FEFO Lots & Reservation): **PASS**.
   - `epic-03-integrated-flow.spec.ts` (OMS Routing & Splitting): **PASS**.
   - `epic-04-integrated-flow.spec.ts` (WMS Pick & Pack): **PASS**.
   - `epic-05-integrated-flow.spec.ts` (Polymorphic Shipment): **PASS**.
3. **Production Type-Safe Build:**
   - Lệnh `npm run build` (`nest build`): **Thành công 100%, 0 lỗi biên dịch TypeScript**.

---

## 5. Kết Luận & Đề Xuất Nghiệm Thu

- **Đánh giá chung:** Epic 16 đã hoàn thành xuất sắc toàn bộ 3 tasks kỹ thuật cốt lõi và các tầng tích hợp liên quan. Động cơ phân bổ tiền hoàn bảo đảm chính xác 100% bất biến tài chính, tuân thủ chặt chẽ quyết định chi phí vận chuyển `DEC-04`, bảo vệ an toàn trước lỗi kết nối cổng thanh toán (`TC-RMA-11`), chống gian lận hoàn tiền trùng lặp và hỗ trợ idempotency hoàn hảo (`TC-RMA-12`).
- **Khuyến nghị:** Nghiệm thu hoàn tất **EPIC 16** để chuyển sang **EPIC 17: Exchange Order Settlement & Replacement Fulfillment** (Cơ chế quyết toán bù trừ đổi hàng mới, nạp đơn hàng thay thế vào quy trình Fulfillment P0).
