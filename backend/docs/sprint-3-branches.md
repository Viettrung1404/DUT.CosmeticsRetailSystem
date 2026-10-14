# Bốn nhánh backend Sprint 3

Các PR dùng base `develop` (`e30b8c2`). Bộ thay đổi được gom thành bốn nhánh:

| Thứ tự | Nhánh | Nội dung |
| --- | --- | --- |
| 1 | `feat/be-core-permissions` | Schema và migration chung, dependencies, cấu hình runtime, Prisma transaction, response/filter, kiểu session, helper hủy đơn/sự kiện, payment domain dùng chung và test permissions |
| 2 | `feat/be-auth-users-uploads` | Auth/session/mật khẩu, API hồ sơ người dùng và upload avatar, kèm test từng module |
| 3 | `feat/be-orders-payments` | Checkout, trạng thái/hủy đơn, API payments, callback, gateway adapters và workers, kèm test từng module |
| 4 | `feat/be-notifications` | API notifications, email outbox/SMTP worker, tài liệu Sprint 3, Postman collection, yêu cầu/kế hoạch sprint và test liên module |

Lịch sử đã rebase và squash thành một commit cho mỗi nhánh, không có merge commit mới. Bốn nhánh tạo thành chuỗi `develop → core → auth/users/uploads → orders/payments → notifications`. Merge PR theo đúng thứ tự trong bảng; mỗi nhánh bao gồm commit của nhánh trước.

Để giữ graph `develop` tuyến tính, có thể chọn **Rebase and merge**. Sau khi PR trước đã merge, cập nhật nhánh tiếp theo bằng cách chỉ rebase commit riêng của nhánh đó lên `origin/develop`:

```powershell
git fetch origin
git rebase --onto origin/develop <commit-cha-cu> <ten-nhanh-PR-tiep-theo>
```

Các commit cha cũ của bộ lịch sử này:

| Nhánh tiếp theo | Commit cha cũ |
| --- | --- |
| `feat/be-auth-users-uploads` | `de4b27a` |
| `feat/be-orders-payments` | `5417961` |
| `feat/be-notifications` | `946b08a` |

Nếu nhánh đã được push trước khi rebase, cập nhật remote bằng `git push --force-with-lease origin <ten-nhanh>`. Nếu chưa push, dùng `git push -u origin <ten-nhanh>`.

## Push và tạo PR

Bốn nhánh hiện ở local. Push đúng bốn nhánh bằng lệnh:

```powershell
git push -u origin feat/be-core-permissions feat/be-auth-users-uploads feat/be-orders-payments feat/be-notifications
```

Sau đó tạo PR trên GitHub vào `develop` theo thứ tự trong bảng. Khi review code đầy đủ, checkout `feat/be-notifications`.

## Kiểm tra và phạm vi

- Rebase giữ nguyên nội dung code. Auth/users/uploads giữ nguyên tree; orders/payments kế thừa thêm auth/users/uploads để tạo chuỗi tuyến tính. Bản notifications đầy đủ chỉ thay đổi file hướng dẫn này so với trước rebase.
- Build bản tổng hợp bằng `npm run build`: pass. TypeScript riêng cả bốn nhánh bằng `tsc --noEmit --incremental false`: pass.
- Kiểm tra 216 bước mô phỏng, bao phủ 24 thứ tự merge và 16 tổ hợp merge thường/squash cho mỗi thứ tự: không conflict và cho cùng nội dung cuối.
- Kết quả kiểm tra chi tiết nằm trong `.git/codex-be-build-results.json` và `.git/codex-be-merge-results.json` ở máy local.
- Chạy lại test backend sau khi gom: 66 suite/379 test pass; 7 suite/41 test skip do chưa cấu hình database test hoặc chưa bật load test.

Kết quả merge áp dụng cho bộ commit hiện tại trên `develop` ở `e30b8c2`. Nếu có sửa mới cùng vùng code, cần kiểm tra lại. Chưa chạy migration vào database; integration/load test cần database riêng chưa được thực thi.

## Backup

- `backup/sprint3-before-split-20261014`: toàn bộ thay đổi ban đầu.
- `backup/sprint3-updated-develop-20261014`: bản đã ghép với `develop` mới và giải quyết conflict JWT guard.
- `backup/sprint3-before-regroup-20261014`: bản tổng hợp và toàn bộ lịch sử của cách chia tám nhánh trước đây.
- `backup/be-auth-before-rebase-20261014`, `backup/be-orders-before-rebase-20261014`, `backup/be-notifications-before-rebase-20261014`: lịch sử bốn nhánh trước khi làm gọn graph.

Các nhánh local `feat/sprint3-*` đã được thay bằng bốn nhánh `feat/be-*`. Nhánh `develop` vẫn là code pull từ remote, chưa merge feature vào nhánh này.
