import { CommerceCheckoutService } from '../commerce-checkout.service';
import {
  checkoutRequestHash,
  guestSessionHash,
} from '../../../domain/guest-checkout';

describe('Guest checkout ownership and retries', () => {
  const session = 'fcb75012-499a-448d-bf11-a2aa69265f98';
  const other = '39147577-3b63-48d1-8f70-37180866650e';
  const input = {
    items: [{ variantId: 'variant-1', quantity: 1 }],
    idempotencyKey: 'checkout-123',
    paymentMethod: 'COD' as const,
    shippingAddress: {
      recipientName: 'Demo test',
      phone: '0900000000',
      addressLine: 'Test address',
      city: 'Test city',
    },
  };
  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const db = { ...tx, $transaction: jest.fn((callback) => callback(tx)) };
    const service = new CommerceCheckoutService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, tx };
  }
  it('rejects absent or malformed session secrets before accessing orders', async () => {
    const { service, tx } = setup();
    await expect(service.guestOrder('', 'order-1')).rejects.toThrow(
      'GUEST_SESSION_REQUIRED',
    );
    expect(tx.order.findFirst).not.toHaveBeenCalled();
    expect(() => guestSessionHash('order-1')).toThrow('GUEST_SESSION_REQUIRED');
  });
  it('binds order reads to a null customer and the hashed guest secret', async () => {
    const { service, tx } = setup();
    await expect(service.guestOrder(other, 'order-1')).rejects.toThrow(
      'ORDER_NOT_FOUND',
    );
    expect(tx.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'order-1',
          customerId: null,
          pricingSnapshot: {
            path: ['guest', 'sessionHash'],
            equals: guestSessionHash(other),
          },
        },
      }),
    );
    const projection = tx.order.findFirst.mock.calls[0][0].select;
    expect(projection.pricingSnapshot).toBeUndefined();
    expect(projection.items.select.unitCost).toBeUndefined();
  });
  it('rejects account-only benefits for a guest', async () => {
    const { service, tx } = setup();
    await expect(
      service.previewGuest({ usePoints: 1 }, session),
    ).rejects.toThrow('CUSTOMER_BENEFITS_REQUIRE_LOGIN');
    await expect(
      service.createGuest({ ...input, couponCode: 'MEMBER' }, session),
    ).rejects.toThrow('CUSTOMER_BENEFITS_REQUIRE_LOGIN');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it('returns the existing receipt on a retried command without committing twice', async () => {
    const { service, tx } = setup();
    tx.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      pricingSnapshot: { guest: { requestHash: checkoutRequestHash(input) } },
    });
    const receipt = jest
      .spyOn(service, 'guestOrder')
      .mockResolvedValue({ id: 'order-1' } as never);
    await expect(service.createGuest(input, session)).resolves.toEqual({
      id: 'order-1',
    });
    expect(receipt).toHaveBeenCalledWith(session, 'order-1', tx);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it('rejects a reused command key when the payload changed', async () => {
    const { service, tx } = setup();
    tx.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      pricingSnapshot: { guest: { requestHash: checkoutRequestHash(input) } },
    });
    await expect(
      service.createGuest(
        { ...input, items: [{ variantId: 'variant-1', quantity: 2 }] },
        session,
      ),
    ).rejects.toThrow('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });
  it('hashes equivalent JSON objects consistently and distinguishes different quantities', () => {
    expect(
      checkoutRequestHash({ a: 1, b: { c: 2 }, optional: undefined }),
    ).toBe(checkoutRequestHash({ b: { c: 2 }, a: 1 }));
    expect(checkoutRequestHash(input)).not.toBe(
      checkoutRequestHash({
        ...input,
        items: [{ variantId: 'variant-1', quantity: 2 }],
      }),
    );
    expect(guestSessionHash(session)).not.toBe(guestSessionHash(other));
  });
});
