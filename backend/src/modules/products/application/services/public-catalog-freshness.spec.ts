import { PublicCatalogService } from './public-catalog.service';

describe('Public catalog freshness after direct database edits', () => {
  it('reads PDP prices and promotion changes again on every request', async () => {
    let price = 100000;
    let effectivePrice = 90000;
    const db = { $queryRaw: jest.fn(async () => [{
      id: 'product', slug: 'test', basePrice: price,
      variants: [{ id: 'variant', price, effectivePrice }],
    }]) };
    const service = new PublicCatalogService(db as never);
    expect((await service.detail('test')).effectivePrice).toBe(90000);
    price = 120000;
    effectivePrice = 96000;
    const current = await service.detail('test');
    expect(current.variants[0].price).toBe(120000);
    expect(current.effectivePrice).toBe(96000);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
