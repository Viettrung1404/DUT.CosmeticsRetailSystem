import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenUseCase } from '../refresh-token.use-case';
import { USER_REPOSITORY, IUserRepository } from '../../../domain/repositories/user.repository.interface';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../../domain/repositories/user-session.repository.interface';
import { JwtTokenService } from '../../../infrastructure/adapters/jwt.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UNIT_OF_WORK, IUnitOfWork } from '@core/database/unit-of-work.interface';
import { UnauthorizedException } from '@nestjs/common';
import { UserEntity } from '../../../domain/entities/user.entity';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let userRepo: jest.Mocked<IUserRepository>;
  let sessionRepo: jest.Mocked<IUserSessionRepository>;
  let jwtService: jest.Mocked<JwtTokenService>;
  let prisma: jest.Mocked<any>;
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

    sessionRepo = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      revokeById: jest.fn(),
      revokeAllByUserId: jest.fn(),
      revokeAllByUserIdExcept: jest.fn(),
    };

    jwtService = {
      generateAccessToken: jest.fn().mockReturnValue('new-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('new-refresh-token'),
      verifyAccessToken: jest.fn(),
    } as any;

    prisma = {
      permission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    unitOfWork = {
      runInTransaction: jest.fn().mockImplementation((work) => work()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: USER_SESSION_REPOSITORY, useValue: sessionRepo },
        { provide: UNIT_OF_WORK, useValue: unitOfWork },
        { provide: JwtTokenService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUseCase>(RefreshTokenUseCase);
  });

  it('should rotate tokens successfully (revoke old, issue new)', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'valid-old-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 1000000),
    });

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

    userRepo.findById.mockResolvedValue(user);
    sessionRepo.create.mockResolvedValue({ id: 'new-session-id' });

    const result = await useCase.execute('valid-old-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(sessionRepo.revokeById).toHaveBeenCalledWith('session-1');
    expect(sessionRepo.create).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if session is revoked', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'revoked-token',
      isRevoked: true,
      expiresAt: new Date(Date.now() + 1000000),
    });

    await expect(useCase.execute('revoked-token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if session is expired', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'expired-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() - 1000), // Ä‘Ã£ háº¿t háº¡n
    });

    await expect(useCase.execute('expired-token')).rejects.toThrow(UnauthorizedException);
  });
});
