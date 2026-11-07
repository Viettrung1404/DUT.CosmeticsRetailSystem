import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { UsersService } from '../users.service';
import { PrismaUserRepository } from '@modules/auth/infrastructure/persistence/prisma-user.repository';
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration('Profile and scoped auth updates', () => {
  let db: PrismaService;
  let user: any;
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Dedicated test DB required');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = new PrismaService();
    await db.$connect();
    await db.role.upsert({
      where: { id: 6 },
      create: { id: 6, name: 'Customer', displayName: 'Customer' },
      update: {},
    });
  });
  beforeEach(async () => {
    user = await db.user.create({
      data: {
        email: `${randomUUID()}@test.example`,
        fullName: 'Old',
        passwordHash: 'oldhash',
        phoneVerified: true,
      },
    });
    await db.customer.create({ data: { userId: user.id } });
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('syncs phone to customer, resets phone verification and returns only safe fields', async () => {
    const phone =
      '09' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    const service = new UsersService(db);
    const result = await service.update(user.id, { phone, fullName: 'New' });
    expect(result).toMatchObject({
      fullName: 'New',
      phone,
      phoneVerified: false,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('userSessions');
    expect(
      (await db.customer.findUniqueOrThrow({ where: { userId: user.id } }))
        .phone,
    ).toBe(phone);
  });
  it('email verification from an old snapshot cannot restore the old password or privileges', async () => {
    const repo = new PrismaUserRepository(db);
    const snapshot = (await repo.findById(user.id))!;
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: 'newhash', extraPermissions: 64n },
    });
    snapshot.verifyEmail();
    await repo.update(snapshot);
    const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.passwordHash).toBe('newhash');
    expect(fresh.extraPermissions).toBe(64n);
    expect(fresh.emailVerified).toBe(true);
  });
});
