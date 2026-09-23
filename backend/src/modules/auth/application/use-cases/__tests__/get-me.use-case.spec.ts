import { Test, TestingModule } from '@nestjs/testing';
import { GetMeUseCase } from '../get-me.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../../domain/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let userRepo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    userRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
      createCustomerForUser: jest.fn(),
      findCustomerByPhone: jest.fn(),
      linkCustomerToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMeUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
      ],
    }).compile();

    useCase = module.get<GetMeUseCase>(GetMeUseCase);
  });

  it('should return user profile when user is found', async () => {
    const user = new UserEntity({
      id: 'user-123',
      roleId: 6,
      email: 'customer@glowup.vn',
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      avatarUrl: 'https://example.com/avatar.jpg',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
      roleName: 'Customer',
      dataScope: 'SELF',
      createdAt: new Date('2026-01-01'),
    });

    userRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-123');

    expect(result).toEqual({
      id: 'user-123',
      email: 'customer@glowup.vn',
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      avatarUrl: 'https://example.com/avatar.jpg',
      roleName: 'Customer',
      dataScope: 'SELF',
      emailVerified: true,
      phoneVerified: true,
      createdAt: new Date('2026-01-01'),
    });
    expect(userRepo.findById).toHaveBeenCalledWith('user-123');
  });

  it('should throw NotFoundException when user does not exist', async () => {
    userRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundException);
  });
});
