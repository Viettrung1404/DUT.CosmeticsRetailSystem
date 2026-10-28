# Kế hoạch frontend end-user GlowUp — Next.js

Ngày cập nhật: **28/10/2026**. Trạng thái: **đã triển khai FE-00 và code shell/auth/session FE-01 trong `frontend/`, đã sửa UI FE-01 theo nguồn Stitch và navbar Danh mục chăm sóc da**; còn gate backend/SMTP/OAuth thật; FE-02–07 chưa triển khai. Xem [bảng đối chiếu thiết kế](../../../frontend/docs/fe-01-design-review.md), [checklist FE-01](../../../frontend/docs/fe-01-checklist.md), [checklist FE-00](../../../frontend/docs/fe-00-checklist.md) và [README chạy app](../../../frontend/README.md). Frontend dùng chung Upstash với backend bằng namespace phiên riêng, đã kiểm tra lock/CAS trên Upstash thật; lượt sửa UI không đổi source backend.

## 1. Phạm vi và quyết định đã chốt

- Làm website cho Guest/Customer bằng Next.js App Router; không bao gồm Admin, POS hoặc Mobile.
- Dựng đầy đủ các trang và tương tác trong `docs/4-stitch_design` (tên thư mục thực tế).
- **Navbar/header trong `code.html` trang Danh mục chăm sóc da là chuẩn layout chung**, theo [HTML hiện tại](../../4-stitch_design/danh_m_c_ch_m_s_c_da_glowup/code.html) và ảnh navbar mới người dùng gửi ngày 28/10/2026. Áp dụng trang chủ, checkout và account; auth không có header/footer theo D11; active state theo route thực. **Mọi màn lấy `code.html` làm chuẩn; `screen.png` đã cũ.** Lỗi toàn ứng dụng có thể dùng shell tối giản để vẫn phục hồi được khi layout hỏng.
- **Sidebar trang Sổ địa chỉ là chuẩn cho cụm tài khoản**. Giữ hình thức, phân nhóm, khoảng cách, active state; bổ sung Tổng quan/Đổi trả/Bảo mật và các liên kết còn thiếu. Ví voucher dẫn tới Đổi ưu đãi.
- **Màu chủ đạo #C85A70; làm đủ blueprint; footer theo trang chủ.** Đổi trả 7 ngày, verify đăng ký bằng link email; các quy tắc còn lại theo backend. Bỏ CTA phụ chưa có API.
- **VNPAY + COD bắt buộc trong bản đầu.** COD-only là mốc trung gian, không đủ nghiệm thu cuối.
- **Sửa nhóm API O01/O02/O03/O05 trước tích hợp liên quan:** bỏ giá vốn khỏi public response, hoàn thiện schema, bổ sung dữ liệu flash/promotion và tách view-count khỏi GET blog.
- Next.js phụ trách giao diện, SEO, UI state và tích hợp. BFF chỉ phụ trách session/token, adapter response và orchestration khi cần. Backend hiện có quyết định giá, tồn, khuyến mãi, điểm, đơn hàng, thanh toán và nghiệp vụ chuỗi cửa hàng. Frontend/BFF không truy cập database nghiệp vụ.
- Server Components gọi backend trực tiếp qua server API client; không gọi HTTP vòng qua Route Handler của chính Next.js.
- API thiếu phải ghi backlog; API cần tối ưu phải nêu bằng chứng, phương án và chờ người dùng chốt sửa. Việc lập kế hoạch không đồng nghĩa cho phép tự sửa backend.

## 2. Cách đọc bộ kế hoạch

| Tài liệu | Nội dung |
|---|---|
| [01 — Kiến trúc và quy tắc triển khai](01_architecture.md) | Folder structure, RSC/Client, BFF/session, cache, SEO, skills |
| [02 — Danh mục màn hình](02_screen_inventory.md) | Mapping đủ 41 bản HTML, 5 trang chỉ có trong blueprint, route, API, nghiệm thu |
| [03 — API và backlog backend](03_api_contracts_and_gaps.md) | Endpoint thật, API thiếu, các đề xuất sửa/tối ưu có nguồn chứng minh |
| [04 — Giai đoạn và nghiệm thu](04_delivery_plan.md) | Thứ tự triển khai, phụ thuộc, công việc, kiểm thử, Definition of Done |
| [05 — Sổ quyết định](05_decision_log.md) | Các câu trả lời đã chốt, mâu thuẫn được giải quyết và đầu vào triển khai |

## 3. Kết quả khảo sát repository

- Tại thời điểm lập kế hoạch chỉ có `backend/package.json`. FE-00 đã tạo `frontend/` ngang hàng `backend/`, giữ repository hiện tại; chưa đánh dấu các screen nghiệp vụ hoàn thành.
- Có **41 cặp `code.html` + `screen.png`**. Một bản chứa cả forgot/reset password; một bản là mini-cart drawer, không phải route riêng. Ba màn lỗi được triển khai bằng cơ chế lỗi tương ứng, không chỉ tạo trang tĩnh.
- `image.png_1`: logo G dạng gương; `image.png_2`: bảng nhận diện logo; `image.png_3`: ảnh website Beauty Box tham khảo. Đây là **asset/reference**, không phải ba màn hình sản phẩm mới.
- Blueprint `design_1.md` có **46 mục màn hình/route**, gồm **5 trang chưa có bản HTML riêng**: brand directory, brand detail, blog index, blog category, blog article. Người dùng đã chốt làm đủ cả năm. Cách đếm: 41 HTML − 1 drawer + 1 route reset tách riêng + 5 trang blueprint = 46 mục, trong đó có màn lỗi hệ thống.
- Layout navbar và sidebar đã có chỉ định rõ từ người dùng; không hỏi lại hai lựa chọn này.
- Backend đã có nhiều API thực cho catalog, auth, cart, checkout COD, account, RMA, loyalty, CMS và SEO; không được suy từ thiếu ảnh/thiếu schema rằng API chưa tồn tại.
- Các tích hợp chạy thật còn phụ thuộc môi trường. Handoff ngày 25/10 ghi nhận migration cần triển khai, SMTP, private return storage và OAuth thật chưa nghiệm thu đầy đủ. Đây là thông tin từ tài liệu bàn giao, **không phải kết quả probe môi trường mới ngày 26/10**.

## 4. Những điểm quyết định tiến độ

1. Bootstrap frontend theo màu/layout/sidebar đã chốt; đối chiếu đủ screen IDs.
2. Backend bàn giao VNPAY và nhóm O01/O02/O03/O05 trước phần FE integration tương ứng.
3. Đóng contract public brand/store, chuẩn bị CMS/asset và kiểm chứng lại môi trường auth/storage/provider.
4. Làm đủ UI trong preview không có nghĩa mọi tính năng đã sẵn sàng production. Nghiệm thu tách **UI hoàn chỉnh**, **tích hợp API**, **chạy thật trên staging**; không đánh dấu hoàn thành luồng nghiệp vụ bằng dữ liệu giả.

Ước lượng sơ bộ: **35–50 ngày công frontend**, cộng khoảng 20% dự phòng thành **42–60 ngày công**, giả định một người làm toàn thời gian, nội dung và API được bàn giao đúng nhịp. Không bao gồm thời gian viết module backend mới hoặc chờ provider. Không gán lịch cứng theo sprint backend cũ; xem [04](04_delivery_plan.md).

## 5. Nguồn đối chiếu

- [Blueprint Stitch](../../4-stitch_design/design_1.md), [Design system Stitch](../../4-stitch_design/glowup_beauty_retail/DESIGN.md), toàn bộ **`code.html` hiện tại**; render trực tiếp Danh mục chăm sóc da (navbar), trang chủ (footer), Sổ địa chỉ (sidebar). `screen.png` là ảnh cũ; ba asset/reference vẫn dùng đúng vai trò.
- [Functional requirements](../../1-requirement/07_functional_requirements.md), [Sprint plan chung](../08_sprint_plan.md).
- [OpenAPI](../../../backend/docs/api/openapi.json), [Handoff Next.js/Expo](../../../backend/docs/api/nextjs-expo-handoff.md), [Sprint 6 backend](../../../backend/docs/sprint-6.md).
- Controller, DTO và service backend liên quan được dùng để xác minh hành vi, đặc biệt checkout, promotions, public catalog, auth, tracking và địa chỉ.
- Đã kiểm tra tài liệu Next.js và VNPAY chính thức khi lập kế hoạch; các lựa chọn kiến trúc và nguồn nằm trong [01](01_architecture.md), [03](03_api_contracts_and_gaps.md).

## 6. Quy tắc cập nhật kế hoạch

Mỗi câu trả lời của người dùng cập nhật [decision log](05_decision_log.md) trước, rồi đồng bộ route inventory, API backlog và phase bị ảnh hưởng. Mục “đề xuất” không tự chuyển thành “đã chốt” khi chưa có câu trả lời. Có thể triển khai phần độc lập với quyết định còn mở; không đoán quy tắc tiền, quyền lợi hay thanh toán để hoàn tất UI.
