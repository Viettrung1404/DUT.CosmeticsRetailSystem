import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
@Injectable()
export class UsersService {
  constructor(private readonly db: PrismaService) {}
  async get(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        emailVerified: true,
        phoneVerified: true,
        customer: { select: { dateOfBirth: true, gender: true } },
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }
  async update(
    userId: string,
    data: {
      fullName?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      dateOfBirth?: string | null;
      gender?: string | null;
    },
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id=${userId}::uuid FOR UPDATE`;
        const current = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { phone: true },
        });
        const userData = {
          fullName: data.fullName,
          phone: data.phone,
          avatarUrl: data.avatarUrl,
          ...(data.phone !== undefined && data.phone !== current.phone
            ? { phoneVerified: false }
            : {}),
        };
        const customerData = {
          fullName: data.fullName,
          phone: data.phone,
          dateOfBirth:
            data.dateOfBirth === undefined
              ? undefined
              : data.dateOfBirth === null
                ? null
                : new Date(data.dateOfBirth),
          gender: data.gender,
        };
        await tx.user.update({ where: { id: userId }, data: userData });
        await tx.customer.upsert({
          where: { userId },
          update: customerData,
          create: { userId, ...customerData },
        });
        return this.get(userId);
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new BadRequestException('Số điện thoại đã được sử dụng');
      throw e;
    }
  }
}
