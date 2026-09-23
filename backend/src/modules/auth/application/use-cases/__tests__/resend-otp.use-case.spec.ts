import { Test, TestingModule } from '@nestjs/testing';
import { ResendOtpUseCase } from '../resend-otp.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../../ports/email.port';
import { BadRequestException, HttpException } from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('ResendOtpUseCase', () => {
  let useCase: ResendOtpUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let tokenRepo: jest.Mocked<IVerificationTokenRepository>;
  let emailService: jest.Mocked<IEmailService>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResendOtpUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
        { provide: EMAIL_SERVICE, useValue: emailService },
      ],
    }).compile();

    useCase = module.get<ResendOtpUseCase>(ResendOtpUseCase);
  });

  it('should resend verification token successfully within rate limits', async () => {
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

    userRepo.findByEmail.mockResolvedValue(user);
    tokenRepo.countRecentByUserId.mockResolvedValue(1); // Mới gửi 1 lần

    const result = await useCase.execute('user@glowup.vn');

    expect(result.message).toContain('đã được gửi');
    expect(tokenRepo.invalidateAllByUserId).toHaveBeenCalledWith('user-1', 'EMAIL_VERIFICATION');
    expect(tokenRepo.create).toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
  });

  it('should enforce rate limit of 3 requests per hour', async () => {
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

    userRepo.findByEmail.mockResolvedValue(user);
    tokenRepo.countRecentByUserId.mockResolvedValue(3); // Đã gửi 3 lần trong 1 giờ

    await expect(useCase.execute('user@glowup.vn')).rejects.toThrow(HttpException);
  });

  it('should throw BadRequestException if email is already verified', async () => {
    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      fullName: 'User One',
      status: 'ACTIVE',
      emailVerified: true, // đã xác thực
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findByEmail.mockResolvedValue(user);

    await expect(useCase.execute('user@glowup.vn')).rejects.toThrow(BadRequestException);
  });
});
