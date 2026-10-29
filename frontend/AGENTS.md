<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Nghiệm thu với backend thật

Khi nghiệm thu frontend, kiểm tra `http://localhost:3000/api/v1/health/ready` trước. Nếu backend chưa chạy, tự khởi động từ `../backend` bằng `npm run start:dev` với `.env` hiện có, đợi health/ready trả 200 rồi mới thử luồng. Chỉ dừng tiến trình backend do chính mình khởi động; không dừng các tiến trình Node khác của người dùng. Nếu backend không thể khởi động, ghi nguyên nhân và phần chưa kiểm chứng vào checklist.
