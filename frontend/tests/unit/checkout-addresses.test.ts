import { describe, expect, it } from "vitest";
import { addressInput } from "../../src/features/addresses/contracts";
import {
  findProvince,
  findWard,
  formatAddress,
  isCurrentAddress,
  vietnamProvinces,
} from "../../src/features/addresses/vietnam-divisions";
import { maximumCheckoutPoints } from "../../src/features/checkout/checkout-benefits";

describe("Vietnam two-level delivery addresses", () => {
  it("includes all 34 provinces and 3321 unique wards with a map center", () => {
    expect(vietnamProvinces).toHaveLength(34);
    const wards = vietnamProvinces.flatMap((province) => province.wards);
    expect(wards).toHaveLength(3321);
    expect(new Set(wards.map((ward) => ward.code)).size).toBe(wards.length);
    expect(
      wards.every((ward) => Number.isFinite(ward.latitude) && Number.isFinite(ward.longitude)),
    ).toBe(true);
  });
  it("matches saved province abbreviations and rejects a ward from another province", () => {
    expect(findProvince("TP. Hồ Chí Minh")?.code).toBe("79");
    expect(findWard("TP. Hồ Chí Minh", "Phường Sài Gòn")).toBeDefined();
    expect(findWard("Thành phố Đà Nẵng", "Phường Sài Gòn")).toBeUndefined();
    expect(
      isCurrentAddress({ city: "TP. Hồ Chí Minh", ward: "Phường Sài Gòn", district: "" }),
    ).toBe(true);
    expect(
      isCurrentAddress({ city: "TP. Hồ Chí Minh", ward: "Phường mẫu", district: "Quận 1" }),
    ).toBe(false);
  });
  it("saves without a district and preserves a selected map point", () => {
    const input = addressInput.parse({
      recipientName: "Nguyễn An",
      phone: "0901234567",
      addressLine: "12 Nguyễn Huệ",
      city: "Thành phố Hồ Chí Minh",
      ward: "Phường Sài Gòn",
      isDefault: false,
      latitude: 10.775,
      longitude: 106.703,
    });
    expect(input.district).toBe("");
    expect(input.latitude).toBe(10.775);
    expect(formatAddress(input)).toBe("12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh");
    expect(addressInput.safeParse({ ...input, latitude: 91 }).success).toBe(false);
  });
});

describe("checkout point limits", () => {
  const policy = { balance: 200000, value: 1, minimumBalance: 50000, step: 10000, maxRatio: 0.5 };
  const quote = {
    quoteVersion: "a".repeat(64),
    subtotal: 369000,
    shippingFee: 30000,
    discountAmount: 30000,
    pointsDiscount: 0,
    totalAmount: 369000,
    items: [],
  };
  it("caps at half of discounted merchandise in whole redemption steps, excluding shipping", () => {
    expect(maximumCheckoutPoints(policy, quote)).toBe(160000);
    expect(maximumCheckoutPoints({ ...policy, balance: 50001 }, quote)).toBe(50000);
    expect(maximumCheckoutPoints({ ...policy, balance: 49999 }, quote)).toBe(0);
    expect(maximumCheckoutPoints(policy, { ...quote, subtotal: 10000, discountAmount: 0 })).toBe(0);
    expect(maximumCheckoutPoints(undefined, quote)).toBe(0);
  });
});
