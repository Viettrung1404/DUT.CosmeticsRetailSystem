import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Money is apportioned in minor units; remainders always go to stable input order. */
export function allocateMoney(
  total: number | Prisma.Decimal,
  weights: (number | Prisma.Decimal)[],
): number[] {
  const cents = new Prisma.Decimal(total).mul(100);
  const sum = weights.reduce<Prisma.Decimal>(
    (a, w) => a.add(w),
    new Prisma.Decimal(0),
  );
  if (
    !cents.isInteger() ||
    cents.isNegative() ||
    weights.some((w) => new Prisma.Decimal(w).isNegative())
  ) {
    throw new BadRequestException('INVALID_MONEY_ALLOCATION');
  }
  if (sum.isZero()) {
    if (!cents.isZero())
      throw new BadRequestException('INVALID_MONEY_ALLOCATION');
    return weights.map(() => 0);
  }
  const shares = weights.map((w) => cents.mul(w).div(sum));
  const units = shares.map((s) => s.floor().toNumber());
  const remaining = cents.toNumber() - units.reduce((a, n) => a + n, 0);
  const order = shares
    .map((n, i) => ({ i, fraction: n.minus(units[i]) }))
    .sort((a, b) => b.fraction.cmp(a.fraction) || a.i - b.i);
  for (let n = 0; n < remaining; n++) units[order[n].i]++;
  return units.map((n) => n / 100);
}

/** Cumulative difference prevents rounding gains from multiple partial returns. */
export function partialValue(
  total: number,
  quantity: number,
  already: number,
  requested: number,
): number {
  const value = new Prisma.Decimal(total);
  return value
    .mul(already + requested)
    .div(quantity)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN)
    .minus(
      value
        .mul(already)
        .div(quantity)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN),
    )
    .toNumber();
}

export function settlement(credit: number, payable: number) {
  const c = new Prisma.Decimal(credit),
    p = new Prisma.Decimal(payable);
  if (c.isNegative() || p.isNegative())
    throw new BadRequestException('INVALID_SETTLEMENT');
  return {
    returnCredit: credit,
    replacementPayable: payable,
    creditApplied: Prisma.Decimal.min(c, p).toNumber(),
    additionalDue: Prisma.Decimal.max(p.minus(c), 0).toNumber(),
    refundDue: Prisma.Decimal.max(c.minus(p), 0).toNumber(),
  };
}
