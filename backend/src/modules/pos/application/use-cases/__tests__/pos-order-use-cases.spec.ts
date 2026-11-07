import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  PosCreatedSale,
  PosSaleContext,
  PosSaleVariant,
} from '../../../domain/entities/pos-sale.entity';
import { IPosOrderRepository } from '../../../domain/repositories/pos-order.repository.interface';
import { IPosSessionRepository } from '../../../domain/repositories/pos-session.repository.interface';
import { PosSalePlanner } from '../../services/pos-sale-planner.service';
import { CreatePosOrderUseCase } from '../create-pos-order.use-case';
import { PreviewPosOrderUseCase } from '../preview-pos-order.use-case';

const STORE = 's1';
const PERMS = ['ORDER_POS_CREATE', 'PAYMENT_COLLECT', 'ORDER_DISCOUNT_APPLY'];

const variant = (over: Partial<PosSaleVariant> = {}): PosSaleVariant => ({
  variantId: 'v1',
  productId: 'p1',
  categoryId: 'c1',
  productName: 'Son A',
  variantName: 'Đỏ',
  sku: 'SON-A',
  price: 100000,
  cost: 40000,
  isActive: true,
  productActive: true,
  onHand: 10,
  reserved: 0,
  expiredQuantity: 0,
  ...over,
});

const context = (over: Partial<PosSaleContext> = {}): PosSaleContext => ({
  variants: [variant()],
  promotions: [],
  coupon: null,
  couponUsageCount: 0,
  customer: null,
  employee: null,
  pointRate: 0.01,
  ...over,
});

const createdSale: PosCreatedSale = {
  orderId: 'o1',
  orderNumber: 'POS202610230001',
  createdAt: new Date(),
  pointsEarned: 0,
  pointsNote: null,
  tierName: null,
  tierChanged: false,
  commissionAmount: 0,
};

describe('POS bán hàng', () => {
  let orderRepo: jest.Mocked<IPosOrderRepository>;
  let sessionRepo: Pick<jest.Mocked<IPosSessionRepository>, 'findOpenByCashier'>;
  let storeAccess: { assertCanSell: jest.Mock };
  let planner: PosSalePlanner;

  beforeEach(() => {
    orderRepo = {
      loadSaleContext: jest.fn().mockResolvedValue(context()),
      createSale: jest.fn().mockResolvedValue(createdSale),
    } as unknown as jest.Mocked<IPosOrderRepository>;
    sessionRepo = {
      findOpenByCashier: jest.fn().mockResolvedValue({ id: 'ses1', storeId: STORE }),
    };
    storeAccess = { assertCanSell: jest.fn().mockResolvedValue(undefined) };
    planner = new PosSalePlanner(orderRepo, storeAccess as never);
  });

  const create = () =>
    new CreatePosOrderUseCase(planner, orderRepo, sessionRepo as unknown as IPosSessionRepository);

  describe('PosSalePlanner', () => {
    it('gộp cùng biến thể thành một dòng', async () => {
      const plan = await planner.plan('u1', PERMS, {
        storeId: STORE,
        items: [
          { variantId: 'v1', quantity: 1 },
          { variantId: 'v1', quantity: 2 },
        ],
      });
      expect(plan.pricing.lines).toHaveLength(1);
      expect(plan.pricing.lines[0].quantity).toBe(3);
      expect(plan.pricing.total).toBe(300000);
    });

    it('dùng voucher hoặc điểm mà chưa chọn khách thì chặn', async () => {
      await expect(
        planner.plan('u1', PERMS, { storeId: STORE, items: [{ variantId: 'v1', quantity: 1 }], couponCode: 'X' }),
      ).rejects.toThrow('Cần chọn khách hàng');
      await expect(
        planner.plan('u1', PERMS, { storeId: STORE, items: [{ variantId: 'v1', quantity: 1 }], pointsToUse: 10000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('áp voucher mà không có quyền ORDER_DISCOUNT_APPLY thì 403', async () => {
      await expect(
        planner.plan('u1', ['ORDER_POS_CREATE'], {
          storeId: STORE,
          items: [{ variantId: 'v1', quantity: 1 }],
          customerId: 'kh',
          couponCode: 'X',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('mã giảm giá không tồn tại thì 400, khách không tồn tại thì 404', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(
        context({ customer: { id: 'kh', fullName: 'A', phone: '0905', totalPoints: 0, pointMultiplier: 1 } }),
      );
      await expect(
        planner.plan('u1', PERMS, {
          storeId: STORE,
          items: [{ variantId: 'v1', quantity: 1 }],
          customerId: 'kh',
          couponCode: 'NOPE',
        }),
      ).rejects.toThrow('Mã giảm giá không tồn tại');

      orderRepo.loadSaleContext.mockResolvedValue(context());
      await expect(
        planner.plan('u1', PERMS, {
          storeId: STORE,
          items: [{ variantId: 'v1', quantity: 1 }],
          customerId: 'kh',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sản phẩm ngừng bán hoặc không tồn tại thì 400', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(context({ variants: [variant({ isActive: false })] }));
      await expect(
        planner.plan('u1', PERMS, { storeId: STORE, items: [{ variantId: 'v1', quantity: 1 }] }),
      ).rejects.toThrow('đã ngừng bán');
      await expect(
        planner.plan('u1', PERMS, { storeId: STORE, items: [{ variantId: 'vx', quantity: 1 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('tồn bán được trừ giữ chỗ và lô hết hạn', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(
        context({ variants: [variant({ onHand: 10, reserved: 3, expiredQuantity: 4 })] }),
      );
      const plan = await planner.plan('u1', PERMS, {
        storeId: STORE,
        items: [{ variantId: 'v1', quantity: 4 }],
      });
      expect(plan.shortages).toEqual([
        { variantId: 'v1', productName: 'Son A', variantName: 'Đỏ', requested: 4, sellable: 3 },
      ]);
    });
  });

  describe('PreviewPosOrderUseCase', () => {
    it('báo thiếu hàng nhưng không ném lỗi', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(context({ variants: [variant({ onHand: 1 })] }));
      const result = await new PreviewPosOrderUseCase(planner).execute('u1', PERMS, {
        storeId: STORE,
        items: [{ variantId: 'v1', quantity: 2 }],
      });
      expect(result.shortages).toHaveLength(1);
      expect(result.pricing.total).toBe(200000);
    });
  });

  describe('CreatePosOrderUseCase', () => {
    const input = {
      storeId: STORE,
      items: [{ variantId: 'v1', quantity: 2 }],
      payments: [{ method: 'CASH' as const, amount: 500000 }],
    };

    it('bán thành công: ghi đơn với ca đang mở, tiền thừa 300.000', async () => {
      const result = await create().execute('u1', PERMS, input);

      expect(orderRepo.createSale).toHaveBeenCalledTimes(1);
      const cmd = orderRepo.createSale.mock.calls[0][0];
      expect(cmd.sessionId).toBe('ses1');
      expect(cmd.pricing.total).toBe(200000);
      expect(cmd.settlement.payments).toEqual([
        { method: 'CASH', amount: 200000, tenderedAmount: 500000 },
      ]);
      expect(result.settlement.change).toBe(300000);
    });

    it('chưa mở ca thì 409', async () => {
      sessionRepo.findOpenByCashier.mockResolvedValue(null);
      await expect(create().execute('u1', PERMS, input)).rejects.toThrow(ConflictException);
      expect(orderRepo.createSale).not.toHaveBeenCalled();
    });

    it('ca đang mở ở cửa hàng khác thì 409', async () => {
      sessionRepo.findOpenByCashier.mockResolvedValue({ id: 'ses2', storeId: 'khac' } as never);
      await expect(create().execute('u1', PERMS, input)).rejects.toThrow('chưa mở ca');
    });

    it('thiếu hàng bán được thì 409 trước khi ghi', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(context({ variants: [variant({ onHand: 1 })] }));
      await expect(create().execute('u1', PERMS, input)).rejects.toThrow('Không đủ hàng');
      expect(orderRepo.createSale).not.toHaveBeenCalled();
    });

    it('thu thiếu tiền thì 400 và không ghi', async () => {
      await expect(
        create().execute('u1', PERMS, { ...input, payments: [{ method: 'CASH', amount: 100000 }] }),
      ).rejects.toThrow('chưa đủ');
      expect(orderRepo.createSale).not.toHaveBeenCalled();
    });

    it('chuyển khoản thu dư thì 400', async () => {
      await expect(
        create().execute('u1', PERMS, { ...input, payments: [{ method: 'TRANSFER', amount: 250000 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('truyền nhân viên có hồ sơ, tỷ lệ tích điểm và id khuyến mãi xuống repository', async () => {
      orderRepo.loadSaleContext.mockResolvedValue(
        context({
          employee: { id: 'nv1', commissionRate: 2 },
          promotions: [
            {
              id: 'km1',
              name: 'KM',
              type: 'PERCENTAGE',
              value: 10,
              minOrderAmount: 0,
              maxDiscountAmount: null,
              productIds: null,
              categoryIds: null,
              usageLimit: null,
              usedCount: 0,
            },
          ],
        }),
      );
      await create().execute('u1', PERMS, {
        ...input,
        payments: [{ method: 'TRANSFER', amount: 180000 }],
      });
      const cmd = orderRepo.createSale.mock.calls[0][0];
      expect(cmd.employee).toEqual({ id: 'nv1', commissionRate: 2 });
      expect(cmd.promotionIds).toEqual(['km1']);
      expect(cmd.pointRate).toBe(0.01);
      expect(cmd.pricing.total).toBe(180000);
    });
  });
});
