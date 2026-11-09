import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { MockCarrierAdapter } from '../mock-carrier.adapter';

const adapter = (secret: string | null = 's3cret') =>
  new MockCarrierAdapter({ get: () => secret ?? undefined } as never);

const event = { eventId: 'E1', trackingCode: 'MOCKABC', status: 'PICKED_UP', occurredAt: new Date('2026-11-09T03:00:00Z') };

describe('MockCarrierAdapter', () => {
  it('sự kiện ký đúng thì đọc được', () => {
    const a = adapter();
    const { body, headers } = a.buildSignedWebhook(event);
    expect(a.parseWebhook(body, headers)).toEqual(event);
  });

  it('chữ ký sai -> 401', () => {
    const a = adapter();
    const { body } = a.buildSignedWebhook(event);
    expect(() => a.parseWebhook(body, { 'x-carrier-signature': 'ab'.repeat(32) })).toThrow(UnauthorizedException);
  });

  it('thiếu chữ ký -> 401', () => {
    const a = adapter();
    const { body } = a.buildSignedWebhook(event);
    expect(() => a.parseWebhook(body, {})).toThrow(UnauthorizedException);
  });

  it('sửa trạng thái sau khi ký -> 401', () => {
    const a = adapter();
    const { body, headers } = a.buildSignedWebhook(event);
    expect(() => a.parseWebhook({ ...body, status: 'DELIVERED' }, headers)).toThrow(UnauthorizedException);
  });

  it('ký bằng khóa khác -> 401', () => {
    const { body, headers } = adapter('khoa-khac').buildSignedWebhook(event);
    expect(() => adapter().parseWebhook(body, headers)).toThrow(UnauthorizedException);
  });

  it('chưa cấu hình khóa -> 503', () => {
    expect(() => adapter(null).parseWebhook({}, { 'x-carrier-signature': 'aa' })).toThrow(ServiceUnavailableException);
  });

  it('trạng thái lạ dù ký đúng -> 400', () => {
    const a = adapter();
    const { body, headers } = a.buildSignedWebhook({ ...event, status: 'LẠ' });
    expect(() => a.parseWebhook(body, headers)).toThrow(BadRequestException);
  });

  it('tạo vận đơn trả mã vận chuyển riêng từng lần', async () => {
    const a = adapter();
    const req = {} as never;
    const [x, y] = await Promise.all([a.createShipment(req), a.createShipment(req)]);
    expect(x.trackingCode).not.toEqual(y.trackingCode);
    expect(x.trackingCode.startsWith('MOCK')).toBe(true);
  });
});
