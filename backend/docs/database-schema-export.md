# Xuất schema hiện tại của database

Chạy từ thư mục `backend`:

```sh
npm run db:schema:export
```

Kết quả: `backend/prisma/schema.current.sql` (file sinh tự động, đã được Git ignore).
Script đọc `.env` của backend; biến môi trường đã đặt sẵn được ưu tiên.
Kết nối dùng `DIRECT_URL` nếu có, nếu không dùng `DATABASE_URL`.
Với Neon, script đổi hostname pooler sang endpoint trực tiếp để dump.

Đây là SQL từ database đang kết nối, bao gồm các schema, bảng, cột, generated
column, kiểu dữ liệu, view, index, khóa ngoại, CHECK constraint, sequence,
function, trigger, policy, comment, extension, ownership và GRANT/REVOKE mà tài
khoản kết nối có quyền đọc. Các đối tượng SQL viết tay trong migrations cũng
được xuất; script không ghép migration và không sửa `schema.prisma`.

File không chứa dữ liệu bảng, giá trị hiện tại của sequence hay định nghĩa
role/tablespace toàn PostgreSQL cluster. Khi khôi phục nguyên bản, cần có sẵn
các role, extension và tablespace được tham chiếu. Để bỏ ownership và quyền
GRANT/REVOKE khi chuyển sang môi trường khác:

```sh
npm run db:schema:export -- --portable
```

Đổi nơi xuất (đường dẫn tương đối tính từ `backend`):

```sh
npm run db:schema:export -- --output .tmp/schema-snapshot.sql
```

Cần `pg_dump` trên PATH, hoặc đặt `PG_DUMP_PATH` trỏ tới executable. Nếu chưa
cài, script dùng Docker và image `postgres:17`; Docker Desktop cần đang chạy.
Có thể đổi image qua `PG_DUMP_DOCKER_IMAGE`. Phiên bản `pg_dump` phải hỗ trợ
phiên bản server; mặc định phù hợp PostgreSQL 17 của dự án.

Script chỉ đọc database. Nó chỉ thay file đích sau khi dump thành công;
nếu kết nối/dump lỗi, file đích trước đó được giữ nguyên.
