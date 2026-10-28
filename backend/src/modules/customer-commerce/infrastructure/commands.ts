import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';

export type Tx = Prisma.TransactionClient;
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
export async function customerContext(tx: Tx | PrismaClient, userId: string) {
  if (!userId) throw new ForbiddenException('CUSTOMER_REQUIRED');
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      roleId: true,
      status: true,
      customer: { select: { id: true } },
    },
  });
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    user.roleId !== 6 ||
    !user.customer
  ) {
    throw new ForbiddenException({
      code: 'CUSTOMER_REQUIRED',
      message: 'Yêu cầu hồ sơ khách hàng đang hoạt động',
    });
  }
  return user.customer.id;
}
export async function lockCustomer(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM customers WHERE id=${id}::uuid FOR UPDATE`;
}
@Injectable()
export class CustomerCommands {
  constructor(private readonly prisma: PrismaService) {}
  async execute<T>(
    userId: string,
    operation: string,
    key: string,
    input: unknown,
    work: (tx: Tx, customerId: string) => Promise<T>,
  ): Promise<T> {
    if (!key || !/^[A-Za-z0-9_.:-]{8,128}$/.test(key)) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key phải dài 8–128 ký tự',
      });
    }
    const requestHash = createHash('sha256')
      .update(JSON.stringify(canonical(input)))
      .digest('hex');
    return this.prisma.$transaction(
      async (tx) => {
        const customerId = await customerContext(tx, userId);
        const identity = `${userId}:${operation}:${key}`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))::text`;
        const where = {
          userId_operation_idempotencyKey: {
            userId,
            operation,
            idempotencyKey: key,
          },
        };
        const previous = await tx.commandReceipt.findUnique({ where });
        if (previous) {
          if (previous.requestHash !== requestHash)
            throw new ConflictException('IDEMPOTENCY_PAYLOAD_MISMATCH');
          return previous.result as T;
        }
        const result = await work(tx, customerId);
        const stored = json(result);
        await tx.commandReceipt.create({
          data: {
            userId,
            operation,
            idempotencyKey: key,
            requestHash,
            result: stored,
          },
        });
        return stored as T;
      },
      { timeout: 20000 },
    );
  }
}
