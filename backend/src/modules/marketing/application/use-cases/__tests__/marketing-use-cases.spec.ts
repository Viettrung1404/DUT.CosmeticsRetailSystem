import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CouponView, IPromotionRepository, PromotionView } from '../../../domain/repositories/promotion.repository.interface';
import { IContentRepository } from '../../../domain/repositories/content.repository.interface';
import { ILoyaltySettingsRepository } from '../../../domain/repositories/loyalty-settings.repository.interface';
import { ManagePromotionsUseCase, randomCouponCode } from '../manage-promotions.use-case';
import { ManageContentUseCase, slugify } from '../manage-content.use-case';
import { ManageLoyaltySettingsUseCase } from '../manage-loyalty-settings.use-case';

const start = new Date('2026-11-01T00:00:00Z');
const end = new Date('2026-11-30T00:00:00Z');

const promotion = (over: Partial<PromotionView> = {}): PromotionView => ({
  id: 'p1',
  name: 'Sale',
  description: null,
  type: 'PERCENTAGE',
  value: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  startDate: start,
  endDate: end,
  usageLimit: null,
  isFlashSale: false,
  applicableProducts: null,
  applicableCategories: null,
  isActive: true,
  usedCount: 0,
  couponCount: 0,
  createdAt: start,
  ...over,
});

const promoRepo = (): jest.Mocked<IPromotionRepository> => ({
  findPromotions: jest.fn(),
  findPromotion: jest.fn().mockResolvedValue(promotion()),
  getPromotionUsageTotals: jest.fn(),
  createPromotion: jest.fn(async (d) => promotion(d)),
  updatePromotion: jest.fn(async (_id, d) => promotion(d)),
  setPromotionActive: jest.fn(),
  findMissingProducts: jest.fn().mockResolvedValue([]),
  findMissingCategories: jest.fn().mockResolvedValue([]),
  customerExists: jest.fn().mockResolvedValue(true),
  findCoupons: jest.fn(),
  findCoupon: jest.fn(),
  codesTaken: jest.fn().mockResolvedValue([]),
  createCoupons: jest
    .fn()
    .mockImplementation(async (codes: string[]) => codes.map((code) => ({ code }) as unknown as CouponView)),
  setCouponActive: jest.fn(),
  updateCoupon: jest.fn(),
});

const couponInput = {
  promotionId: null,
  customerId: null,
  discountType: 'PERCENTAGE',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  maxUses: null,
  maxUsesPerCustomer: 1,
  startDate: start,
  endDate: end,
};

describe('Khuyến mãi + mã giảm giá', () => {
  it('mã 8 ký tự, không có 0/O/1/I', () => {
    for (let i = 0; i < 200; i++) expect(randomCouponCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(randomCouponCode('BF')).toMatch(/^BF[A-HJ-NP-Z2-9]{8}$/);
  });

  it('giảm % quá 100 hoặc ngày kết thúc trước ngày bắt đầu: 400', async () => {
    const uc = new ManagePromotionsUseCase(promoRepo());
    const base = { ...promotion(), value: 120 };
    await expect(uc.createPromotion(base)).rejects.toBeInstanceOf(BadRequestException);
    await expect(uc.createPromotion({ ...promotion(), startDate: end, endDate: start })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('khuyến mãi đã có đơn dùng: không đổi mức giảm, đổi tên thì được', async () => {
    const r = promoRepo();
    r.findPromotion.mockResolvedValue(promotion({ usedCount: 3 }));
    const uc = new ManagePromotionsUseCase(r);
    await expect(uc.updatePromotion('p1', { value: 20 })).rejects.toBeInstanceOf(ConflictException);
    await uc.updatePromotion('p1', { name: 'Sale mới' });
    expect(r.updatePromotion).toHaveBeenCalledWith('p1', { name: 'Sale mới' });
  });

  it('sản phẩm áp dụng không tồn tại: 400', async () => {
    const r = promoRepo();
    r.findMissingProducts.mockResolvedValue(['x']);
    await expect(
      new ManagePromotionsUseCase(r).createPromotion({ ...promotion(), applicableProducts: ['x'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mã tự đặt bị trùng: 409; viết hoa trước khi lưu', async () => {
    const r = promoRepo();
    const uc = new ManagePromotionsUseCase(r);
    await uc.createCoupon({ ...couponInput, code: 'tet2027' });
    expect(r.createCoupons.mock.calls[0][0]).toEqual(['TET2027']);
    r.codesTaken.mockResolvedValue(['TET2027']);
    await expect(uc.createCoupon({ ...couponInput, code: 'TET2027' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('tạo hàng loạt: đúng số lượng, sinh lại khi đụng mã trùng', async () => {
    const r = promoRepo();
    r.createCoupons.mockResolvedValueOnce(null);
    const result = await new ManagePromotionsUseCase(r).createBulk({ ...couponInput, quantity: 20, prefix: 'bf' });
    expect(result).toHaveLength(20);
    expect(r.createCoupons).toHaveBeenCalledTimes(2);
    expect(r.createCoupons.mock.calls[1][0].every((c: string) => c.startsWith('BF'))).toBe(true);
  });

  it('khách được tặng mã không tồn tại: 404', async () => {
    const r = promoRepo();
    r.customerExists.mockResolvedValue(false);
    await expect(
      new ManagePromotionsUseCase(r).createCoupon({ ...couponInput, customerId: 'c1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Sửa mã giảm giá', () => {
  const coupon = {
    id: 'c1',
    code: 'TET',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxUses: 100,
    usedCount: 5,
    startDate: new Date('2026-11-01'),
    endDate: new Date('2026-12-01'),
  };
  const build = () => {
    const r = { findCoupon: jest.fn().mockResolvedValue(coupon), updateCoupon: jest.fn() };
    return { r, uc: new ManagePromotionsUseCase(r as unknown as IPromotionRepository) };
  };

  it('mã đã dùng không đổi mức giảm, nhưng đổi được hạn', async () => {
    const { r, uc } = build();
    await expect(uc.updateCoupon('c1', { discountValue: 20 })).rejects.toBeInstanceOf(ConflictException);
    await uc.updateCoupon('c1', { endDate: new Date('2027-01-01') });
    expect(r.updateCoupon).toHaveBeenCalled();
  });

  it('tổng lượt dùng không thấp hơn số đã dùng', async () => {
    await expect(build().uc.updateCoupon('c1', { maxUses: 3 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ngày kết thúc phải sau ngày bắt đầu', async () => {
    await expect(build().uc.updateCoupon('c1', { endDate: new Date('2026-10-01') })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('mã không tồn tại trả 404', async () => {
    const { r, uc } = build();
    r.findCoupon.mockResolvedValue(null);
    await expect(uc.getCoupon('x')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Nội dung', () => {
  const repo = (): jest.Mocked<IContentRepository> => ({
    findReviews: jest.fn(),
    findReview: jest.fn().mockResolvedValue({ id: 'r1', isApproved: true }),
    moderateReview: jest.fn(),
    findPosts: jest.fn(),
    findPost: jest.fn().mockResolvedValue({ id: 'b1', status: 'DRAFT', slug: 'a', publishedAt: null }),
    slugTaken: jest.fn().mockResolvedValue(false),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    publishDue: jest.fn(),
    listCms: jest.fn(),
    findCms: jest.fn().mockResolvedValue({ id: 'x' }),
    createCms: jest.fn(),
    updateCms: jest.fn(),
    deleteCms: jest.fn(),
    getPostDetail: jest.fn(),
    deletePost: jest.fn(),
    countCms: jest.fn(),
    reorderCms: jest.fn(),
    templateNameTaken: jest.fn().mockResolvedValue(false),
    categoryInUse: jest.fn().mockResolvedValue(true),
  });

  it('chỉ xóa được bài nháp', async () => {
    const r = repo();
    const uc = new ManageContentUseCase(r);
    await uc.deletePost('b1');
    expect(r.deletePost).toHaveBeenCalledWith('b1');
    r.findPost.mockResolvedValue({ id: 'b1', status: 'PUBLISHED', slug: 'a', publishedAt: new Date() });
    await expect(uc.deletePost('b1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('bài mới để trống SEO thì tự sinh từ tiêu đề và tóm tắt', async () => {
    const r = repo();
    await new ManageContentUseCase(r).createPost('u1', {
      title: 'Dưỡng da mùa đông',
      content: '<p>Nội dung</p>',
      excerpt: 'Ba bước cơ bản',
      featuredImage: null,
      blogCategoryId: null,
      metaTitle: null,
      metaDescription: null,
    });
    expect(r.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ metaTitle: 'Dưỡng da mùa đông', metaDescription: 'Ba bước cơ bản' }),
    );
  });

  it('sắp xếp: id trùng 400, id không tồn tại 400, đúng thì ghi', async () => {
    const r = repo();
    const uc = new ManageContentUseCase(r);
    await expect(uc.reorderCms('faq', ['a', 'a'])).rejects.toBeInstanceOf(BadRequestException);
    r.countCms.mockResolvedValue(1);
    await expect(uc.reorderCms('faq', ['a', 'b'])).rejects.toBeInstanceOf(BadRequestException);
    r.countCms.mockResolvedValue(2);
    await uc.reorderCms('banner', ['b', 'a']);
    expect(r.reorderCms).toHaveBeenCalledWith('banner', ['b', 'a']);
  });

  it('slug tiếng Việt bỏ dấu, đ → d', () => {
    expect(slugify('Đẹp da mùa Đông: 5 bước!')).toBe('dep-da-mua-dong-5-buoc');
  });

  it('trả lời đánh giá giữ nguyên trạng thái duyệt', async () => {
    const r = repo();
    await new ManageContentUseCase(r).replyReview('r1', ' Cảm ơn ');
    expect(r.moderateReview).toHaveBeenCalledWith('r1', true, 'Cảm ơn');
  });

  it('bài viết trùng đường dẫn: 409', async () => {
    const r = repo();
    r.slugTaken.mockResolvedValue(true);
    await expect(
      new ManageContentUseCase(r).createPost('u', {
        title: 'Bài A',
        content: 'x',
        excerpt: null,
        featuredImage: null,
        blogCategoryId: null,
        metaTitle: null,
        metaDescription: null,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hẹn giờ ở quá khứ: 400; bài đã lưu trữ không hẹn được: 409', async () => {
    const r = repo();
    const uc = new ManageContentUseCase(r);
    await expect(uc.schedulePost('b1', new Date('2020-01-01'))).rejects.toBeInstanceOf(BadRequestException);
    r.findPost.mockResolvedValue({ id: 'b1', status: 'ARCHIVED', slug: 'a', publishedAt: null });
    await expect(uc.schedulePost('b1', new Date('2099-01-01'))).rejects.toBeInstanceOf(ConflictException);
  });

  it('danh mục còn bài thì không xóa; thiếu trường bắt buộc khi tạo FAQ: 400', async () => {
    const uc = new ManageContentUseCase(repo());
    await expect(uc.deleteCms('blogCategory', 'c1')).rejects.toBeInstanceOf(ConflictException);
    await expect(uc.createCms('faq', { question: 'Hỏi gì?' })).rejects.toThrow('answer');
  });

  it('sửa tiêu đề trang tĩnh không đổi đường dẫn cũ', async () => {
    const r = repo();
    await new ManageContentUseCase(r).updateCms('page', 'pg1', { title: 'Tiêu đề mới' });
    expect(r.updateCms.mock.calls[0][2]).toEqual({ title: 'Tiêu đề mới' });
  });
});

describe('Chính sách điểm (08.04)', () => {
  const tiers = [
    { id: 't1', name: 'Bronze', minPoints: 0, discountPercentage: 0, pointMultiplier: 1, benefits: null },
    { id: 't2', name: 'Silver', minPoints: 1000, discountPercentage: 0, pointMultiplier: 1.2, benefits: null },
    { id: 't3', name: 'Gold', minPoints: 5000, discountPercentage: 0, pointMultiplier: 1.5, benefits: null },
  ];
  const repo = (): jest.Mocked<ILoyaltySettingsRepository> => ({
    getConfig: jest.fn(),
    findTiers: jest.fn().mockResolvedValue(tiers),
    updateConfig: jest.fn(),
    updateTier: jest.fn(),
  });

  it('tỷ lệ tích điểm phải trong (0, 1]', () => {
    const uc = new ManageLoyaltySettingsUseCase(repo());
    expect(() => uc.updatePointRate('u', 0)).toThrow(BadRequestException);
    expect(() => uc.updatePointRate('u', 2)).toThrow(BadRequestException);
  });

  it('hạng cao hơn có hệ số thấp hơn hạng dưới: 400; trùng ngưỡng: 400', async () => {
    const uc = new ManageLoyaltySettingsUseCase(repo());
    await expect(uc.updateTier('u', 't3', { pointMultiplier: 1.1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(uc.updateTier('u', 't3', { minPoints: 1000 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hạng thấp nhất phải từ 0 điểm; sửa hợp lệ thì ghi', async () => {
    const r = repo();
    const uc = new ManageLoyaltySettingsUseCase(r);
    await expect(uc.updateTier('u', 't1', { minPoints: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await uc.updateTier('u', 't2', { minPoints: 2000 });
    expect(r.updateTier).toHaveBeenCalledWith('t2', { minPoints: 2000 }, 'u');
  });
});
