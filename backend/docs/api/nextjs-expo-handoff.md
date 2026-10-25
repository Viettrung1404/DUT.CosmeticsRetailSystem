# Handoff Next.js + React Native Expo

Ngày rà soát: 2026-10-25. Cổng mẫu đã chốt: **backend 3000, Next.js 3001**. Workspace này chỉ có backend, chưa có source Web/Mobile để chạy UI hoặc build thiết bị. Có thể bàn giao contract để FE/Mobile bắt đầu tích hợp; **chưa nghiệm thu chạy hoàn chỉnh trên môi trường thật**. Xem bằng chứng đọc cấu hình/provider tại [client-readiness.json](client-readiness.json), regression trong [sprint6-validation.json](sprint6-validation.json), spec [openapi.json](openapi.json) và [collection](end-user.postman_collection.json).

## 1. URL và môi trường

Backend `.env` dùng:

```dotenv
PORT=3000
PUBLIC_WEB_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
SEO_INDEXING_ENABLED=false
```

`PUBLIC_WEB_URL` là origin website dùng sinh sitemap; `FRONTEND_URL` là origin của link xác thực/quên mật khẩu. Khi đổi domain/cổng Web, đổi cả hai và CORS. Cấu hình local hiện vẫn giữ origin `:5173` cũ để không làm gián đoạn client trước đó; bỏ nếu nhóm không dùng nữa. `TRUSTED_PROXIES` để trống khi chưa có reverse proxy.

| Client | API base URL mẫu | Lưu ý |
|---|---|---|
| Next.js browser/SSR cùng máy backend | `http://localhost:3000/api/v1` | Chạy Next bằng `npm run dev -- --port 3001`; không trùng cổng backend |
| Android Emulator trên cùng PC | `http://10.0.2.2:3000/api/v1` | `localhost` trong emulator trỏ vào emulator |
| Expo trên điện thoại thật | `http://<IP-LAN-PC>:3000/api/v1` | Cùng mạng, backend/firewall cho phép truy cập; URL phải mở được `/health/live` từ điện thoại |
| Client khác máy hoặc triển khai | URL HTTPS public/staging của backend | CORS dùng origin Web thực; không dùng localhost của máy phát triển |

Copy [nextjs.env.example](nextjs.env.example) vào project Next và [expo.env.example](expo.env.example) vào project Expo. Đây là biến do bộ bàn giao đề xuất; FE cần đọc đúng tên trong code của mình. Biến `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` chỉ chứa API URL, client ID/app ID công khai. Provider secret, JWT secret, R2 key và DB URL ở backend. [Next env](https://nextjs.org/docs/pages/guides/environment-variables), [Expo env](https://docs.expo.dev/guides/environment-variables/).

## 2. JSON, auth và refresh

API bình thường trả:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "...",
  "data": { "...": "payload theo endpoint" },
  "timestamp": "2026-10-25T00:00:00.000Z"
}
```

FE đọc `body.data`. Error dùng HTTP status, `success:false`, `message`, `code` khi có và `details` cho lỗi nghiệp vụ. Sitemap/robots là raw XML/text; không gọi `.json()` cho hai loại endpoint này.

- Backend phát **GlowUp access JWT** và opaque refresh token trong JSON. Gọi route private bằng `Authorization: Bearer <accessToken>`. Google/Facebook token chỉ dùng cho OAuth exchange, không dùng làm Bearer của API order/profile.
- Backend hiện không tự đặt cookie. Với Next, nhóm có thể dùng BFF/Route Handler giữ refresh token trong HttpOnly cookie và tự xử lý CSRF/session phía Next; SSR fetch dữ liệu cá nhân phải dùng `cache: 'no-store'` và truyền session đúng user. Không dùng một token toàn cục cho nhiều request SSR. Nếu gọi trực tiếp từ browser, token storage/lifecycle phải được FE thiết kế rõ; contract backend vẫn là Bearer.
- Với Expo, giữ access token trong memory và refresh token trong [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/); xử lý trường hợp storage lỗi/mất token bằng đăng nhập lại. Không lưu provider secret trong app.
- Khi private API trả 401, thực hiện **một refresh đang chạy dùng chung trong mỗi session/client**: `POST /auth/refresh-token` với `{refreshToken}`. Lưu cả cặp token mới trước khi chạy request tiếp. Không refresh đệ quy trên chính route refresh/login; lỗi 401 refresh thì xóa session và đưa về login. Network/503/429 không đồng nghĩa session đã hết hạn; giữ trạng thái để thử lại có kiểm soát.
- Refresh đồng thời cùng token chỉ một request thắng; access token của session cũ cũng bị thu hồi. Nếu nhiều tab Next cùng giữ refresh token, phối hợp refresh hoặc dùng session BFF để tránh race. Logout gọi `/auth/logout` với refresh token rồi xóa local session.
- TTL theo env backend, không hardcode 7/30 ngày trong FE. Header `Retry-After` theo giây đã được CORS expose để browser đọc được. Không dùng `mode: 'no-cors'` để xử lý lỗi cấu hình.

## 3. Google cho Web và Expo

Backend đọc `GOOGLE_OAUTH_CLIENT_IDS` dạng danh sách audience được phép. Một Web Client ID có thể dùng làm server client ID cho native SDK; chỉ thêm audience khác khi token thực sự được phát với audience đó. Android/iOS vẫn cần đăng ký package/bundle/signing credentials tương ứng tại Google.

**Next.js:** cấu hình Google Identity Services ở client; đăng ký Authorized JavaScript Origin `http://localhost:3001` trong Google Cloud. Lấy `credential` (Google ID token) rồi gửi:

```http
POST /api/v1/auth/oauth/google
Content-Type: application/json

{"idToken":"<Google ID token>","clientNonce":"<random binding secret 32-128 characters>"}
```

Đây là JS callback → API JSON, không cấu hình API này làm GIS automatic form POST/login_uri: payload GIS tự POST không khớp DTO này. Nếu dùng Auth.js/authorization-code flow thì cần integration server riêng lấy đúng provider `id_token`; backend hiện không nhận `code`, Google access token hoặc Auth.js session JWT.

**Expo:** dùng native Google Sign-In SDK/config plugin theo phiên bản Expo mà nhóm chọn, cấu hình `webClientId` là Web Client ID backend đã allowlist để lấy `idToken`. Setup Android package/SHA-1 và iOS bundle ID/URL scheme theo SDK. Dùng **development build**, không dựa vào Expo Go để nghiệm thu native OAuth. [Expo Google auth](https://docs.expo.dev/guides/google-authentication/), [SDK integration notes](https://react-native-google-signin.github.io/docs/integration-notes).

`clientNonce` là secret binding riêng cho onboarding, không phải state/PKCE của redirect hoặc Google nonce do backend phát. Sinh ngẫu nhiên bằng Web Crypto/Expo Crypto; giữ lại tới khi flow hoàn tất/hết hạn, không ghi log hoặc đưa vào URL.

## 4. Facebook và nhánh onboarding/link

Backend hiện nhận **classic Facebook user access token** tại `POST /auth/oauth/facebook` với `{accessToken,clientNonce}`. Web dùng SDK của Meta; Expo dùng SDK có config plugin và development build, với app registration đúng platform. Không đưa App Secret vào Next public env/Expo bundle. [Expo Facebook auth](https://docs.expo.dev/guides/facebook-authentication/).

**Facebook Limited Login trên iOS chưa được hỗ trợ:** authentication token JWT/OIDC của Limited Login khác classic access token. Nếu SDK iOS trả token loại này, không gửi nó vào endpoint classic và không coi lỗi là vấn đề CORS. Cần bổ sung verifier Limited Login + nonce contract và test thiết bị trước cam kết Facebook iOS. Không bật tracking chỉ để né khác biệt token.

Sau Google hoặc Facebook exchange, kiểm tra `body.data`:

| Kết quả | UI cần làm |
|---|---|
| Có `accessToken`, `refreshToken`, `user` | Lưu GlowUp session, chuyển vào app |
| `EMAIL_VERIFICATION_REQUIRED`, `challenge`, `expiresIn:600` | Chưa login. Nhập/xác nhận email → gửi `/auth/oauth/email` với `{challenge,clientNonce,email}` → nhập mã email → `/auth/oauth/complete` với `{challenge,clientNonce,verificationToken}` |
| `ACCOUNT_LINK_REQUIRED` | Chưa login bằng identity mới. Đăng nhập tài khoản GlowUp đã có; gửi mã tới đúng email, sau đó `/auth/oauth/link` với Bearer của user đích và `{challenge,clientNonce,verificationToken}` |

Challenge/mã dùng một lần, hạn 10 phút; hết hạn phải bắt đầu lại. Email có sẵn không được tự merge. Nếu onboarding phát hiện email đã có, dùng login/link thay vì lặp `/complete`. SMTP phải hoạt động thật, API không trả mã để bypass xác minh. Provider đã link không đổi email GlowUp theo claim mới.

Hiện Google key endpoint truy cập được và Meta chấp nhận App credentials. **Chưa có token người dùng thật** để xác nhận login SDK. Hai trạng thái probe này không chứng minh client registration/origin/permissions/consent đã đúng.

## 5. Các contract mobile/Web dễ dùng sai

- **Guest cart:** giữ UUID guest session riêng và gửi `X-Session-Id` theo spec; không dùng Expo device token làm guest session. Sau login gọi luồng merge cart, không tự chuyển userId trong request.
- **Checkout:** preview trước, lấy `quoteVersion`, hiển thị số tiền server trả, rồi tạo đơn với quote đã xác nhận. Khi 409 `ORDER_PRICE_CHANGED`, dùng `details.pricing/quoteVersion` để xác nhận lại. Không tính lại giá/điểm authoritative ở client.
- **Idempotency:** một key mới cho mỗi command order/return/redeem, retry cùng payload phải giữ nguyên `Idempotency-Key`. Không tự retry write bằng key mới khi network timeout. Body đổi thì cần command/key mới sau khi đã đối soát kết quả cũ.
- **Payment:** hiện chỉ COD được bật; online payment vẫn có gate `ONLINE_PAYMENT_MODULE_REQUIRED`. Không hiển thị gateway là đã tích hợp chỉ vì enum có tên provider.
- **Upload:** theo OpenAPI dùng multipart `file`; không tự gắn Content-Type JSON hoặc tự viết multipart boundary. Return evidence private dùng endpoint riêng và link tạm; bucket chưa được cấu hình trong `.env` hiện tại. `next/image` cần cho phép hostname public R2 trong `images.remotePatterns` của project Next.
- **Push Expo:** backend dùng Firebase Admin/FCM. `ExpoPushToken[...]` và `ExponentPushToken[...]` bị từ chối khi đăng ký `/users/me/devices`. Android cần native FCM registration token. iOS native APNs token không thể gửi thẳng tới FCM worker này; cần lấy FCM registration token qua integration Firebase tương ứng hoặc triển khai APNs/Expo Push adapter riêng. [Expo FCM/APNs](https://docs.expo.dev/push-notifications/sending-notifications-custom/). Chưa có test gửi push thật trên thiết bị.
- **Notification/deep link:** dùng resource ID để gọi lại API kiểm tra ownership; không hiển thị dữ liệu đơn/return riêng chỉ dựa trên push payload.

## 6. SEO root trên Next.js

Backend sinh URL website theo `PUBLIC_WEB_URL`; mapping mặc định là `/products/:slug`, `/categories/:slug`, `/blog/:slug`, `/:pageSlug`. FE cần xác nhận route thực hoặc đổi mapping trước nghiệm thu SEO.

Proxy đủ index, phần con và robots tại root Next; ví dụ phần cấu hình `rewrites()` của Next:

```js
async rewrites() {
  const api = process.env.BACKEND_API_BASE_URL;
  return [
    { source: '/sitemap.xml', destination: `${api}/sitemap.xml` },
    { source: '/sitemaps/:path*', destination: `${api}/sitemaps/:path*` },
    { source: '/robots.txt', destination: `${api}/robots.txt` },
  ];
}
```

Chọn một cơ chế phục vụ các URL này; tránh thêm route sitemap/robots của Next cùng lúc làm trùng đường dẫn. Giữ `SEO_INDEXING_ENABLED=false` ở local/staging. API không render JSON-LD/OpenGraph cho FE.

## 7. Trạng thái nghiệm thu và các việc còn lại

| Phần | Bằng chứng hiện có | Trước bàn giao chạy thật |
|---|---|---|
| HTTP/session/OAuth contract | Unit + PostgreSQL/HTTP fixtures; Google chữ ký RSA fixture, Meta HTTP fixture | Login từ browser và native SDK với token thật |
| Next browser | Preflight Authorization/Content-Type/Idempotency-Key/X-Session-Id, CORS origin allowlist, expose Retry-After | Source Next, Google JS origin và UI flow |
| Expo | Native-style Bearer request không Origin; reject Expo Push token sai loại | Development build, package/bundle/signing config, API qua LAN/HTTPS |
| DB trong `.env` | Read-only probe báo `migration_required` | Review/backup và deploy 4 migration đang thiếu; không chạy regression vào DB này |
| SMTP | Thiếu SMTP_USER/SMTP_PASS | Cấu hình và test email/onboarding/link/reset thật |
| Storage | Public R2 đã có cấu hình; return private bucket thiếu | Tạo bucket private, cấp quyền key, điền RETURN_STORAGE_* |
| Facebook iOS / push iOS | Có ghi rõ khác biệt token | Chốt SDK/token flow và bổ sung adapter nếu cần |

Các migration DB hiện còn thiếu theo lần probe: `20261007132710_add_pos_inventory_constraints`, `20261024000000_customer_sprint4`, `20261025000000_customer_sprint5`, `20261025000000_sprint6_identity_seo`. Chúng có constraint/backfill nghiệp vụ; chưa tự áp dụng lên DB dùng chung để chỉ chạy kiểm thử. Xem preflight/backup/runbook ở [sprint-6.md](../sprint-6.md).

Tái kiểm chứng:

```powershell
# backend: đọc config, DB migration state và probe provider, không sửa dữ liệu.
node scripts/sprint6-client-readiness.cjs

# Local disposable schemas; chọn suffix mới mỗi lần cần fixture sạch.
$env:SPRINT4_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint4_client_handoff_new'
$env:SPRINT5_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint5_client_handoff_new'
$env:SPRINT6_TEST_DATABASE_URL='postgresql://sprint4_test@127.0.0.1:55434/postgres?schema=sprint6_client_handoff_new'
node node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand
node node_modules/jest/bin/jest.js --runInBand
npm run build
```
