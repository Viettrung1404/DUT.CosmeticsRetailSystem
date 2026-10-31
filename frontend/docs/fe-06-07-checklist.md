# FE-06 / FE-07 — trạng thái nghiệm thu (29/10/2026)

## Lượt sửa theo phản hồi thiết kế

Người dùng yêu cầu sửa cả FE-03–06 theo từng `code.html`, đặc biệt cart và banner home. Xem [bảng đối chiếu và bằng chứng cập nhật](fe-03-06-design-review.md). Các ảnh/kiểm tra của lượt triển khai đầu không đủ để tuyên bố giao diện đã khớp Stitch; không chuyển screen sang Verified bằng build/test. Guest checkout đã bổ sung vào cả BFF và backend, kiểm tra tạo đơn COD thật trên dữ liệu demo local và hủy đơn kiểm thử. Showroom vẫn chờ nội dung theo xác nhận của người dùng.

## FE-06

Các route `/promotions`, `/promotions/[id]`, `/flash-sale`, `/brands`, `/brands/[slug]`, `/stores`, `/stores/[id]`, `/blog`, `/blog/category/[slug]`, `/blog/[slug]`, `/faq`, `/help` và ba chính sách CMS đã có trang, điều hướng, empty state và dữ liệu từ API public. `screen-progress.json` ghi **UI-ready**; chưa ghi Verified cho đến khi đối chiếu hình desktop/mobile với HTML Stitch và chạy E2E trên môi trường đã có nội dung được duyệt.

Backend bổ sung brand detail, store list/detail, promotion detail/products pagination và view event blog có dedupe 24 giờ. GET blog không còn tăng lượt xem. Store API mặc định trả danh sách rỗng; `PUBLIC_STORE_DIRECTORY_ENABLED=true` chỉ được bật khi danh sách showroom và thông tin liên hệ được duyệt. Người dùng xác nhận ngày 29/10 rằng chưa có dữ liệu showroom thật. Trang showroom không hiển thị địa chỉ seed demo.

Giới hạn còn lại: schema store chưa có gallery nên trang chi tiết chỉ hiện thông tin thật và link bản đồ khi có tọa độ; chưa có dữ liệu để nghiệm thu hình showroom. CMS chỉ có alias gốc cho ba slug chính sách hiện có; alias mới cần tạo route tương ứng. Nội dung CMS/FAQ và blog đang lấy từ database, cần review trước public release. Flash cards tối đa 20 theo backend; giá/quota vẫn được checkout xác nhận lại.

## FE-07 release gate

- `SEO_INDEXING_ENABLED=false` là mặc định ở frontend và backend; `/robots.txt` chặn crawler, sitemap trả 404. Chỉ bật cả hai sau khi `SITE_URL` khớp `PUBLIC_WEB_URL`, nội dung/ảnh được duyệt, provider callback và staging sign-off hoàn tất.
- Frontend build/lint/typecheck, OpenAPI drift, production smoke và các route public cần pass. Kiểm tra riêng auth, checkout COD và VNPAY success/fail/pending/return/reload trên staging; thử refund/reconcile với provider thật trước release. Không dùng fixture/demo làm bằng chứng này.
- Kiểm tra keyboard/focus/zoom 200%/reduced motion/mobile và screenshot desktop/mobile của S01–S41, B01–B05 đối chiếu `code.html` Stitch. Chưa có bằng chứng visual toàn bộ nên chưa đạt gate release.
- Đo LCP/INP/CLS trên dữ liệu production đã duyệt; chưa có field metrics nên không tuyên bố đạt ngưỡng.
- Rollback frontend bằng artifact và lockfile của bản trước; backend migration/rollback do backend owner thực hiện. Dùng `MAINTENANCE_MODE=true` khi cần dừng website, xác nhận response 503 và `Retry-After`.

## Bằng chứng hiện tại

- Backend `npm run build` pass. API live: brand/store/promotion detail trả 200 trước khi bật store publication gate; sau gate store list trả 0. Blog GET hai lần không đổi `viewsCount`; POST view hai lần với cùng visitor chỉ tăng một lần.
- Frontend `npm run check` (bao gồm contracts, inventory, format, lint, typecheck, unit tests và build) và `npm run test:production` pass. Live route smoke trả 200 cho promotions/detail, flash, brands/detail, stores list, blog/category/article, FAQ, help, chính sách; sitemap mặc định 404 và URL không tồn tại 404. Backend brand sitemap trả 200 với URL brand.
- Full Jest backend được chạy đồng thời với frontend build; `payment-worker.spec.ts` timeout 5 giây và suite được dừng. Chưa xác định timeout do tải máy hay lỗi test. Đây không phải bằng chứng test gate backend đã pass.
