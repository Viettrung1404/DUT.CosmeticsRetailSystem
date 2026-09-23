import { Test, TestingModule } from '@nestjs/testing';
import { VerifyEmailUseCase } from '../verify-email.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../../ports/email.port';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import { BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('VerifyEmailUseCase', () => {
  let useCase: VerifyEmailUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let tokenRepo: jest.Mocked<IVerificationTokenRepository>;
  let emailService: jest.Mocked<IEmailService>;
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

    emailService = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendPasswordChangedEmail: jest.fn(),
    };

    unitOfWork = {
      runInTransaction: jest.fn().mockImplementation((work) => work()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyEmailUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
        { provide: EMAIL_SERVICE, useValue: emailService },
        { provide: UNIT_OF_WORK, useValue: unitOfWork },
      ],
    }).compile();

    useCase = module.get<VerifyEmailUseCase>(VerifyEmailUseCase);
  });

  it('should verify email successfully and send welcome email', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 100000),
      isUsed: false,
    });

    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      fullName: 'User One',
      status: 'ACTIVE',
      emailVerified: false,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute('valid-raw-token');

    expect(result.message).toContain('thành công');
    expect(user.isEmailVerified()).toBe(true);
    expect(userRepo.update).toHaveBeenCalledWith(user);
    expect(tokenRepo.markAsUsed).toHaveBeenCalledWith('token-1');
    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(user.email, user.fullName);
  });

  it('should throw BadRequestException if token is not found', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute('invalid-token')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if token is already used', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 100000),
      isUsed: true,
    });

    await expect(useCase.execute('used-token')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if token is expired', async () => {
    tokenRepo.findByTokenHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() - 10000), // đã hết hạn
      isUsed: false,
    });

    await expect(useCase.execute('expired-token')).rejects.toThrow(BadRequestException);
  });
});
