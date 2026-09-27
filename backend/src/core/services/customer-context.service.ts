import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CustomerContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerIdFromUserId(userId: string): Promise<string | null> {
    if (!userId) return null;

    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (customer) {
      return customer.id;
    }

    // Auto-create customer profile for this user if it doesn't exist
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, fullName: true },
    });

    const newCustomer = await this.prisma.customer.create({
      data: {
        userId,
        phone: user?.phone || null,
        fullName: user?.fullName || null,
      },
      select: { id: true },
    });

    return newCustomer.id;
  }
}
