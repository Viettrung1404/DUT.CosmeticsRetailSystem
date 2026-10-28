import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DeviceDto } from '../presentation/commerce.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, page: number, limit: number) {
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount, page, limit };
  }
  async read(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!result.count) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    return { id, isRead: true };
  }
  register(userId: string, input: DeviceDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.deviceToken}, 0))::text`;
      const device = await tx.userDevice.findUnique({
        where: { deviceToken: input.deviceToken },
      });
      if (device && device.userId !== userId)
        await tx.pushDelivery.updateMany({
          where: {
            deviceId: device.id,
            status: { in: ['PENDING', 'PROCESSING'] },
          },
          data: { status: 'CANCELLED', claimToken: null },
        });
      const row = await tx.userDevice.upsert({
        where: { deviceToken: input.deviceToken },
        create: { userId, ...input, lastActiveAt: new Date() },
        update: { userId, ...input, isActive: true, lastActiveAt: new Date() },
      });
      return { id: row.id, platform: row.platform, isActive: row.isActive };
    });
  }
  async unregister(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.userDevice.updateMany({
        where: { id, userId },
        data: { isActive: false },
      });
      if (!row.count) throw new NotFoundException('DEVICE_NOT_FOUND');
      await tx.pushDelivery.updateMany({
        where: { deviceId: id, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'CANCELLED', claimToken: null },
      });
      return { id, isActive: false };
    });
  }
}
