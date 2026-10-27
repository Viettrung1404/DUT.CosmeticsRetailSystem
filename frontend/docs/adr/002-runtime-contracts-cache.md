# ADR-002 — Runtime, contracts và caching FE-00

Ngày: 26/10/2026. Trạng thái: áp dụng.

- Next 16.4.3 stable, React/React DOM 19.3.1, TypeScript 5 strict, Node baseline 22.14.0 (phù hợp backend >=22.12). Patch dependency pin trong package.json, transitive pin trong package-lock.json; dùng npm ci. Không canary. Xem phiên bản cụ thể trong package.json thay vì duy trì bảng phiên bản trùng lặp.
- Tailwind 4/PostCSS; shadcn config theo semantic CSS variables, chưa thêm primitives không dùng. TanStack Query, RHF + Zod; resolver 5.x tương thích Zod 4 (resolver 6 có peer dependency effect xung đột khi bootstrap). Chưa cần Zustand, MSW hay plugin bundler.
- Vitest cho contract/transport/route guards, Playwright cho runtime smoke desktop/mobile. Testing Library có sẵn cho component tests FE-01.
- ESLint 9.39.5 pin theo peer compatibility của eslint-plugin-react/import trong eslint-config-next. Registry đã đánh dấu nhánh 9 deprecated; chuyển ESLint 10 khi các plugin hỗ trợ, không ép peer mismatch. Đây là giới hạn dev tooling, không dependency runtime.
- Backend spec là nguồn generated types. `contracts:check` regenerate vào memory và so sánh nội dung + SHA256 snapshot, không ghi đè khi check. Spec generic vẫn generic; không sửa backend hoặc phát minh DTO để làm codegen đẹp. Runtime schema theo endpoint và nguồn source được ghi rõ; health schema đối chiếu HealthController. O02 vẫn chặn integration liên quan.
- Envelope unwrap đúng một lớp; data/meta hay items/total giữ nguyên cho adapter riêng. HTTP errors giữ code/details/Retry-After/request ID; UI chỉ dùng message tiếng Việt đã chọn, không render upstream body/stack. Transport timeout, no-store và redirect:error; không auto retry mutation.
- `server-only` bảo vệ env/upstream client. Server Components gọi Nest trực tiếp. Browser chỉ GET BFF same-origin; mutations và auth broker thuộc FE-01. Không có public generic proxy.
- `cacheComponents: false` ở baseline. Spike FE-00 sử dụng dynamic diagnostic SSR + no-store; chưa có public resource với invalidation contract để đáng dùng cache bền. Bật Cache Components sau một spike riêng cho resource public và private isolation. Đây là quyết định trì hoãn opt-in, không tuyên bố đã benchmark Cache Components. Không thêm `use cache` cho catalog hay phiên.
- Production build không cần backend đang online. Diagnostic page dùng `connection()` để đọc runtime env, luôn 404 production, local chỉ bật bằng FE_DIAGNOSTICS. Health/live xác nhận process; health/ready mới kiểm tra dependency nhưng không chứng minh payment/SMTP/OAuth.
- Default noindex toàn app cho đến FE-07. SEO raw proxy sitemap/robots và CMS alias thuộc phase content/release, tránh dựng proxy chưa có origin/indexing configuration.
- Fonts dùng next/font Google (Montserrat/Be Vietnam Pro), được self-host sau build. CI/build cần truy cập nguồn font; không fallback sang CDN runtime.
- Primary #C85A70, background #F9ECEE, foreground #412E27; contrast trắng/primary đo bằng relative luminance là 4.08:1, action/text đậm #9D394F là 6.71:1. Dùng action cho chữ nhỏ/button, không thay brand primary. Container 1280px, radius 12px, focus ring và reduced-motion baseline.

Nguồn: [Next installation](https://nextjs.org/docs/app/getting-started/installation), [security update 14/10/2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents). Kiểm tra registry npm thực tế tại bootstrap, không chỉ dựa vào số version trong kế hoạch.
