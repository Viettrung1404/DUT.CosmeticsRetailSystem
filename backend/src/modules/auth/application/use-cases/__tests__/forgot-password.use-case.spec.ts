import { Test, TestingModule } from '@nestjs/testing';
import { ForgotPasswordUseCase } from '../forgot-password.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../../ports/email.port';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
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
        ForgotPasswordUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
        { provide: EMAIL_SERVICE, useValue: emailService },
      ],
    }).compile();

    useCase = module.get<ForgotPasswordUseCase>(ForgotPasswordUseCase);
  });

  it('should generate reset token and send email when user exists', async () => {
    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      fullName: 'User One',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute('user@glowup.vn');

    expect(result.message).toContain('Nếu email tồn tại');
    expect(tokenRepo.invalidateAllByUserId).toHaveBeenCalledWith('user-1', 'PASSWORD_RESET');
    expect(tokenRepo.create).toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('should return safe message without revealing email existence when user does not exist', async () => {
    userRepo.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute('notfound@glowup.vn');

    expect(result.message).toContain('Nếu email tồn tại');
    expect(tokenRepo.create).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
