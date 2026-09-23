import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from '../logout.use-case';
import {
  USER_SESSION_REPOSITORY,
  IUserSessionRepository,
} from '../../../domain/repositories/user-session.repository.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let sessionRepo: jest.Mocked<IUserSessionRepository>;

  beforeEach(async () => {
    sessionRepo = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      revokeById: jest.fn(),
      revokeAllByUserId: jest.fn(),
      revokeAllByUserIdExcept: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: USER_SESSION_REPOSITORY, useValue: sessionRepo },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
  });

  it('should revoke session on logout if session exists', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshToken: 'active-token',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000),
    });

    const result = await useCase.execute('active-token');

    expect(result.message).toContain('thành công');
    expect(sessionRepo.revokeById).toHaveBeenCalledWith('session-1');
  });

  it('should succeed even if session does not exist (idempotent)', async () => {
    sessionRepo.findByRefreshToken.mockResolvedValue(null);

    const result = await useCase.execute('unknown-token');

    expect(result.message).toContain('thành công');
    expect(sessionRepo.revokeById).not.toHaveBeenCalled();
  });
});
