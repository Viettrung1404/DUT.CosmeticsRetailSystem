# API handoff — Sprint 6

Tích hợp Next.js và Expo: [hướng dẫn bàn giao](nextjs-expo-handoff.md), [readiness của môi trường hiện tại](client-readiness.json), [env Next.js](nextjs.env.example), [env Expo](expo.env.example). Backend `:3000`, Next.js mẫu `:3001`.

- `openapi.json`: spec xuất từ application module thật; cùng response envelope với Swagger runtime.
- `end-user.postman_collection.json`: request flow import được vào Apidog theo Postman v2.1; mỗi method/path được kiểm tra lại với spec khi export.
- `local.postman_environment.json`, `staging.postman_environment.json`: placeholder, không chứa credentials. Tạo `clientNonce` ngẫu nhiên cho từng OAuth flow; tạo idempotency key mới cho từng command và giữ nguyên khi retry.
- `sprint6-validation.json`: tóm tắt unit/HTTP/DB/Redis/migration/performance; lần rà Next.js/Expo mới nhất pass 446 unit + 54 PostgreSQL/HTTP tests. `client-readiness.json` ghi các chặn của môi trường thật; test local pass không đồng nghĩa môi trường thật đã sẵn sàng.

Export lại trên schema test local tách biệt, chạy tại `backend`:

```powershell
$env:SPRINT6_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint6_api_export_new'
node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand --testPathPattern sprint6 --testNamePattern 'exports OpenAPI'
```

Xem [runbook Sprint 6](../sprint-6.md) trước khi cấu hình provider, migrate hoặc chạy request ghi dữ liệu. Các response legacy có data schema generic và gate provider thật được ghi rõ trong runbook.
