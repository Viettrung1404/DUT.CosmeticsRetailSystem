import { createTransport } from 'nodemailer';
import { SmtpOutboxMailer } from '../smtp-outbox.mailer';
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
describe('SMTP total delivery deadline', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    jest.useRealTimers();
  });
  it('releases the transport after a hard 10 second deadline even if the socket stays active', async () => {
    process.env.SMTP_HOST = 'test.example';
    process.env.SMTP_USER = 'test';
    process.env.SMTP_PASS = 'test';
    jest.useFakeTimers();
    const close = jest.fn();
    (createTransport as jest.Mock).mockReturnValue({
      sendMail: () => new Promise(() => {}),
      close,
    });
    const outcome = Promise.race([
      new SmtpOutboxMailer()
        .send('test@test.example', 'Test', 'Test', 'id')
        .then(
          () => 'sent',
          () => 'timeout',
        ),
      new Promise<string>((r) => setTimeout(() => r('still-pending'), 10001)),
    ]);
    await jest.advanceTimersByTimeAsync(10001);
    expect(await outcome).toBe('timeout');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
