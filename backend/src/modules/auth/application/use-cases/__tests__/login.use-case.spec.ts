import { Test, TestingModule } from '@nestjs/testing';
import { LoginUseCase } from '../login.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../../domain/repositories/user-session.repository.interface';
import { BcryptService } from '../../../infrastructure/adapters/bcrypt.service';
import { JwtTokenService } from '../../../infrastructure/adapters/jwt.service';
import { GetUserEffectivePermissionsUseCase } from '@modules/permissions/application/use-cases/get-user-effective-permissions.use-case';
import { UserEntity } from '../../../domain/entities/user.entity';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let sessionRepo: jest.Mocked<IUserSessionRepository>;
  let bcryptService: jest.Mocked<BcryptService>;
  let jwtService: jest.Mocked<JwtTokenService>;
  let getPermissionsUseCase: jest.Mocked<GetUserEffectivePermissionsUseCase>;

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

    sessionRepo = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      revokeById: jest.fn(),
      revokeAllByUserId: jest.fn(),
      revokeAllByUserIdExcept: jest.fn(),
    };

    bcryptService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as any;

    jwtService = {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      verifyAccessToken: jest.fn(),
    } as any;

    getPermissionsUseCase = {
      execute: jest.fn().mockResolvedValue(['PRODUCT_VIEW']),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: USER_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: BcryptService, useValue: bcryptService },
        { provide: JwtTokenService, useValue: jwtService },
        { provide: GetUserEffectivePermissionsUseCase, useValue: getPermissionsUseCase },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });

  it('should login successfully with valid credentials and verified email', async () => {
    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      passwordHash: 'hashedPass',
      fullName: 'GlowUp User',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
      roleName: 'Customer',
    });

    userRepo.findByEmail.mockResolvedValue(user);
    bcryptService.compare.mockResolvedValue(true);
    sessionRepo.create.mockResolvedValue({ id: 'session-1' });

    const result = await useCase.execute({
      email: 'user@glowup.vn',
      password: 'StrongPassword@123',
    });

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('user@glowup.vn');
    expect(userRepo.updateLastLogin).toHaveBeenCalledWith('user-1');
    expect(getPermissionsUseCase.execute).toHaveBeenCalledWith('user-1');
  });

  it('should throw UnauthorizedException when password is incorrect', async () => {
    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'user@glowup.vn',
      passwordHash: 'hashedPass',
      fullName: 'GlowUp User',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findByEmail.mockResolvedValue(user);
    bcryptService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'user@glowup.vn',
        password: 'WrongPassword',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException when email is not verified', async () => {
    const user = new UserEntity({
      id: 'user-1',
      roleId: 6,
      email: 'unverified@glowup.vn',
      passwordHash: 'hashedPass',
      fullName: 'Unverified',
      status: 'ACTIVE',
      emailVerified: false,
      phoneVerified: false,
      extraPermissions: BigInt(0),
      revokedPermissions: BigInt(0),
    });

    userRepo.findByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({
        email: 'unverified@glowup.vn',
        password: 'StrongPassword@123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

