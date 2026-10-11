import { isOrderInScope, toOrderScopeFilter } from '../order-scope.util';

describe('order-scope.util', () => {
  describe('toOrderScopeFilter', () => {
    it('ALL: không lọc gì', () => {
      expect(toOrderScopeFilter({ type: 'ALL', storeIds: [], employeeId: null })).toEqual({});
    });

    it('STORE: lọc theo danh sách cửa hàng', () => {
      expect(
        toOrderScopeFilter({ type: 'STORE', storeIds: ['s1', 's2'], employeeId: 'e1' }),
      ).toEqual({ storeIds: ['s1', 's2'] });
    });

    it('SELF có hồ sơ nhân viên: lọc đơn mình bán', () => {
      expect(toOrderScopeFilter({ type: 'SELF', storeIds: [], employeeId: 'e1' })).toEqual({
        salesStaffId: 'e1',
      });
    });

    it('SELF không phải nhân viên: không thấy đơn nào', () => {
      expect(toOrderScopeFilter({ type: 'SELF', storeIds: ['s1'], employeeId: null })).toEqual({
        storeIds: [],
      });
    });
  });

  describe('isOrderInScope', () => {
    const order = { storeId: 's1', salesStaffId: null };

    it('ALL: luôn thấy', () => {
      expect(isOrderInScope(order, { type: 'ALL', storeIds: [], employeeId: null })).toBe(true);
    });

    it('STORE: chỉ thấy đơn thuộc cửa hàng được giao', () => {
      expect(isOrderInScope(order, { type: 'STORE', storeIds: ['s1'], employeeId: null })).toBe(true);
      expect(isOrderInScope(order, { type: 'STORE', storeIds: ['s2'], employeeId: null })).toBe(false);
    });

    it('SELF: chỉ thấy đơn có salesStaffId là mình; không phải nhân viên thì không thấy đơn online', () => {
      expect(
        isOrderInScope({ storeId: 's1', salesStaffId: 'e1' }, { type: 'SELF', storeIds: [], employeeId: 'e1' }),
      ).toBe(true);
      expect(isOrderInScope(order, { type: 'SELF', storeIds: [], employeeId: null })).toBe(false);
    });
  });
});
