# HTTPS Production — ChunkLoadError (27/11/2026)

## Dẫn chứng và giới hạn kết luận

Log người dùng cho thấy Turbopack runtime yêu cầu `server/chunks/ssr/_04k2ocfff66th._.js` nhưng Node trả MODULE_NOT_FOUND. Đây là lỗi artifact/runtime khi load module, độc lập với HTTP 429 từ API.

Lúc kiểm tra, chunk đó không tồn tại, nhưng **cũng không còn được các file JS server hiện tại tham chiếu**. Quét toàn bộ `.next/server/**/*.js` thấy 0 tham chiếu chunk tĩnh bị thiếu; `.next/server/chunks/ssr` có 353 file JS. Bản build hiện tại có BUILD_ID `RI55_L4fQ52EiJBfsEhZl` lúc 20:50; launcher/Next đang chạy được tạo lúc 20:58. GET `/brands/honey` và `/admin/access-denied` qua HTTP nội bộ đã phản hồi thành công (request tự theo redirect). Không có bằng chứng để kết luận chính xác thao tác nào làm mất chunk trong lần lỗi trước, hoặc khẳng định dev/build chạy đồng thời là nguyên nhân đã xác nhận.

`frontend/scripts/start-https.mjs` trước sửa báo HTTPS ready ngay lúc proxy listen, chưa kiểm tra Next, tự restart child sau mọi lần exit và đăng ký shutdown handlers hai lần. Những hành vi này khiến lỗi artifact/cổng khó nhận biết và có thể lặp vô hạn.

## Thay đổi

- `scripts/production-build.mjs`: kiểm tra BUILD_ID, app manifest và các tham chiếu Turbopack chunk trước khi spawn Next. Tôn trọng NEXT_DIST_DIR và env production từ cơ chế `@next/env` sẵn có.
- Launcher kiểm tra hai cổng trước khi spawn; child exit/lỗi làm launcher thoát rõ ràng. Bỏ restart loop.
- Chỉ mở HTTPS và báo ready sau khi Next trả 200 cho `/login` trên HTTP nội bộ.
- Hợp nhất shutdown, đóng proxy/child do launcher sở hữu. Theo dõi BUILD_ID; nếu thay đổi/xóa thì dừng và yêu cầu khởi động lại sau build. Đây không phải cơ chế hot deploy: vẫn phải dừng server trước khi build đè thư mục đang dùng.
- Giữ nguyên mặc định `.next`, `npm run build`, `npm run start:https`, cổng 3001/3002 và cấu hình Docker. Không xóa node_modules/cache và không dừng tiến trình người dùng.

## Kiểm chứng

- Backend thật health/ready 200.
- 3 test Node cho build không tồn tại, route tham chiếu chunk mất, lazy chunk mất/được khôi phục: pass.
- Build production mới vào `.next-https-check`: compile, TypeScript, prerender pass. Thư mục riêng tránh ghi đè `.next` của tiến trình người dùng.
- Launcher với INTERNAL_PORT=3002 đang bị chiếm: exit 1 ngay, không restart và không báo ready.
- Launcher mới trên HTTPS 3431 / HTTP 3432, dùng build vừa tạo: Honey 200, products 200; admin/access-denied trả 307 tới login; anonymous profile 401. Chromium xác nhận h1 Honey. Không có ChunkLoadError/MODULE_NOT_FOUND trong response/log.
- Process kiểm thử tự dừng; các process sẵn có trên 3000/3001/3002 được giữ nguyên. Các thay đổi tự sinh ở next-env/tsconfig do dist kiểm thử được khôi phục.

## Thao tác áp dụng cho phiên hiện tại

Trong terminal đang chạy HTTPS, nhấn Ctrl+C. Sau đó từ `D:\VS_Code\DUT\PBL6\frontend` chạy:

```powershell
npm run build
npm run start:https
```

Không chạy build hoặc xóa `.next` trong lúc phiên production dùng thư mục đó vẫn đang chạy. Nếu chủ động dùng NEXT_DIST_DIR riêng, build và start phải dùng cùng giá trị.
