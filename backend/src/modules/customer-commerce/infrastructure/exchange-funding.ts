import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Tx } from './commands';

/** The source order must already be locked. Follow cash provenance across exchanges,
 * while charging a refund/transfer against both its local allowance and the original payment.
 */
export async function availableFunding(tx: Tx, orderId: string) {
  const own = await tx.payment.findMany({
    where: { orderId, status: 'COMPLETED' },
  });
  const inherited = await tx.exchangeFunding.findMany({
    where: {
      payment: { status: 'COMPLETED' },
      settlement: {
        replacementOrderId: orderId,
        status: 'ACTIVE',
      },
    },
    include: { payment: true },
  });
  const limits = new Map<
    string,
    { payment: (typeof own)[number]; limit: Prisma.Decimal }
  >();
  for (const payment of own)
    limits.set(payment.id, {
      payment,
      limit: new Prisma.Decimal(payment.amount),
    });
  for (const funding of inherited) {
    const previous = limits.get(funding.paymentId);
    limits.set(funding.paymentId, {
      payment: funding.payment,
      limit: (previous?.limit ?? new Prisma.Decimal(0)).add(funding.amount),
    });
  }
  const ids = [...limits.keys()].sort();
  if (ids.length)
    await tx.$queryRaw`SELECT id FROM payments WHERE id=ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
  const result: {
    paymentId: string;
    orderId: string;
    available: Prisma.Decimal;
  }[] = [];
  for (const id of ids) {
    const { limit } = limits.get(id)!;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (payment.status !== 'COMPLETED') continue;
    const [transferred, localRefunds, allRefunds] = await Promise.all([
      tx.exchangeFunding.aggregate({
        where: {
          sourceOrderId: orderId,
          paymentId: id,
          settlement: { status: 'ACTIVE' },
        },
        _sum: { amount: true },
      }),
      tx.refund.aggregate({
        where: {
          paymentId: id,
          status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
          OR: [{ returnOrder: { orderId } }, { returnOrderId: null, orderId }],
        },
        _sum: { amount: true },
      }),
      tx.refund.aggregate({
        where: {
          paymentId: id,
          status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
        },
        _sum: { amount: true },
      }),
    ]);
    const local = limit
      .minus(transferred._sum.amount ?? 0)
      .minus(localRefunds._sum.amount ?? 0);
    const global = new Prisma.Decimal(payment.amount).minus(
      allRefunds._sum.amount ?? 0,
    );
    result.push({
      paymentId: id,
      orderId: payment.orderId,
      available: Prisma.Decimal.max(Prisma.Decimal.min(local, global), 0),
    });
  }
  return result;
}

export async function transferFunding(
  tx: Tx,
  sourceOrderId: string,
  settlementId: string,
  amount: number,
) {
  let remaining = new Prisma.Decimal(amount);
  for (const source of await availableFunding(tx, sourceOrderId)) {
    const value = Prisma.Decimal.min(remaining, source.available);
    if (value.gt(0)) {
      await tx.exchangeFunding.create({
        data: {
          sourceOrderId,
          settlementId,
          paymentId: source.paymentId,
          amount: value,
        },
      });
      remaining = remaining.minus(value);
    }
  }
  if (remaining.gt(0))
    throw new ConflictException('EXCHANGE_EXCEEDS_AVAILABLE_PAYMENTS');
}
