import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
} from '../correlation-id.middleware';
import { getCorrelationId } from '../../logger/correlation-context';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it('should reuse existing x-correlation-id from incoming request header', (done) => {
    const existingId = 'corr-test-12345';
    const req: any = {
      headers: {
        [CORRELATION_ID_HEADER]: existingId,
      },
    };
    const res: any = {
      setHeader: jest.fn(),
    };

    middleware.use(req, res, () => {
      expect(req.headers[CORRELATION_ID_HEADER]).toBe(existingId);
      expect(req.correlationId).toBe(existingId);
      expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, existingId);
      expect(getCorrelationId()).toBe(existingId);
      done();
    });
  });

  it('should fallback to x-request-id header if x-correlation-id is missing', (done) => {
    const requestId = 'req-test-67890';
    const req: any = {
      headers: {
        [REQUEST_ID_HEADER]: requestId,
      },
    };
    const res: any = {
      setHeader: jest.fn(),
    };

    middleware.use(req, res, () => {
      expect(req.headers[CORRELATION_ID_HEADER]).toBe(requestId);
      expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, requestId);
      expect(getCorrelationId()).toBe(requestId);
      done();
    });
  });

  it('should generate a new UUID v4 if no correlation header is provided', (done) => {
    const req: any = {
      headers: {},
    };
    const res: any = {
      setHeader: jest.fn(),
    };

    middleware.use(req, res, () => {
      const generatedId = req.headers[CORRELATION_ID_HEADER];
      expect(generatedId).toBeDefined();
      expect(typeof generatedId).toBe('string');
      // UUID format validation: 8-4-4-4-12
      expect(generatedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(res.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, generatedId);
      expect(getCorrelationId()).toBe(generatedId);
      done();
    });
  });

  it('should maintain independent contexts across concurrent requests', async () => {
    const runRequest = (id: string) => {
      return new Promise<void>((resolve) => {
        const req: any = { headers: { [CORRELATION_ID_HEADER]: id } };
        const res: any = { setHeader: jest.fn() };

        middleware.use(req, res, async () => {
          // Simulate async delay
          await new Promise((r) => setTimeout(r, 20));
          expect(getCorrelationId()).toBe(id);
          resolve();
        });
      });
    };

    await Promise.all([
      runRequest('corr-thread-alpha'),
      runRequest('corr-thread-beta'),
      runRequest('corr-thread-gamma'),
    ]);
  });
});
