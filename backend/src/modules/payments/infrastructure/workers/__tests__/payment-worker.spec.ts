import { PaymentWorker } from '../payment-worker';
import { Test } from '@nestjs/testing';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PaymentsService } from '../../../application/services/payments.service';
import { VnpayQueryError } from '../../../domain/vnpay-query.error';
describe('Payment worker scheduling', () => {
  it('logs VNPay query diagnostics and schedules recovery without confirming payment', async () => {
    const db = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const service = {
      process: jest
        .fn()
        .mockRejectedValue(new VnpayQueryError('request-id', '99')),
    };
    const worker = new PaymentWorker(db as any, service as any);
    const warn = jest
      .spyOn((worker as any).logger, 'warn')
      .mockImplementation();
    await (worker as any).run({ id: 'payment-id', claim_token: 'lease' });
    expect(warn).toHaveBeenCalledWith({
      code: 'VNPAY_QUERY_UNAVAILABLE',
      paymentId: 'payment-id',
      requestId: 'request-id',
      responseCode: '99',
    });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    const [sql, slowExpiredVnpay, paymentId, claimToken] = db.$executeRaw.mock.calls[0];
    expect(sql.join('')).toContain("clock_timestamp()+interval '15 seconds'");
    expect(sql.join('')).toContain("expires_at+interval '60 seconds'<=clock_timestamp()");
    expect(sql.join('')).toContain("clock_timestamp()+interval '5 minutes'");
    expect(slowExpiredVnpay).toBe(true);
    expect(sql.join('')).not.toContain("status='COMPLETED'");
    expect([paymentId, claimToken]).toEqual(['payment-id', 'lease']);
  });
  it('preserves normal retries for SePay, transport errors and other failures', async () => {
    const db = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const service = { process: jest.fn().mockRejectedValue(new Error('timeout')) };
    const worker = new PaymentWorker(db as any, service as any);
    const warn = jest.spyOn((worker as any).logger, 'warn').mockImplementation();
    await (worker as any).run({ id: 'payment-id', claim_token: 'lease' });
    expect(db.$executeRaw.mock.calls[0].slice(1)).toEqual([false, 'payment-id', 'lease']);
    expect(warn).not.toHaveBeenCalled();
  });
  it('waits for an in-flight claim before finishing shutdown', async () => {
    const previous = process.env.PAYMENT_WORKER_ENABLED;
    process.env.PAYMENT_WORKER_ENABLED = 'true';
    let release!: () => void;
    const gate = new Promise<Array<{ id: string; claim_token: string }>>(
      (r) => {
        release = () => r([{ id: 'pending', claim_token: 'lease' }]);
      },
    );
    const service = {
      process: jest.fn(async () => {}),
      expire: jest.fn(async () => 0),
    };
    const worker = new PaymentWorker({} as any, service as any);
    jest
      .spyOn(worker, 'claim')
      .mockImplementationOnce(() => gate)
      .mockResolvedValue([]);
    const poll = worker.tick();
    let shutdownFinished = false;
    const shutdown = worker.onModuleDestroy().then(() => {
      shutdownFinished = true;
    });
    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(shutdownFinished).toBe(false);
      release();
      await Promise.all([poll, shutdown]);
      expect(service.process).toHaveBeenCalledTimes(1);
    } finally {
      release();
      await Promise.all([poll, shutdown]);
      if (previous === undefined) delete process.env.PAYMENT_WORKER_ENABLED;
      else process.env.PAYMENT_WORKER_ENABLED = previous;
    }
  });
  it('keeps the database connected until in-flight payment processing drains on app shutdown', async () => {
    const previous = process.env.PAYMENT_WORKER_ENABLED;
    process.env.PAYMENT_WORKER_ENABLED = 'true';
    const db = new PrismaService();
    jest.spyOn(db, 'onModuleInit').mockResolvedValue();
    let applied = false;
    let disconnectedBeforeApply = false;
    jest.spyOn(db, '$disconnect').mockImplementation(async () => {
      disconnectedBeforeApply = !applied;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const service = {
      process: jest.fn(async () => {
        await gate;
        applied = true;
      }),
      expire: jest.fn(async () => 0),
    };
    const module = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        PaymentWorker,
        { provide: PaymentsService, useValue: service },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    const app = module.createNestApplication();
    await app.init();
    const worker = module.get(PaymentWorker);
    jest
      .spyOn(worker, 'claim')
      .mockResolvedValueOnce([{ id: 'pending', claim_token: 'lease' }])
      .mockResolvedValue([]);
    try {
      await worker.tick();
      const shutdown = app.close();
      await new Promise((resolve) => setImmediate(resolve));
      release();
      await shutdown;
      expect(service.process).toHaveBeenCalledTimes(1);
      expect(disconnectedBeforeApply).toBe(false);
    } finally {
      release();
      if (previous === undefined) delete process.env.PAYMENT_WORKER_ENABLED;
      else process.env.PAYMENT_WORKER_ENABLED = previous;
    }
  });
  it('keeps claiming urgent payments while a slow expiry sweep is running', async () => {
    let release!: () => void;
    const gate = new Promise<number>((r) => (release = () => r(0)));
    const service = { expire: jest.fn(() => gate) };
    const worker = new PaymentWorker({} as any, service as any);
    const claim = jest.spyOn(worker, 'claim').mockResolvedValue([]);
    let finished = false;
    const first = worker.tick().then(() => {
      finished = true;
    });
    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(finished).toBe(true);
      await worker.tick();
      expect(claim).toHaveBeenCalledTimes(4);
      expect(service.expire).toHaveBeenCalledTimes(1);
    } finally {
      release();
      await first;
      await worker.onModuleDestroy();
    }
  });
});
