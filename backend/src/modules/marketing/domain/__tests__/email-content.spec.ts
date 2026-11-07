import { htmlToText, personalize, rewriteLinks, toHtmlBody } from '../email-content';

describe('nội dung email', () => {
  it('văn bản thuần thì thoát ký tự và giữ xuống dòng', () => {
    expect(toHtmlBody('Giảm <30%\nHôm nay')).toBe('Giảm &lt;30%<br>Hôm nay');
  });

  it('nội dung có thẻ HTML thì giữ nguyên', () => {
    expect(toHtmlBody('<p>Chào</p>')).toBe('<p>Chào</p>');
  });

  it('không có tên thì gọi Quý khách', () => {
    expect(personalize('Chào {{ fullName }}, {{email}}', { fullName: null, email: 'a@x.vn' })).toBe(
      'Chào Quý khách, a@x.vn',
    );
  });

  it('chỉ bọc link http(s), không đụng mailto', () => {
    const html = '<a href="https://a.vn">A</a><a href="mailto:b@x.vn">B</a>';
    expect(rewriteLinks(html, () => 'WRAP')).toBe('<a href="WRAP">A</a><a href="mailto:b@x.vn">B</a>');
  });

  it('bản văn bản giữ link và bỏ thẻ', () => {
    expect(htmlToText('<p>Xem <a href="https://a.vn">tại đây</a></p><br>Hết')).toBe(
      'Xem tại đây (https://a.vn)\n\nHết',
    );
  });
});
