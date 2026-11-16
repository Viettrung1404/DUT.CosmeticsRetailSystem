import { StructuredLoggerService } from '../structured-logger.service';
import { runWithCorrelationContext } from '../correlation-context';

describe('StructuredLoggerService', () => {
  let logger: StructuredLoggerService;
  let stdoutWriteSpy: jest.SpyInstance;
  let stderrWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredLoggerService('TestContext');
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  });

  it('should format structured log entry with level INFO, context, and message', () => {
    const entry = logger.formatEntry('INFO', 'Test info message', []);

    expect(entry.level).toBe('INFO');
    expect(entry.context).toBe('TestContext');
    expect(entry.message).toBe('Test info message');
    expect(entry.timestamp).toBeDefined();
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
  });

  it('should capture correlationId from AsyncLocalStorage context', () => {
    const correlationId = 'test-corr-trace-999';

    runWithCorrelationContext(correlationId, () => {
      const entry = logger.formatEntry('INFO', 'Message within context', []);
      expect(entry.correlationId).toBe(correlationId);

      logger.log('Printed log within context');
      expect(stdoutWriteSpy).toHaveBeenCalled();
      const output = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
      expect(output.correlationId).toBe(correlationId);
      expect(output.message).toBe('Printed log within context');
    });
  });

  it('should format error with stack trace and output to stderr', () => {
    const error = new Error('Database connection failed');
    const entry = logger.formatEntry('ERROR', 'Operation error', [error]);

    expect(entry.level).toBe('ERROR');
    expect(entry.stack).toBeDefined();
    expect(entry.data?.errorName).toBe('Error');
    expect(entry.data?.details).toBe('Database connection failed');

    logger.error('Failed transaction', error);
    expect(stderrWriteSpy).toHaveBeenCalled();
    const output = JSON.parse(stderrWriteSpy.mock.calls[0][0]);
    expect(output.level).toBe('ERROR');
    expect(output.stack).toBeDefined();
  });

  it('should format warning with optional data', () => {
    const data = { retryCount: 2, delayMs: 1000 };
    logger.warn('Retry attempt warning', data);

    expect(stdoutWriteSpy).toHaveBeenCalled();
    const output = JSON.parse(stdoutWriteSpy.mock.calls[0][0]);
    expect(output.level).toBe('WARN');
    expect(output.data).toEqual(data);
  });
});
