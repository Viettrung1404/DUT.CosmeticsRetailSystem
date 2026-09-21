// =============================================================================
// SEED DỮ LIỆU BẮT BUỘC — Đợt 1
// Nguồn: docs/2-design/04_thiet_ke_csdl.md, mục 3.1 (bảng 53 quyền) và mục 5.1 (roles).
// Chạy: npx prisma db seed
//
// Dùng upsert (có thì cập nhật, chưa có thì thêm) nên chạy lại nhiều lần vẫn an toàn.
// Role 1, 3, 6: bit đã chốt trong tài liệu.
// Role 2, 4, 5: tài liệu chỉ mô tả bằng lời, bit được chốt theo mô tả role (mục 5.1), chức năng
// từng bit (mục 3.1) và sơ đồ use case trong tài liệu 02. Người dùng cụ thể cần thêm quyền thì cấp
// qua users.extra_permissions, không sửa role.
// =============================================================================
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// [bit_position, permission_code, permission_name, module]
const PERMISSIONS: [number, string, string, string][] = [
  [0, 'PRODUCT_VIEW', 'Xem danh mục & chi tiết sản phẩm', 'product'],
  [1, 'PRODUCT_CREATE', 'Tạo sản phẩm & biến thể mới', 'product'],
  [2, 'PRODUCT_UPDATE', 'Chỉnh sửa thông tin & giá bán sản phẩm', 'product'],
  [3, 'PRODUCT_DELETE', 'Xóa/ngừng kinh doanh sản phẩm', 'product'],
  [4, 'PRODUCT_CATEGORY_MANAGE', 'Quản lý danh mục & thương hiệu', 'product'],
  [5, 'PRODUCT_IMPORT_EXPORT', 'Xuất nhập file Excel danh sách sản phẩm', 'product'],
  [6, 'INVENTORY_VIEW', 'Xem tồn kho theo cửa hàng', 'inventory'],
  [7, 'INVENTORY_CHECK', 'Kiểm kê & điều chỉnh tồn kho', 'inventory'],
  [8, 'INVENTORY_TRANSFER', 'Chuyển hàng giữa các kho/chi nhánh', 'inventory'],
  [9, 'INVENTORY_BATCH_MANAGE', 'Quản lý hạn sử dụng & số lô mỹ phẩm', 'inventory'],
  [10, 'INVENTORY_WARN_LOW', 'Cấu hình & nhận cảnh báo sắp hết hàng', 'inventory'],
  [11, 'ORDER_POS_CREATE', 'Tạo đơn hàng bán lẻ tại quầy (POS)', 'order'],
  [12, 'ORDER_ONLINE_VIEW', 'Xem danh sách đơn hàng online', 'order'],
  [13, 'ORDER_DISCOUNT_APPLY', 'Áp dụng chiết khấu/mã giảm giá tại quầy', 'order'],
  [14, 'ORDER_STATUS_UPDATE', 'Cập nhật tiến độ giao hàng/đóng gói', 'order'],
  [15, 'ORDER_CANCEL', 'Hủy đơn hàng', 'order'],
  [16, 'PAYMENT_COLLECT', 'Thu tiền, mở và kết ca làm việc POS', 'payment'],
  [17, 'PAYMENT_REFUND', 'Duyệt hoàn tiền trả hàng cho khách', 'payment'],
  [18, 'PAYMENT_METHOD_CONFIG', 'Quản lý phương thức thanh toán POS/Online', 'payment'],
  [19, 'PAYMENT_RECONCILE', 'Đối soát doanh thu ca và cổng thanh toán', 'payment'],
  [20, 'CUSTOMER_VIEW', 'Xem danh sách & hồ sơ khách hàng', 'customer'],
  [21, 'CUSTOMER_CREATE_UPDATE', 'Tạo mới & cập nhật thông tin khách hàng', 'customer'],
  [22, 'CUSTOMER_LOYALTY_ADJUST', 'Điều chỉnh điểm tích lũy & hạng thành viên', 'customer'],
  [23, 'CUSTOMER_FEEDBACK_MANAGE', 'Duyệt & trả lời đánh giá, khiếu nại', 'customer'],
  [24, 'CUSTOMER_EXPORT', 'Xuất dữ liệu khách hàng CRM', 'customer'],
  [25, 'EMPLOYEE_VIEW', 'Xem danh sách nhân sự cửa hàng', 'employee'],
  [26, 'EMPLOYEE_MANAGE', 'Thêm mới, phân công ca làm việc nhân viên', 'employee'],
  [27, 'EMPLOYEE_COMMISSION_VIEW', 'Xem bảng hoa hồng doanh số', 'employee'],
  [28, 'EMPLOYEE_COMMISSION_CALC', 'Tính toán & chốt thưởng hoa hồng tháng', 'employee'],
  [29, 'EMPLOYEE_ATTENDANCE', 'Quản lý chấm công & duyệt xin nghỉ', 'employee'],
  [30, 'SUPPLIER_VIEW', 'Xem danh bạ nhà cung cấp', 'supplier'],
  [31, 'SUPPLIER_MANAGE', 'Thêm, sửa thông tin nhà cung cấp', 'supplier'],
  [32, 'PO_CREATE', 'Lập đơn đặt hàng nhập kho (PO)', 'supplier'],
  [33, 'PO_APPROVE', 'Phê duyệt đơn nhập hàng & thanh toán NCC', 'supplier'],
  [34, 'PO_RECEIVE', 'Xác nhận nhập kho thực tế từ đơn PO', 'supplier'],
  [35, 'REPORT_VIEW_BASIC', 'Xem báo cáo doanh số & tồn kho cơ bản', 'report'],
  [36, 'REPORT_REVENUE', 'Xem báo cáo tài chính, lợi nhuận chi tiết', 'report'],
  [37, 'REPORT_STAFF_PERF', 'Xem báo cáo hiệu suất bán hàng nhân viên', 'report'],
  [38, 'REPORT_FORECAST', 'Xem dự báo nhu cầu & phân tích xu hướng', 'report'],
  [39, 'REPORT_EXPORT', 'Xuất báo cáo PDF/Excel phân tích kinh doanh', 'report'],
  [40, 'MARKETING_PROMO_VIEW', 'Xem chương trình khuyến mãi & mã giảm giá', 'marketing'],
  [41, 'MARKETING_PROMO_MANAGE', 'Tạo & chỉnh sửa Flash Sale, Voucher', 'marketing'],
  [42, 'MARKETING_BANNER_MANAGE', 'Cài đặt banner, trang chủ website/app', 'marketing'],
  [43, 'MARKETING_BLOG_MANAGE', 'Đăng bài viết blog, review làm đẹp', 'marketing'],
  [44, 'SYSTEM_USER_MANAGE', 'Quản lý tài khoản đăng nhập & cấp quyền', 'system'],
  [45, 'SYSTEM_ROLE_MANAGE', 'Định nghĩa & hiệu chỉnh vai trò hệ thống', 'system'],
  [46, 'SYSTEM_SETTING_UPDATE', 'Thay đổi cấu hình thuế VAT, phí vận chuyển', 'system'],
  [47, 'SYSTEM_AUDIT_VIEW', 'Tra cứu nhật ký thao tác (Audit Logs)', 'system'],
  [48, 'INVENTORY_TRANSFER_MANAGE', 'Lập & phê duyệt phiếu chuyển kho liên chi nhánh', 'inventory'],
  [49, 'INVENTORY_STOCKTAKE_MANAGE', 'Tạo & chốt phiếu kiểm kê định kỳ cân bằng kho', 'inventory'],
  [50, 'ORDER_SHIPMENT_MANAGE', 'Đóng gói, in vận đơn & bàn giao 3PL giao hàng', 'order'],
  [51, 'ORDER_RETURN_MANAGE', 'Tiếp nhận thẩm định & xử lý đơn đổi trả hàng (RMA)', 'order'],
  [52, 'INVOICE_MANAGE', 'Phát hành, tra cứu & hủy hóa đơn điện tử VAT', 'payment'],
];

// Gộp danh sách bit thành một số bitmask BigInt. Phải dùng BigInt (hậu tố n):
// số thường của JavaScript chỉ chính xác tới 2^53, và toán tử << chỉ chạy trên 32 bit.
const mask = (bits: number[]): bigint =>
  bits.reduce((acc, bit) => acc | (1n << BigInt(bit)), 0n);

const ROLES = [
  {
    id: 1,
    name: 'admin',
    displayName: 'Quản trị viên',
    description: 'Toàn quyền hệ thống (53 bit, từ bit 0 đến bit 52)',
    permissions: (1n << 53n) - 1n,
    dataScope: 'ALL',
  },
  {
    // 24 bit: Product chỉ xem (products không có store_id nên STORE không giới hạn được); toàn bộ Inventory, Order, Employee;
    // báo cáo cơ bản + hiệu suất nhân viên; xem khách hàng; duyệt hoàn tiền.
    id: 2,
    name: 'store_manager',
    displayName: 'Cửa hàng trưởng',
    description: 'Quản lý vận hành, kho, đơn hàng và nhân sự của chi nhánh được giao',
    permissions: mask([
      0, 6, 7, 8, 9, 10, 48, 49, 11, 12, 13, 14, 15, 50, 51, 25, 26, 27, 28, 29, 35, 17, 37, 20,
    ]), // = 4.222.297.490.784.193
    dataScope: 'STORE',
  },
  {
    id: 3,
    name: 'sales_staff',
    displayName: 'Nhân viên bán hàng',
    description: 'Bán hàng tại quầy POS, thu tiền, tra cứu khách hàng',
    permissions: mask([0, 11, 13, 16, 20, 21]), // = 3.221.505 theo tài liệu
    dataScope: 'STORE',
  },
  {
    // 11 bit: 10 bit tài liệu nêu + bit 12 (xem đơn online để biết đơn cần đóng gói).
    id: 4,
    name: 'warehouse_staff',
    displayName: 'Nhân viên kho',
    description: 'Nhập kho, chuyển kho, kiểm kê, quản lý lô hạn dùng, đóng gói giao vận',
    permissions: mask([0, 6, 7, 8, 9, 10, 34, 48, 49, 50, 12]), // = 1.970.342.016.849.857
    dataScope: 'STORE',
  },
  {
    // 8 bit: đối soát, hóa đơn GTGT, duyệt & thanh toán NCC, báo cáo tài chính.
    id: 5,
    name: 'accountant',
    displayName: 'Kế toán',
    description: 'Đối soát thanh toán, hóa đơn điện tử, thanh toán nhà cung cấp, báo cáo tài chính',
    permissions: mask([0, 19, 30, 33, 35, 36, 39, 52]), // = 4.504.262.126.600.193
    dataScope: 'ALL',
  },
  {
    id: 6,
    name: 'customer',
    displayName: 'Khách hàng',
    description: 'Khách mua hàng — không có quyền trang quản trị (role mặc định khi đăng ký)',
    permissions: 0n,
    dataScope: 'SELF',
  },
];

async function main() {
  for (const [bitPosition, permissionCode, permissionName, module] of PERMISSIONS) {
    const data = { bitValue: 1n << BigInt(bitPosition), permissionCode, permissionName, module };
    await prisma.permission.upsert({
      where: { bitPosition },
      update: data,
      create: { bitPosition, ...data },
    });
  }

  for (const { id, ...data } of ROLES) {
    await prisma.role.upsert({
      where: { id },
      update: { ...data, isSystem: true },
      create: { id, ...data, isSystem: true },
    });
  }

  // Chèn id tay không làm bộ đếm tự tăng của roles nhảy theo. Đẩy bộ đếm lên id lớn nhất,
  // nếu không thì role tạo sau này qua API sẽ nhận id 1 và lỗi trùng khóa chính.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles))`,
  );

  console.log(`Đã seed ${PERMISSIONS.length} quyền và ${ROLES.length} vai trò (id ${ROLES.map((r) => r.id).join(', ')}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
