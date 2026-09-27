import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ICustomerRepository } from '../../domain/repositories/customer.repository.interface';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CustomerAddressEntity } from '../../domain/entities/customer-address.entity';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToCustomerEntity(raw: any): CustomerEntity {
    return new CustomerEntity({
      id: raw.id,
      userId: raw.userId,
      phone: raw.phone,
      fullName: raw.fullName || raw.user?.fullName,
      email: raw.user?.email || null,
      loyaltyTierId: raw.loyaltyTierId,
      totalPoints: raw.totalPoints,
      totalSpent: Number(raw.totalSpent || 0),
      totalOrders: raw.totalOrders,
      dateOfBirth: raw.dateOfBirth,
      gender: raw.gender,
      referralCode: raw.referralCode,
      loyaltyTier: raw.loyaltyTier
        ? {
            id: raw.loyaltyTier.id,
            name: raw.loyaltyTier.name,
            minPoints: raw.loyaltyTier.minPoints,
            discountPercentage: Number(raw.loyaltyTier.discountPercentage),
            pointMultiplier: Number(raw.loyaltyTier.pointMultiplier),
            benefits: raw.loyaltyTier.benefits,
          }
        : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  private mapToAddressEntity(raw: any): CustomerAddressEntity {
    return new CustomerAddressEntity({
      id: raw.id,
      customerId: raw.customerId,
      label: raw.label,
      recipientName: raw.recipientName,
      phone: raw.phone,
      addressLine: raw.addressLine,
      city: raw.city,
      district: raw.district,
      ward: raw.ward,
      isDefault: raw.isDefault,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findByUserId(userId: string): Promise<CustomerEntity | null> {
    const raw = await this.prisma.customer.findUnique({
      where: { userId },
      include: {
        user: true,
        loyaltyTier: true,
      },
    });

    if (!raw) {
      // Auto-create customer profile if user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return null;

      const created = await this.prisma.customer.create({
        data: {
          userId,
          phone: user.phone || null,
          fullName: user.fullName,
        },
        include: {
          user: true,
          loyaltyTier: true,
        },
      });
      return this.mapToCustomerEntity(created);
    }

    return this.mapToCustomerEntity(raw);
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const raw = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        loyaltyTier: true,
      },
    });
    return raw ? this.mapToCustomerEntity(raw) : null;
  }

  async findAddressesByCustomerId(customerId: string): Promise<CustomerAddressEntity[]> {
    const list = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return list.map((a) => this.mapToAddressEntity(a));
  }

  async findAddressById(addressId: string): Promise<CustomerAddressEntity | null> {
    const raw = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });
    return raw ? this.mapToAddressEntity(raw) : null;
  }

  async countAddresses(customerId: string): Promise<number> {
    return this.prisma.customerAddress.count({
      where: { customerId },
    });
  }

  async createAddress(
    customerId: string,
    address: Omit<CustomerAddressEntity, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'getFullAddress'>,
  ): Promise<CustomerAddressEntity> {
    const raw = await this.prisma.customerAddress.create({
      data: {
        customerId,
        label: address.label,
        recipientName: address.recipientName,
        phone: address.phone,
        addressLine: address.addressLine,
        city: address.city,
        district: address.district,
        ward: address.ward,
        isDefault: address.isDefault,
      },
    });
    return this.mapToAddressEntity(raw);
  }

  async updateAddress(
    addressId: string,
    address: Partial<Omit<CustomerAddressEntity, 'id' | 'customerId' | 'createdAt' | 'updatedAt' | 'getFullAddress'>>,
  ): Promise<CustomerAddressEntity> {
    const raw = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        ...(address.label !== undefined && { label: address.label }),
        ...(address.recipientName !== undefined && { recipientName: address.recipientName }),
        ...(address.phone !== undefined && { phone: address.phone }),
        ...(address.addressLine !== undefined && { addressLine: address.addressLine }),
        ...(address.city !== undefined && { city: address.city }),
        ...(address.district !== undefined && { district: address.district }),
        ...(address.ward !== undefined && { ward: address.ward }),
        ...(address.isDefault !== undefined && { isDefault: address.isDefault }),
      },
    });
    return this.mapToAddressEntity(raw);
  }

  async deleteAddress(addressId: string): Promise<void> {
    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });
  }

  async unsetDefaultAddresses(customerId: string): Promise<void> {
    await this.prisma.customerAddress.updateMany({
      where: { customerId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<void> {
    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
