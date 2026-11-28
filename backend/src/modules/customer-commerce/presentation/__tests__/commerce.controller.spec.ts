import { CommerceController } from '../commerce.controller';

describe('CommerceController - BE-02 Duplicate RMA Elimination', () => {
  it('should not contain any RMA/Return methods (standardized to CustomerReturnController)', () => {
    const prototype = CommerceController.prototype as any;
    expect(prototype.createReturn).toBeUndefined();
    expect(prototype.listReturns).toBeUndefined();
    expect(prototype.returnDetail).toBeUndefined();
    expect(prototype.accept).toBeUndefined();
  });

  it('should retain non-RMA endpoints (tracking, wishlist, loyalty, notifications)', () => {
    const prototype = CommerceController.prototype as any;
    expect(typeof prototype.track).toBe('function');
    expect(typeof prototype.getLoyalty).toBe('function');
    expect(typeof prototype.rewards).toBe('function');
    expect(typeof prototype.redeem).toBe('function');
    expect(typeof prototype.toggle).toBe('function');
    expect(typeof prototype.listWishlist).toBe('function');
    expect(typeof prototype.listNotifications).toBe('function');
  });
});
