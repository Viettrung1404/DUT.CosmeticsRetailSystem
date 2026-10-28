import sanitizeHtml = require('sanitize-html');

/** Shared with CMS writers; reads also sanitize legacy content before exposure. */
export function publicHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
    ],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
  });
}

export function publicUrl(
  value: string | null,
  allowRoute = false,
): string | null {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return null;
  if (
    allowRoute &&
    /^\/(?:customer\/products|blog\/posts|pages|promotions)(?:\/[a-zA-Z0-9_-]+)*$/.test(
      value,
    )
  )
    return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
