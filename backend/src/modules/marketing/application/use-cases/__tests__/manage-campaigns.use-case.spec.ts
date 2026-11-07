import { EmailTrackingService } from '../../services/email-tracking.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  CampaignView,
  ICampaignRepository,
} from '../../../domain/repositories/campaign.repository.interface';
import { IPromotionRepository } from '../../../domain/repositories/promotion.repository.interface';
import { canTransition, chunk, validateAudience, validateChannelTarget } from '../../../domain/campaign-rules';
import { ManageCampaignsUseCase } from '../manage-campaigns.use-case';
import { ManagePromotionsUseCase, promotionRoi } from '../manage-promotions.use-case';

const ID = '11111111-1111-4111-8111-111111111111';
const TIER = '22222222-2222-4222-8222-222222222222';
const RES = '33333333-3333-4333-8333-333333333333';

const campaign = (over: Partial<CampaignView> = {}): CampaignView => ({
  id: ID,
  name: 'Sale',
  channel: 'PUSH',
  audienceType: 'ALL',
  audienceValue: null,
  title: 'Tiêu đề',
  content: 'Nội dung',
  route: 'PROMOTION',
  resourceId: RES,
  status: 'DRAFT',
  scheduledAt: null,
  sentAt: null,
  recipientCount: 0,
  sendVersion: 0,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const repo = (current = campaign()): jest.Mocked<ICampaignRepository> => ({
  find: jest.fn(),
  findById: jest.fn().mockResolvedValue(current),
  create: jest.fn(async (d, _by) => campaign(d)),
  update: jest.fn(async (_id, d) => campaign(d)),
  transition: jest.fn(async (_id, _from, to) => campaign({ status: to })),
  findDueIds: jest.fn().mockResolvedValue([]),
  findTierIds: jest.fn().mockResolvedValue([TIER]),
  findCustomerIds: jest.fn(),
  resolveRecipients: jest.fn().mockResolvedValue([{ userId: 'a', email: 'a@x.vn' }]),
  dispatch: jest.fn(async (c, r) => campaign({ status: 'SENT', recipientCount: r.length, id: c.id })),
  getStats: jest.fn().mockResolvedValue({ recipientCount: 1, push: { recipients: 1, delivered: 1, deliveries: {} }, email: {}, engagement: null }),
  recordEmailEvent: jest.fn(),
  setEmailOptOut: jest.fn(),
});

const segmentPort = (ids: string[] = []) => ({
  customerIdsBySegments: jest.fn().mockResolvedValue(ids),
});

const tracking = {
  render: jest.fn((_campaign, r: { email: string }) => ({ html: `<p>${r.email}</p>`, text: r.email })),
} as unknown as EmailTrackingService;

const make = (r: jest.Mocked<ICampaignRepository>, seg = segmentPort()) =>
  new ManageCampaignsUseCase(r, seg, tracking);

const input = {
  name: ' Sale ',
  channel: 'PUSH' as const,
  audienceType: 'ALL' as const,
  title: 'T',
  content: 'C',
  route: 'PROMOTION' as const,
  resourceId: RES,
};

describe('quy tắc chiến dịch', () => {
  it('chia mảng theo lô', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it('chuyển trạng thái hợp lệ / không hợp lệ', () => {
    expect(canTransition('DRAFT', 'SCHEDULED')).toBe(true);
    expect(canTransition('SCHEDULED', 'SENDING')).toBe(true);
    expect(canTransition('SENT', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'SENDING')).toBe(false);
  });

  it('đối tượng TIER / CUSTOMERS phải có danh sách, bỏ trùng', () => {
    expect(validateAudience('ALL', { tierIds: ['x'] })).toBeNull();
    expect(validateAudience('TIER', { tierIds: ['a', 'a', 'b'] })).toEqual({ tierIds: ['a', 'b'] });
    expect(() => validateAudience('CUSTOMERS', {})).toThrow(BadRequestException);
  });

  it('đối tượng theo nhóm RFM: bỏ trùng, không chọn cùng danh sách khách', () => {
    expect(validateAudience('CUSTOMERS', { rfmSegments: ['AT_RISK', 'AT_RISK', 'LOST'] })).toEqual({
      rfmSegments: ['AT_RISK', 'LOST'],
    });
    expect(() =>
      validateAudience('CUSTOMERS', { rfmSegments: ['LOST'], customerIds: ['c1'] }),
    ).toThrow(BadRequestException);
  });

  it('push bắt buộc có nơi mở, email thì bỏ qua', () => {
    expect(() => validateChannelTarget('PUSH', null, null)).toThrow(BadRequestException);
    expect(validateChannelTarget('EMAIL', 'BLOG', RES)).toEqual({ route: null, resourceId: null });
  });
});

describe('ManageCampaignsUseCase', () => {
  it('tạo chiến dịch chuẩn hóa tên, kiểm tra hạng tồn tại', async () => {
    const r = repo();
    const useCase = make(r);
    await useCase.create('u1', { ...input, audienceType: 'TIER', audienceValue: { tierIds: [TIER] } });
    expect(r.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sale', audienceValue: { tierIds: [TIER] } }), 'u1');

    r.findTierIds.mockResolvedValue([]);
    await expect(
      useCase.create('u1', { ...input, audienceType: 'TIER', audienceValue: { tierIds: [TIER] } }),
    ).rejects.toThrow('Có hạng thành viên không tồn tại');
  });

  it('tên, tiêu đề, nội dung chỉ toàn khoảng trắng thì bị từ chối', async () => {
    const r = repo();
    const useCase = make(r);
    for (const blank of [{ name: '   ' }, { title: ' ' }, { content: '  ' }]) {
      await expect(useCase.create('u1', { ...input, ...blank })).rejects.toThrow(BadRequestException);
    }
    expect(r.create).not.toHaveBeenCalled();
  });

  it('chỉ sửa được bản nháp', async () => {
    const useCase = make(repo(campaign({ status: 'SCHEDULED' })));
    await expect(useCase.update(ID, input)).rejects.toThrow(ConflictException);
  });

  it('hẹn giờ phải ở tương lai và không hẹn được chiến dịch đã gửi', async () => {
    const now = new Date('2026-11-10T00:00:00Z');
    const useCase = make(repo());
    await expect(useCase.schedule(ID, new Date('2026-11-09T00:00:00Z'), now)).rejects.toThrow(BadRequestException);
    await expect(
      make(repo(campaign({ status: 'SENT' }))).schedule(ID, new Date('2026-11-11T00:00:00Z'), now),
    ).rejects.toThrow(ConflictException);
    const ok = await useCase.schedule(ID, new Date('2026-11-11T00:00:00Z'), now);
    expect(ok.status).toBe('SCHEDULED');
  });

  it('gửi ngay: lấy người nhận rồi dispatch; email chỉ lấy khách đã xác thực', async () => {
    const r = repo(campaign({ channel: 'EMAIL', route: null, resourceId: null }));
    const sent = await make(r).send(ID);
    expect(r.resolveRecipients).toHaveBeenCalledWith('ALL', null, true);
    expect(sent.recipientCount).toBe(1);
  });

  it('email: mỗi người nhận có thư riêng', async () => {
    const r = repo(campaign({ channel: 'EMAIL', route: null, resourceId: null }));
    await make(r).send(ID);
    expect(r.dispatch.mock.calls[0][1][0]).toMatchObject({ html: '<p>a@x.vn</p>', text: 'a@x.vn' });
  });

  it('push: không dựng thư', async () => {
    const r = repo(campaign());
    await make(r).send(ID);
    expect(r.dispatch.mock.calls[0][1][0].html).toBeUndefined();
  });

  it('gửi theo nhãn khách: truyền nhãn cho repository, không gọi RFM', async () => {
    const r = repo(campaign({ audienceType: 'CUSTOMERS', audienceValue: { customerTags: ['VIP'] } }));
    const seg = segmentPort();
    await make(r, seg).send(ID);
    expect(seg.customerIdsBySegments).not.toHaveBeenCalled();
    expect(r.resolveRecipients).toHaveBeenCalledWith('CUSTOMERS', { customerTags: ['VIP'] }, false);
  });

  it('chỉ được chọn một kiểu đối tượng trong CUSTOMERS', () => {
    expect(() =>
      validateAudience('CUSTOMERS', { customerTags: ['VIP'], rfmSegments: ['LOST'] }),
    ).toThrow(BadRequestException);
    expect(validateAudience('CUSTOMERS', { customerTags: ['VIP', 'VIP'] })).toEqual({ customerTags: ['VIP'] });
  });

  it('nội dung push quá 2000 ký tự trả 400, email thì được', async () => {
    const r = repo(campaign());
    await expect(make(r).create('u', { ...input, content: 'x'.repeat(2001) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      make(r).create('u', { ...input, channel: 'EMAIL', route: null, resourceId: null, content: 'x'.repeat(2001) }),
    ).resolves.toBeDefined();
  });

  it('gửi theo nhóm RFM: tính danh sách khách lúc gửi rồi lọc như CUSTOMERS', async () => {
    const r = repo(campaign({ audienceType: 'CUSTOMERS', audienceValue: { rfmSegments: ['AT_RISK'] } }));
    const seg = segmentPort(['c1', 'c2']);
    await make(r, seg).send(ID);
    expect(seg.customerIdsBySegments).toHaveBeenCalledWith(['AT_RISK']);
    expect(r.resolveRecipients).toHaveBeenCalledWith('CUSTOMERS', { customerIds: ['c1', 'c2'] }, false);
  });

  it('không có người nhận thì báo lỗi, không dispatch', async () => {
    const r = repo();
    r.resolveRecipients.mockResolvedValue([]);
    await expect(make(r).send(ID)).rejects.toThrow(BadRequestException);
    expect(r.dispatch).not.toHaveBeenCalled();
  });

  it('dispatch trả null (bị gửi/hủy cùng lúc) thì báo xung đột', async () => {
    const r = repo();
    r.dispatch.mockResolvedValue(null);
    await expect(make(r).send(ID)).rejects.toThrow(ConflictException);
  });

  it('hủy chiến dịch đã gửi bị chặn; không tìm thấy thì 404', async () => {
    await expect(make(repo(campaign({ status: 'SENT' }))).cancel(ID)).rejects.toThrow(ConflictException);
    const r = repo();
    r.findById.mockResolvedValue(null);
    await expect(make(r).detail(ID)).rejects.toThrow(NotFoundException);
  });

  it('lối tắt gửi push: lỗi khi gửi thì chiến dịch tạm bị hủy', async () => {
    const r = repo();
    r.resolveRecipients.mockResolvedValue([]);
    await expect(make(r).createAndSend('u1', input)).rejects.toThrow(BadRequestException);
    expect(r.transition).toHaveBeenCalledWith(ID, ['DRAFT'], 'CANCELLED');
  });

  it('job hẹn giờ gửi chiến dịch tới hạn, hủy chiến dịch không còn người nhận', async () => {
    const r = repo(campaign({ status: 'SCHEDULED' }));
    r.findDueIds.mockResolvedValue([ID, 'x']);
    r.findById.mockImplementation(async (id) => campaign({ id, status: 'SCHEDULED' }));
    r.resolveRecipients.mockResolvedValueOnce([{ userId: 'a', email: 'a@x.vn' }]).mockResolvedValueOnce([]);
    const sent = await make(r).sendDue();
    expect(sent).toBe(1);
    expect(r.transition).toHaveBeenCalledWith('x', ['SCHEDULED'], 'CANCELLED');
  });
});

describe('thống kê khuyến mãi', () => {
  it('ROI = (doanh thu - tiền giảm) / tiền giảm', () => {
    expect(promotionRoi(1_000_000, 100_000)).toBe(9);
    expect(promotionRoi(150_000, 100_000)).toBe(0.5);
    expect(promotionRoi(500_000, 0)).toBeNull();
  });

  it('gộp số liệu từ repository kèm ROI', async () => {
    const promoRepo = {
      findPromotion: jest.fn().mockResolvedValue({ id: 'p', name: 'KM' }),
      getPromotionUsageTotals: jest.fn().mockResolvedValue({
        orderCount: 3, unitCount: 5, discountTotal: 200_000, grossRevenue: 1_000_000, netRevenue: 800_000,
      }),
    } as unknown as jest.Mocked<IPromotionRepository>;
    const stats = await new ManagePromotionsUseCase(promoRepo).promotionStats('p');
    expect(stats).toMatchObject({ promotionId: 'p', orderCount: 3, roi: 4 });
    expect(promoRepo.getPromotionUsageTotals).toHaveBeenCalledWith('p', expect.arrayContaining(['COMPLETED']));
    expect(promoRepo.getPromotionUsageTotals.mock.calls[0][1]).not.toContain('CANCELLED');
  });
});
