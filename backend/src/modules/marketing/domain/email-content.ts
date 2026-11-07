const HTML_TAG = /<[a-z][\s\S]*>/i;

export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Nội dung gõ tay không có thẻ HTML thì giữ xuống dòng
export const toHtmlBody = (content: string): string =>
  HTML_TAG.test(content) ? content : escapeHtml(content).replace(/\r?\n/g, '<br>');

export const personalize = (html: string, recipient: { fullName: string | null; email: string }): string =>
  html
    .replace(/\{\{\s*fullName\s*\}\}/g, escapeHtml(recipient.fullName?.trim() || 'Quý khách'))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(recipient.email));

export const rewriteLinks = (html: string, wrap: (url: string) => string): string =>
  html.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_match, quote: string, url: string) => {
    const decoded = url.replace(/&amp;/g, '&');
    return `href=${quote}${wrap(decoded)}${quote}`;
  });

export const htmlToText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const emailLayout = (title: string, body: string, footer: string): string => `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f6f4f2;font-family:Arial,sans-serif;color:#2b2b2b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px">
<tr><td style="padding:24px 32px;font-size:20px;font-weight:bold;border-bottom:1px solid #eee">GlowUp Cosmetics</td></tr>
<tr><td style="padding:24px 32px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 32px;font-size:12px;color:#888;border-top:1px solid #eee">${footer}</td></tr>
</table></td></tr></table>
</body></html>`;
