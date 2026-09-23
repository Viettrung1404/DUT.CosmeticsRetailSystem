import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUseCase } from '../register.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  VERIFICATION_TOKEN_REPOSITORY,
  IVerificationTokenRepository,
} from '../../../domain/repositories/verification-token.repository.interface';
import { EMAIL_SERVICE, IEmailService } from '../../ports/email.port';
import { BcryptService } from '../../../infrastructure/adapters/bcrypt.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let tokenRepo: jest.Mocked<IVerificationTokenRepository>;
  let emailService: jest.Mocked<IEmailService>;
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

    emailService = {
      sendVerificationEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendPasswordChangedEmail: jest.fn(),
    };

    bcryptService = {
      hash: jest.fn().mockResolvedValue('hashedPassword123'),
      compare: jest.fn(),
    } as any;

    unitOfWork = {
      runInTransaction: jest.fn().mockImplementation((work) => work()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: VERIFICATION_TOKEN_REPOSITORY, useValue: tokenRepo },
        { provide: EMAIL_SERVICE, useValue: emailService },
        { provide: UNIT_OF_WORK, useValue: unitOfWork },
        { provide: BcryptService, useValue: bcryptService },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
  });

  it('should register a new user successfully and send verification email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.create.mockImplementation(async (user: UserEntity) => {
      return new UserEntity({
        id: 'new-user-uuid',
        roleId: user.roleId,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        extraPermissions: user.extraPermissions,
        revokedPermissions: user.revokedPermissions,
      });
    });
    tokenRepo.create.mockResolvedValue({ id: 'token-id' });

    const result = await useCase.execute({
      email: 'newuser@glowup.vn',
      password: 'StrongPassword@123',
      fullName: 'New Customer',
    });

    expect(result.userId).toBe('new-user-uuid');
    expect(result.email).toBe('newuser@glowup.vn');
    expect(userRepo.create).toHaveBeenCalled();
    expect(userRepo.createCustomerForUser).toHaveBeenCalledWith('new-user-uuid');
    expect(tokenRepo.create).toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
  });

  it('should throw ConflictException if email already exists', async () => {
    userRepo.findByEmail.mockResolvedValue(
      new UserEntity({
        id: 'existing-id',
        roleId: 6,
        email: 'exists@glowup.vn',
        fullName: 'Existing',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: false,
        extraPermissions: BigInt(0),
        revokedPermissions: BigInt(0),
      }),
    );

    await expect(
      useCase.execute({
        email: 'exists@glowup.vn',
        password: 'StrongPassword@123',
        fullName: 'Existing',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw BadRequestException if password is weak', async () => {
    await expect(
      useCase.execute({
        email: 'test@glowup.vn',
        password: 'weak',
        fullName: 'Weak Password',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
