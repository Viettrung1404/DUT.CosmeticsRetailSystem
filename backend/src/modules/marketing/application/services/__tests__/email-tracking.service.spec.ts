import { ConfigService } from '@nestjs/config';
import { EmailTrackingService } from '../email-tracking.service';

const service = (publicApiUrl?: string) =>
  new EmailTrackingService({
    get: (key: string) => (key === 'PUBLIC_API_URL' ? publicApiUrl : undefined),
    getOrThrow: () => 'khoa-bi-mat-chi-de-test-du-32-ky-tu',
  } as unknown as ConfigService);

const campaign = { id: 'c1', title: 'Ưu đãi', content: '<p>Chào {{fullName}}</p><a href="https://glowup.vn/sale?a=1&amp;b=2">Xem</a>' };
const recipient = { userId: 'u1', email: 'a@x.vn', fullName: 'Lan <b>' };

describe('EmailTrackingService', () => {
  const tracking = service('https://api.glowup.vn/api/v1/');

  it('token đúng thì đọc lại được, sai loại thì bị từ chối', () => {
    const token = tracking.token({ campaignId: 'c1', userId: 'u1', kind: 'click', url: 'https://glowup.vn' });
    expect(tracking.verify(token, 'click')?.url).toBe('https://glowup.vn');
    expect(tracking.verify(token, 'open')).toBeNull();
  });

  it('đổi link đích trong token thì chữ ký không khớp, không thành chuyển hướng tự do', () => {
    const token = tracking.token({ campaignId: 'c1', userId: 'u1', kind: 'click', url: 'https://glowup.vn' });
    const forged = Buffer.from(
      JSON.stringify({ campaignId: 'c1', userId: 'u1', kind: 'click', url: 'https://ke-xau.example' }),
    ).toString('base64url');
    expect(tracking.verify(`${forged}.${token.split('.')[1]}`, 'click')).toBeNull();
  });

  it('token rác không làm lỗi', () => {
    expect(tracking.verify('rac', 'open')).toBeNull();
    expect(tracking.verify('a.b', 'open')).toBeNull();
  });

  it('thư có điền tên đã thoát HTML, link được bọc, có ảnh theo dõi và link hủy nhận', () => {
    const { html, text } = tracking.render(campaign, recipient);
    expect(html).toContain('Chào Lan &lt;b&gt;');
    expect(html).not.toContain('href="https://glowup.vn/sale');
    expect(html).toContain('href="https://api.glowup.vn/api/v1/email/c/');
    expect(html).toContain('src="https://api.glowup.vn/api/v1/email/o/');
    expect(html).toContain('https://api.glowup.vn/api/v1/email/u/');
    expect(text).toContain('Hủy nhận thư khuyến mãi');
    const link = /email\/c\/([^"]+)"/.exec(html)?.[1] as string;
    expect(tracking.verify(link, 'click')?.url).toBe('https://glowup.vn/sale?a=1&b=2');
  });

  it('chưa cấu hình PUBLIC_API_URL thì vẫn gửi được, chỉ không theo dõi', () => {
    const { html } = service().render(campaign, recipient);
    expect(html).toContain('href="https://glowup.vn/sale');
    expect(html).not.toContain('/email/o/');
  });
});
