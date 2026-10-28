const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

// S30 stays a standalone document when React or the session store is unavailable.
export function maintenanceDocument(message?: string) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Bảo trì | GlowUp</title><style>
  :root{--primary:#c85a70;--action:#9d394f;--background:#f9ecee;--foreground:#412e27}
  *{box-sizing:border-box}body{margin:0;background:var(--background);color:var(--foreground);font:15px/1.7 system-ui,sans-serif}
  a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid var(--action);outline-offset:4px}
  .brand{text-align:center;padding:48px 20px 28px}.brand img{width:88px;height:88px;border:7px solid white;border-radius:18px}.brand p{color:var(--action);font-size:11px;letter-spacing:2px;margin:14px 0 0}
  main{width:min(1040px,calc(100% - 48px));margin:auto;background:white;border-radius:24px;padding:48px clamp(24px,7vw,100px);text-align:center;box-shadow:0 16px 30px -20px #9d394f30}
  .eyebrow{display:inline-block;padding:6px 18px;background:#fff1ec;color:var(--action);border-radius:30px;font-size:11px;font-weight:600;letter-spacing:.5px}
  h1{max-width:740px;margin:24px auto 20px;font-size:clamp(26px,3.2vw,38px);line-height:1.3;letter-spacing:-1px}main>p{max-width:700px;margin:0 auto 30px;color:#776d6d}
  .status{padding:26px;background:#fefafc;border-radius:18px;text-align:left;margin:32px 0}.status strong{display:block;color:var(--action);font-size:13px}.status p{margin:10px 0 0;color:#776d6d;font-size:13px}
  .button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 24px;background:var(--action);color:white;border-radius:10px;font-weight:600;font-size:14px}
  .support{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:36px;text-align:left}.support a{background:#fefafc;border-radius:16px;padding:22px}.support strong{display:block;font-size:14px}.support span{display:block;font-size:12px;color:#776d6d;margin-top:6px}
  footer{padding:28px 24px 42px;text-align:center;color:#776d6d;font-size:12px}footer a{margin-left:18px}
  @media(max-width:600px){.brand{padding-top:28px}main{width:calc(100% - 32px);padding:30px 22px;border-radius:18px}.support{grid-template-columns:1fr}.status{padding:20px}h1{font-size:27px}footer a{display:block;margin:10px 0 0}}
  </style></head><body><header class="brand"><a href="/" aria-label="GlowUp — Trang chủ"><img src="/images/stitch/glowup-logo.webp" width="88" height="88" alt="GlowUp"></a><p>● GLOWUP BEAUTY RETAIL</p></header><main id="main-content"><span class="eyebrow">HỆ THỐNG ĐANG BẢO TRÌ</span><h1>GlowUp đang được chăm chút để hoàn hảo hơn!</h1><p>${escapeHtml(message || "Chúng tôi đang bảo trì để mang đến trải nghiệm mua sắm thuận tiện hơn. Vui lòng quay lại sau.")}</p><div class="status"><strong>Chúng tôi sẽ sớm trở lại</strong><p>Trong thời gian này, các thao tác mua sắm trực tuyến tạm thời chưa khả dụng. Bạn có thể thử tải lại trang sau ít phút.</p></div><a href="/" class="button">Thử lại trang chủ →</a><div class="support"><a href="/stores"><strong>Hệ thống cửa hàng</strong><span>Tìm thông tin showroom khi hệ thống hoạt động trở lại.</span></a><a href="/help"><strong>Hỗ trợ khách hàng</strong><span>Thông tin hỗ trợ được cập nhật tại trung tâm trợ giúp.</span></a></div></main><footer>© 2026 GlowUp Beauty Retail.<a href="/">Về trang chủ</a></footer></body></html>`;
}

export function maintenanceResponse(message?: string, retryAfter = "300") {
  return new Response(maintenanceDocument(message), { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": /^\d+$/.test(retryAfter) ? retryAfter : "300", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
