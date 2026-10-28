import { NotificationWorker } from './notification.worker';

const mockSendMail = jest.fn();
const mockSendPush = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: (...args: unknown[]) => mockSendMail(...args),
  }),
}));
jest.mock('firebase-admin/app', () => ({
  cert: jest.fn(),
  getApps: () => [],
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ send: (...args: unknown[]) => mockSendPush(...args) }),
}));

describe('Durable notification delivery', () => {
  const config = {
    getOrThrow: () => '{}',
    get: (key: string, fallback?: unknown) =>
      key === 'FCM_SERVICE_ACCOUNT_JSON' ? '{}' : fallback,
  } as any;
  let db: any;
  beforeEach(() => {
    jest.clearAllMocks();
    db = {
      $queryRaw: jest.fn(),
      emailOutbox: { findFirst: jest.fn(), updateMany: jest.fn() },
      pushDelivery: { findFirst: jest.fn(), updateMany: jest.fn() },
      userDevice: { updateMany: jest.fn() },
    };
  });
  it('does not mark an email sent when the provider fails and bounds retries', async () => {
    db.$queryRaw.mockResolvedValue([
      {
        id: 'email-1',
        recipient: 'test@example.invalid',
        subject: 'Test',
        text: 'Test',
        attempts: 8,
      },
    ]);
    db.emailOutbox.findFirst.mockResolvedValue({ id: 'email-1' });
    mockSendMail.mockRejectedValue(new Error('provider timeout'));
    await new NotificationWorker(db, config).email();
    expect(db.emailOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          lastError: 'PROVIDER_SEND_FAILED',
          claimToken: null,
        }),
      }),
    );
  });
  it('skips email after the claim has expired or been stolen', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'email-1' }]);
    db.emailOutbox.findFirst.mockResolvedValue(null);
    await new NotificationWorker(db, config).email();
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(db.emailOutbox.updateMany).not.toHaveBeenCalled();
  });
  it('cancels delivery if the device now belongs to a different user', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'delivery-1', attempts: 1 }]);
    db.pushDelivery.findFirst.mockResolvedValue({
      device: { id: 'device', userId: 'other', isActive: true },
      notification: { id: 'notification', userId: 'owner' },
    });
    await new NotificationWorker(db, config).push();
    expect(mockSendPush).not.toHaveBeenCalled();
    expect(db.pushDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });
  it('deactivates an invalid token and does not retry it indefinitely', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'delivery-1', attempts: 1 }]);
    db.pushDelivery.findFirst.mockResolvedValue({
      device: {
        id: 'device',
        userId: 'owner',
        deviceToken: 'token',
        isActive: true,
      },
      notification: {
        id: 'notification',
        userId: 'owner',
        type: 'ORDER',
        title: 'Title',
        message: 'Message',
        data: { orderId: 'id', secret: 'hidden' },
      },
    });
    mockSendPush.mockRejectedValue({
      code: 'messaging/registration-token-not-registered',
    });
    await new NotificationWorker(db, config).push();
    expect(db.userDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
    expect(mockSendPush.mock.calls[0][0].data).toEqual({
      notificationId: 'notification',
      type: 'ORDER',
      orderId: 'id',
    });
  });
});
