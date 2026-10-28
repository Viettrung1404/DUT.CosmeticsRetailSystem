import { publicHtml, publicUrl } from './public-content';
describe('Public content security', () => {
  it('removes scripts, event handlers, iframe/SVG and javascript/data links', () => {
    const html = publicHtml(
      '<p onclick="steal()">Hello</p><script>alert(1)</script><svg onload="steal()"></svg><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">link</a><a href="https://example.com">ok</a>',
    );
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toMatch(/script|onclick|onload|iframe|svg|javascript:/i);
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    '//evil.test',
    'https://user:pass@example.com',
    '/\\evil.test',
    '/orders/private',
  ])('rejects unsafe URL %s', (value) =>
    expect(publicUrl(value, true)).toBeNull(),
  );
  it('accepts HTTPS and allowlisted public routes', () => {
    expect(publicUrl('/customer/products/son', true)).toBe(
      '/customer/products/son',
    );
    expect(publicUrl('https://cdn.example.com/image.webp')).toBe(
      'https://cdn.example.com/image.webp',
    );
  });
});
