import { PromotionsService } from "../promotion.controller";

describe("Checkout benefits", () => {
  it("returns usable coupons, excludes exhausted usage/campaigns and applies the server point policy", async () => {
    const coupon = {
      id: "coupon",
      code: "WELCOME",
      discountType: "FIXED_AMOUNT",
      discountValue: 30000,
      minOrderAmount: 300000,
      maxDiscountAmount: null,
      maxUsesPerCustomer: 1,
      endDate: new Date("2027-01-01"),
      _count: { usages: 0 },
      promotion: null,
    };
    const db = {
      customer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ totalPoints: 75000 }),
      },
      coupon: {
        fields: { maxUses: "maxUses" },
        findMany: jest
          .fn()
          .mockResolvedValue([
            coupon,
            { ...coupon, id: "used", _count: { usages: 1 } },
            { ...coupon, id: "inactive", promotion: { isActive: false } },
            {
              ...coupon,
              id: "exhausted",
              promotion: {
                isActive: true,
                startDate: new Date("2020-01-01"),
                endDate: new Date("2030-01-01"),
                usageLimit: 2,
                usedCount: 2,
              },
            },
          ]),
      },
    };
    const result = await new PromotionsService(db as any).checkoutBenefits(
      "customer-a",
    );
    expect(result.coupons.map((item) => item.id)).toEqual(["coupon"]);
    expect(result.points).toEqual({
      balance: 75000,
      value: 1,
      minimumBalance: 50000,
      step: 10000,
      maxRatio: 0.5,
    });
    expect(db.customer.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "customer-a" },
      select: { totalPoints: true },
    });
    const query = db.coupon.findMany.mock.calls[0][0];
    expect(query.where.OR).toEqual([
      { customerId: null },
      { customerId: "customer-a" },
    ]);
    expect(query.include._count.select.usages.where.customerId).toBe(
      "customer-a",
    );
    expect(result.coupons[0]).not.toHaveProperty("customerId");
    expect(result.coupons[0]).not.toHaveProperty("usages");
  });
});
