import { formatOrderNumber } from '../order-number.util';
import { createVariantNameSnapshot } from '../variant-name-snapshot.util';

describe('Order Utils (TDD)', () => {
  describe('formatOrderNumber', () => {
    it('should format order number as ORDYYYYMMDDXXXX with zero-padded sequence without hyphen', () => {
      const date = new Date(2026, 8, 27); // 2026-09-27
      const sequence = 1;
      const orderNumber = formatOrderNumber(date, sequence);
      expect(orderNumber).toBe('ORD202609270001');
    });

    it('should format order number with large sequence correctly', () => {
      const date = new Date(2026, 11, 31); // 2026-12-31
      const sequence = 9999;
      const orderNumber = formatOrderNumber(date, sequence);
      expect(orderNumber).toBe('ORD202612319999');
    });
  });

  describe('createVariantNameSnapshot', () => {
    it('should join option1, option2, option3 separated by slash and ignore null/empty values', () => {
      const snapshot = createVariantNameSnapshot({
        option1Value: 'Đỏ Ruby',
        option2Value: 'Fullsize 3.5g',
        option3Value: null,
        sku: 'LIP-01',
      });
      expect(snapshot).toBe('Đỏ Ruby / Fullsize 3.5g');
    });

    it('should handle single option value correctly', () => {
      const snapshot = createVariantNameSnapshot({
        option1Value: '50ml',
        option2Value: null,
        option3Value: undefined,
        sku: 'CREAM-50',
      });
      expect(snapshot).toBe('50ml');
    });

    it('should fallback to SKU or "Mặc định" when all options are empty or null', () => {
      expect(
        createVariantNameSnapshot({
          option1Value: null,
          option2Value: null,
          option3Value: null,
          sku: 'DEF-SKU',
        }),
      ).toBe('DEF-SKU');

      expect(
        createVariantNameSnapshot({
          option1Value: null,
          option2Value: null,
          option3Value: null,
          sku: '',
        }),
      ).toBe('Mặc định');
    });
  });
});
