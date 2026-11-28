export function shippingFeeAfterBenefits(carrierFee: number, policyFee: number, baseFee = 30000) {
  if (policyFee === 0) return 0;
  return Math.max(0, carrierFee - Math.max(0, baseFee - policyFee));
}
