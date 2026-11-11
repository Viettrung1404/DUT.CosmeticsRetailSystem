# Sprint 4 FE Admin — Triển khai và kiểm chứng

Cập nhật: 11/11/2026. Nguồn: `docs/3-planning/08_sprint_plan.md`. Nhánh FE: `feat/admin-sprint4-users`. Không merge vào `develop`.

## Đối chiếu phạm vi

| Nhóm | Route FE | Hiện trạng FE | Backend |
|---|---|---|---|
| User / quyền | `/admin/users` | List, lọc, tạo/sửa, khóa/mở, gán store, cấp/thu hồi quyền | UserAdminController có API; cần `SYSTEM_USER_MANAGE` |
| Transfer | `/admin/inventory/transfers` | List, tạo, duyệt, xuất, nhận (có ghi hao hụt), hủy | TransferAdminController có API |
| Stocktake | `/admin/stocktakes` | Tạo, số đếm, chốt, hủy; chi tiết chênh lệch | StocktakeAdminController có API |
| Batches | `/admin/batches` | Lọc hạn dùng, lô khóa; khóa/mở kèm lý do | BatchAdminController có API |
| Finance | `/admin/payments`, `/admin/reconciliation` | Lịch sử, export CSV trang hiện tại, lọc, đối soát theo nhóm | FinanceAdminController có API |
| HR | `/admin/employees`, `/admin/departments`, `/admin/shifts`, `/admin/attendance`, `/admin/commissions` | CRUD nhân viên, phòng ban, ca; chấm công/list/calendar; hoa hồng/chốt tháng | HR controllers có API |
| Suppliers / PO | `/admin/suppliers`, `/admin/purchase-orders`, `/admin/supplier-payments` | CRUD NCC, rating, balance; tạo/duyệt/xác nhận/hủy PO; nhập khoản thanh toán | SupplierAdminController và PurchaseOrderAdminController có API |
| RMA Admin / refund gateway | Chưa có màn xử lý mutation | **Chưa triển khai** vì chưa tìm thấy Admin REST controller hợp đồng cho approve/inspect/complete/refund trong Backend develop | **Backend blocker** |
| Tạo vận đơn GHN | Chưa có modal submit tạo vận đơn | **Chưa triển khai** vì chưa thấy endpoint Admin tạo vận đơn trong Backend develop | **Backend blocker** |
| Dashboard widget tồn thấp | `/admin/dashboard`: hai KPI từ lọc tồn LOW_STOCK/OUT_OF_STOCK và bảng 10 dòng | API GET /admin/inventory đã có |

## Giới hạn cần sửa trước nghiệm thu

- Các form chuyển kho, kiểm kê, PO và nhân viên hiện dùng **UUID nhập tay** khi Backend không cung cấp danh bạ lựa chọn chung; cần API tra cứu cửa hàng / biến thể và picker để UX đạt yêu cầu.
- Trang chuyển kho hiện chưa hỗ trợ **sửa nháp**. Các nút duyệt/nhận xử lý dòng trên phiếu thật.
- Trang kiểm kê cho nhập dòng đếm, chưa tự điền từ danh sách sản phẩm và lô; calendar chấm công chỉ tóm tắt **trang dữ liệu đang tải**, không phải tổng hợp toàn tháng.
- Trang thanh toán export **CSV chỉ trang hiện tại**, không phải export toàn kết quả.
- Form user quyền đã dùng checkbox Cấp thêm / Thu hồi (không cho cùng lúc), mặc định kế thừa; cần test thực tế bitmask và role.
- Cần test lưu dữ liệu thực trên database test. Không tự seed/migrate/reset DB chung.
- **Chưa chạy `npm run build` hoặc E2E cho commit mới trên máy người dùng.** Trạng thái là đã viết code trên GitHub, không phải đã nghiệm thu.

## Quick smoke checklist

1. `cd frontend-admin; npm run build`. Không đánh dấu đạt nếu còn TypeScript errors.
2. Chạy Backend `npm run start:dev`, FE `npm run dev`; CORS cho `localhost:5173`.
3. Đăng nhập với admin đã cấp quyền phù hợp; 403 là lỗi permission/data scope cần báo rõ, không dùng mock.
4. `/admin/users`: thử tìm, tạo nhân viên test và gán store; email activation sent hoặc fallback warning.
5. `/admin/inventory/transfers`: tạo nháp, request, approve, ship, receive, kiểm tra tồn hai bên và batch FEFO.
6. `/admin/stocktakes`: nhập số đếm (kể cả khác tồn sổ), chốt bởi người khác nếu có chênh lệch.
7. `/admin/batches`: filter 30/60/90, expired; khóa lô với lý do, kiểm tra không xuất từ lô bị khóa.
8. `/admin/payments`: lịch sử, lọc, export trang; `/admin/reconciliation` chốt nhóm khi ca POS hợp lệ.
9. `/admin/employees`, `/admin/departments`, `/admin/shifts`: tạo/sửa; kiểm tra ràng buộc khi xóa.
10. `/admin/attendance`: check-in/out và quan sát bản ghi. `/admin/commissions`: chốt tháng **đã kết thúc** bằng tài khoản phù hợp.
11. `/admin/suppliers`, `/admin/purchase-orders`, `/admin/supplier-payments`: thực hiện trên fixture riêng; xác nhận công nợ không thể âm.
12. Thu thập ảnh UI, Network HTTP, log/backend và thay đổi DB liên quan; lập báo cáo pass/fail.

## Cần Thành Lập hỗ trợ

- Endpoint Admin cho RMA: list/detail, approve, inspect, complete/reject.
- Endpoint refund gateway có verify trạng thái thực, idempotency/audit.
- Endpoint tạo vận đơn và báo cước (nếu provider được cấu hình).
- Endpoint tra cứu store và variants có quyền phù hợp cho form kho/PO.
- Tài khoản test có các permission (SYSTEM_USER_MANAGE, INVENTORY_TRANSFER_MANAGE/INVENTORY_TRANSFER, INVENTORY_STOCKTAKE_MANAGE, INVENTORY_BATCH_MANAGE, PAYMENT_RECONCILE, EMPLOYEE_VIEW/MANAGE, SUPPLIER_MANAGE, PO_CREATE/APPROVE).
