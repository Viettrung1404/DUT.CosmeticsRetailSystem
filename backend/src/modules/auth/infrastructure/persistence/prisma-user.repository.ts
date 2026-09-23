import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({
      where: { phone },
      include: { role: true },
    });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(user);
    const raw = await this.prisma.user.create({
      data: {
        roleId: data.roleId,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        status: data.status,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        extraPermissions: data.extraPermissions,
        revokedPermissions: data.revokedPermissions,
        lastLoginAt: data.lastLoginAt,
      },
      include: { role: true },
    });
    return UserMapper.toDomain(raw);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(user);
    const raw = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: data.roleId,
        email: data.email,
        passwordHash: data.passwordHash,
        phone: data.phone,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        status: data.status,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        extraPermissions: data.extraPermissions,
        revokedPermissions: data.revokedPermissions,
        lastLoginAt: data.lastLoginAt,
      },
      include: { role: true },
    });
    return UserMapper.toDomain(raw);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async createCustomerForUser(userId: string, phone?: string | null): Promise<void> {
    await this.prisma.customer.create({
      data: {
        userId,
        phone: phone || null,
      },
    });
  }

  async findCustomerByPhone(phone: string): Promise<{ id: string; userId: string | null } | null> {
    return this.prisma.customer.findUnique({
      where: { phone },
      select: { id: true, userId: true },
    });
  }

  async linkCustomerToUser(customerId: string, userId: string): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { userId },
    });
  }
}
