import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { customerContext } from '@modules/customer-commerce/infrastructure/commands';

@Injectable()
export class CustomerContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerIdFromUserId(userId: string): Promise<string | null> {
    if (!userId) return null;

    return customerContext(this.prisma, userId);
  }
}
