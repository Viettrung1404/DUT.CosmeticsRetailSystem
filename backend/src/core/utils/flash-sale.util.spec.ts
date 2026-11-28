import { isFeaturedProduct, isPromotionInSlot, promotionSlotEnd } from './flash-sale.util';

describe('Recurring flash slots in Vietnam', () => {
  it('switches slots exactly at 02:00 VN and wraps at midnight', () => {
    expect(isPromotionInSlot(0, new Date('2026-11-25T18:59:59.999Z'))).toBe(true);
    expect(isPromotionInSlot(0, new Date('2026-11-25T19:00:00Z'))).toBe(false);
    expect(isPromotionInSlot(2, new Date('2026-11-25T19:00:00Z'))).toBe(true);
    expect(promotionSlotEnd(new Date('2031-01-01'), 22, new Date('2026-11-26T16:30:00Z')).toISOString())
      .toBe('2026-11-26T17:00:00.000Z');
  });

  it('selects exactly 20 parent products and rotates across every product', () => {
    const selected = new Set<number>();
    for (let day = 0; day < 7; day++) {
      for (let slot = 0; slot < 24; slot += 2) {
        const now = new Date(Date.UTC(2026, 10, 26 + day, slot - 7));
        const featured = Array.from({ length: 350 }, (_, rank) => rank)
          .filter((rank) => isFeaturedProduct(rank, 350, 20, slot, now));
        expect(featured).toHaveLength(20);
        featured.forEach((rank) => selected.add(rank));
      }
    }
    expect(selected.size).toBe(350);
  });
});
