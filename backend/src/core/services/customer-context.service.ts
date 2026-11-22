import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { customerContext } from '@modules/customer-commerce/infrastructure/commands';

@Injectable()
export class CustomerContextService {
  private readonly customerIdCache = new Map<string, { id: string | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getCustomerIdFromUserId(userId: string): Promise<string | null> {
    if (!userId) return null;

    const cached = this.customerIdCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.id;
    }

    const id = await customerContext(this.prisma, userId);
    this.customerIdCache.set(userId, { id, expiresAt: Date.now() + 60000 });
    if (this.customerIdCache.size > 1000) {
      const first = this.customerIdCache.keys().next().value;
      if (first) this.customerIdCache.delete(first);
    }
    return id;
  }
}
