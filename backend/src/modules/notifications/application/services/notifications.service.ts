import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PrismaService) {}

  async list(userId: string, page: number, limit: number) {
    const [items, total, unreadCount] = await Promise.all([
      this.db.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.notification.count({ where: { userId } }),
      this.db.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount, page, limit };
  }

  async read(userId: string, id: string) {
    const updated = await this.db.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!updated.count)
      throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y thÃ´ng bÃ¡o');
    return { id, isRead: true };
  }
}
