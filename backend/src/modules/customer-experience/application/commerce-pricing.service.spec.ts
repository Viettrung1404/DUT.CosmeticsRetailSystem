import { CommercePricingService } from './commerce-pricing.service';
import { ConflictException } from '@nestjs/common';

describe('Checkout quote freshness', () => {
  function setup() {
    const variants = ['a', 'b'].map(id => ({
      id, productId: 'product', price: 100000,
      product: { id: 'product', name: 'Test', categoryId: 'category' },
    }));
    const db = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      productVariant: { findMany: jest.fn(async () => variants) },
      promotion: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CommercePricingService(db as never);
    const selection = { items: variants.map(v => ({ variantId: v.id, quantity: 1 })) };
    return { db, variants, service, selection };
  }
  it.each([10000, -10000])('rejects a stale quote when price changes by %i', async delta => {
    const { variants, service, selection } = setup();
    const before = await service.quote(selection);
    variants[0].price += delta;
    const after = await service.quote(selection);
    expect(() => service.assertQuote(before.quoteVersion, after)).toThrow(ConflictException);
    expect(() => service.assertQuote(after.quoteVersion, after)).not.toThrow();
  });
  it('detects per-line changes even when the total remains identical', async () => {
    const { variants, service, selection } = setup();
    const before = await service.quote(selection);
    variants[0].price += 10000;
    variants[1].price -= 10000;
    const after = await service.quote(selection);
    expect(after.totalAmount).toBe(before.totalAmount);
    expect(after.quoteVersion).not.toBe(before.quoteVersion);
  });
  it('detects a changed campaign and holds price locks during final validation', async () => {
    const { db, service, selection } = setup();
    const before = await service.quote(selection);
    db.promotion.findMany.mockResolvedValue([{
      id: 'promo', type: 'PERCENTAGE', value: 10, minOrderAmount: 0,
      maxDiscountAmount: null, isFlashSale: false, quotas: [],
      applicableProducts: [], applicableCategories: [], usageLimit: null, usedCount: 0,
    }]);
    const after = await service.quote(selection, db as never, true);
    expect(after.quoteVersion).not.toBe(before.quoteVersion);
    const locks = db.$queryRaw.mock.calls.map((call: any[]) => call[0].join(' ')).join('\n');
    expect(locks).toContain('FROM promotions');
    expect(locks).toContain('FOR SHARE OF v,p');
    expect(locks).not.toContain('usage_limit IS NOT NULL');
  });
});
