import { randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { NotificationsService } from '../notifications.service';
import { EmailOutboxWorker } from '../../../infrastructure/workers/email-outbox.worker';
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration('Notifications and durable email outbox', () => {
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
    user = await db.user.create({
      data: { email: `${randomUUID()}@test.example`, fullName: 'Test' },
    });
  });
  afterAll(async () => {
    await db.$disconnect();
  });
  it('keeps ownership private and returns unread count over all pages', async () => {
    const a = await db.notification.create({
      data: { userId: user.id, title: 'A', message: 'A', type: 'ORDER' },
    });
    await db.notification.create({
      data: { userId: user.id, title: 'B', message: 'B', type: 'ORDER' },
    });
    const service = new NotificationsService(db);
    expect(await service.list(user.id, 1, 1)).toMatchObject({
      unreadCount: 2,
      total: 2,
    });
    await expect(service.read(randomUUID(), a.id)).rejects.toThrow();
    await service.read(user.id, a.id);
    await service.read(user.id, a.id);
    expect((await service.list(user.id, 1, 10)).unreadCount).toBe(1);
  });
  it('SMTP failure schedules retry and never marks the outbox SENT', async () => {
    // Keep this shared test DB deterministic: process only this row by delaying other test fixtures.
    await db.emailOutbox.updateMany({
      where: { status: 'PENDING' },
      data: { nextAttemptAt: new Date(Date.now() + 3600000) },
    });
    const row = await db.emailOutbox.create({
      data: {
        userId: user.id,
        eventKey: randomUUID(),
        recipient: user.email,
        subject: 'Test',
        text: 'Test',
      },
    });
    const mailer = {
      send: async () => {
        throw new Error('SMTP down');
      },
    };
    await new EmailOutboxWorker(db, mailer).deliverOne();
    const fresh = await db.emailOutbox.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(fresh.status).toBe('PENDING');
    expect(fresh.attempts).toBe(1);
    expect(fresh.sentAt).toBeNull();
    await db.emailOutbox.update({
      where: { id: row.id },
      data: { nextAttemptAt: new Date(0) },
    });
    const deliveries: string[] = [];
    await new EmailOutboxWorker(db, {
      send: async (recipient) => {
        deliveries.push(recipient);
      },
    }).deliverOne();
    expect(deliveries).toEqual([user.email]);
    expect(
      (await db.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }))
        .status,
    ).toBe('SENT');
  });
});
