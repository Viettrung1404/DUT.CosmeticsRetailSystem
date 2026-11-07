export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

// Cắt ở khoảng trắng gần nhất để không đứt giữa từ
const clip = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trim();
};

// Trường SEO để trống thì tự sinh từ tên và mô tả; người dùng đã nhập thì giữ nguyên
export function autoSeo(input: {
  title: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}): { metaTitle: string; metaDescription: string | null } {
  return {
    metaTitle: input.metaTitle?.trim() || clip(input.title.trim(), SEO_TITLE_MAX),
    metaDescription:
      input.metaDescription?.trim() || clip(stripHtml(input.description ?? ''), SEO_DESCRIPTION_MAX) || null,
  };
}
