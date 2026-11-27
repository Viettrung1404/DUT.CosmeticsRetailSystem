import { describe, expect, it } from "vitest";
import { shippingFeeAfterBenefits } from "../../src/features/checkout/shipping-benefit";

describe("carrier quote and store shipping benefits", () => {
  it.each([
    [30000, 22000],
    [15000, 7000],
    [5000, 0],
    [0, 0],
  ])("charges the correct fee when policy fee becomes %i", (policyFee, expected) =>
    expect(shippingFeeAfterBenefits(22000, policyFee)).toBe(expected),
  );
  it("keeps free-shipping campaigns free even for a high carrier quote", () => {
    expect(shippingFeeAfterBenefits(55000, 0)).toBe(0);
  });
});
