import { PrismaService } from '@infrastructure/database/prisma.service';
import { randomUUID, createHash } from 'crypto';
import { BcryptService } from '../../../infrastructure/adapters/bcrypt.service';
import { PrismaUserSessionRepository } from '../../../infrastructure/persistence/prisma-user-session.repository';
import { ChangePasswordUseCase } from '../change-password.use-case';
import { ResetPasswordUseCase } from '../reset-password.use-case';
import { PrismaUserRepository } from '../../../infrastructure/persistence/prisma-user.repository';
import { PrismaVerificationTokenRepository } from '../../../infrastructure/persistence/prisma-verification-token.repository';
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration('Password and session transactions', () => {
  let db: PrismaService;
  let user: any;
  let sessions: PrismaUserSessionRepository;
  const bcrypt = new BcryptService();
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Dedicated local test DB required');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = new PrismaService();
    await db.$connect();
    await Promise.all(
      Array.from(
        { length: 20 },
        () => db.$queryRaw`SELECT pg_sleep(0.1)::text`,
      ),
    );
    await db.role.upsert({
      where: { id: 6 },
      update: {},
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
    });
    sessions = new PrismaUserSessionRepository(db);
  });
  beforeEach(async () => {
    user = await db.user.create({
      data: {
        email: `${randomUUID()}@test.example`,
        fullName: 'Test',
        emailVerified: true,
        passwordHash: await bcrypt.hash('OldPassword@123'),
      },
    });
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('keeps the current sid and revokes other refresh sessions when changing password', async () => {
    const current = await sessions.create({
      userId: user.id,
      refreshToken: randomUUID(),
      expiresAt: new Date(Date.now() + 100000),
    });
    const other = await sessions.create({
      userId: user.id,
      refreshToken: randomUUID(),
      expiresAt: new Date(Date.now() + 100000),
    });
    await new ChangePasswordUseCase(db, bcrypt).execute(
      user.id,
      current.id,
      'OldPassword@123',
      'NewPassword@123',
    );
    const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare('NewPassword@123', fresh.passwordHash!)).toBe(
      true,
    );
    expect(
      (await db.userSession.findUniqueOrThrow({ where: { id: current.id } }))
        .isRevoked,
    ).toBe(false);
    expect(
      (await db.userSession.findUniqueOrThrow({ where: { id: other.id } }))
        .isRevoked,
    ).toBe(true);
    expect(await db.emailOutbox.count({ where: { userId: user.id } })).toBe(1);
  });
  it('requires an active owned sid and checks the old password', async () => {
    const current = await sessions.create({
      userId: user.id,
      refreshToken: randomUUID(),
      expiresAt: new Date(Date.now() + 100000),
    });
    const useCase = new ChangePasswordUseCase(db, bcrypt);
    await expect(
      useCase.execute(user.id, undefined, 'OldPassword@123', 'NewPassword@123'),
    ).rejects.toThrow();
    await expect(
      useCase.execute(user.id, current.id, 'WrongPassword', 'NewPassword@123'),
    ).rejects.toThrow();
    await db.userSession.update({
      where: { id: current.id },
      data: { isRevoked: true },
    });
    await expect(
      useCase.execute(
        user.id,
        current.id,
        'OldPassword@123',
        'NewPassword@123',
      ),
    ).rejects.toThrow();
  });
  it('rotates via CAS in the same session row and rejects refresh replay', async () => {
    const old = randomUUID();
    const next = randomUUID();
    const current = await sessions.create({
      userId: user.id,
      refreshToken: old,
      expiresAt: new Date(Date.now() + 100000),
    });
    const results = await Promise.all([
      sessions['rotateActive']?.(old, next, new Date(Date.now() + 100000)),
      sessions['rotateActive']?.(
        old,
        randomUUID(),
        new Date(Date.now() + 100000),
      ),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.find(Boolean)?.id).toBe(current.id);
    expect(await sessions.findByRefreshToken(old)).toBeNull();
  });
  it('concurrent refresh cannot leave another session active after password change', async () => {
    const own = await sessions.create({
      userId: user.id,
      refreshToken: randomUUID(),
      expiresAt: new Date(Date.now() + 100000),
    });
    const old = randomUUID();
    const next = randomUUID();
    const other = await sessions.create({
      userId: user.id,
      refreshToken: old,
      expiresAt: new Date(Date.now() + 100000),
    });
    await Promise.all([
      sessions.rotateActive(old, next, new Date(Date.now() + 100000)),
      new ChangePasswordUseCase(db, bcrypt).execute(
        user.id,
        own.id,
        'OldPassword@123',
        'NewPassword@123',
      ),
    ]);
    expect(
      (await db.userSession.findUniqueOrThrow({ where: { id: other.id } }))
        .isRevoked,
    ).toBe(true);
    expect(
      await sessions.rotateActive(
        next,
        randomUUID(),
        new Date(Date.now() + 100000),
      ),
    ).toBeNull();
    expect(
      (await db.userSession.findUniqueOrThrow({ where: { id: own.id } }))
        .isRevoked,
    ).toBe(false);
  });
  it('reset races refresh atomically, consumes the reset token once and revokes every session', async () => {
    const old = randomUUID();
    const next = randomUUID();
    await sessions.create({
      userId: user.id,
      refreshToken: old,
      expiresAt: new Date(Date.now() + 100000),
    });
    const token = randomUUID();
    const tokens = new PrismaVerificationTokenRepository(db);
    await tokens.create({
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 100000),
    });
    const reset = new ResetPasswordUseCase(
      new PrismaUserRepository(db),
      tokens,
      sessions,
      db,
      bcrypt,
    );
    const results = await Promise.allSettled([
      reset.execute(token, 'ResetPassword@123'),
      reset.execute(token, 'DifferentPassword@123'),
      sessions.rotateActive(old, next, new Date(Date.now() + 100000)),
    ]);
    expect(
      results.slice(0, 2).filter((r) => r.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await db.userSession.count({
        where: { userId: user.id, isRevoked: false },
      }),
    ).toBe(0);
    expect(
      await sessions.rotateActive(
        next,
        randomUUID(),
        new Date(Date.now() + 100000),
      ),
    ).toBeNull();
    const hash = (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
      .passwordHash!;
    expect(
      await bcrypt.compare(
        results[0].status === 'fulfilled'
          ? 'ResetPassword@123'
          : 'DifferentPassword@123',
        hash,
      ),
    ).toBe(true);
  });
});
