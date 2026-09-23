import { Test, TestingModule } from '@nestjs/testing';
import { ResetPasswordUseCase } from '../reset-password.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../../domain/repositories/verification-token.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../../domain/repositories/user-session.repository.interface';
import { BcryptService } from '../../../infrastructure/adapters/bcrypt.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import { BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let tokenRepo: jest.Mocked<IVerificationTokenRepository>;
  let sessionRepo: jest.Mocked<IUserSessionRepository>;
  let bcryptService: jest.Mocked<BcryptService>;
  let unitOfWork: jest.Mocked<IUnitOfWork>;

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

    tokenRepo = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      markAsUsed: jest.fn(),
      countRecentByUserId: jest.fn(),
      invalidateAllByUserId: jest.fn(),
    };

    sessionRepo = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      revokeById: jest.fn(),
      revokeAllByUserId: jest.fn(),
      revokeAllByUserIdExcept: jest.fn(),
    };

    bcryptService = {
      hash: jest.fn().mockResolvedValue('newHashedPassword'),
      compare: jest.fn(),
    } as any;

    unitOfWork = {
      runInTransaction: jest.fn().mockImplementation((work) => work()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
        { provide: USER_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: UNIT_OF_WORK, useValue: unitOfWork },
        { provide: BcryptService, useValue: bcryptService },
      ],
    }).compile();

    useCase = module.get<ResetPasswordUseCase>(ResetPasswordUseCase);
  });

  it('should reset password successfully and revoke all existing sessions', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 100000),
      isUsed: false,
    });

    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      fullName: 'User One',
      passwordHash: 'oldHash',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute('valid-token', 'NewStrongPassword@2026');

    expect(result.message).toContain('thành công');
    expect(bcryptService.hash).toHaveBeenCalledWith('NewStrongPassword@2026');
    expect(user.passwordHash).toBe('newHashedPassword');
    expect(userRepo.update).toHaveBeenCalledWith(user);
    expect(tokenRepo.markAsUsed).toHaveBeenCalledWith('token-1');
    expect(sessionRepo.revokeAllByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should throw BadRequestException if new password is too weak', async () => {
    await expect(useCase.execute('some-token', 'weak')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if token is invalid or expired', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute('invalid-token', 'NewStrongPassword@2026'),
    ).rejects.toThrow(BadRequestException);
  });
});
