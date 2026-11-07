import { autoSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '../seo.util';

describe('autoSeo', () => {
  it('giữ nguyên trường người dùng đã nhập', () => {
    expect(
      autoSeo({ title: 'Son', description: 'Mô tả', metaTitle: ' Tiêu đề ', metaDescription: 'Riêng' }),
    ).toEqual({ metaTitle: 'Tiêu đề', metaDescription: 'Riêng' });
  });

  it('để trống thì sinh từ tên và mô tả, bỏ thẻ HTML', () => {
    expect(autoSeo({ title: 'Son lì', description: '<p>Son <b>mịn</b>&nbsp;môi</p>', metaTitle: '  ' })).toEqual({
      metaTitle: 'Son lì',
      metaDescription: 'Son mịn môi',
    });
  });

  it('cắt đúng độ dài, không đứt giữa từ', () => {
    const words = 'kem dưỡng ẩm '.repeat(40);
    const seo = autoSeo({ title: words, description: words });
    expect(seo.metaTitle.length).toBeLessThanOrEqual(SEO_TITLE_MAX);
    expect(seo.metaDescription?.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX);
    expect(seo.metaTitle.endsWith('kem') || seo.metaTitle.endsWith('dưỡng') || seo.metaTitle.endsWith('ẩm')).toBe(true);
  });

  it('không có mô tả thì metaDescription là null', () => {
    expect(autoSeo({ title: 'Son' }).metaDescription).toBeNull();
  });
});
