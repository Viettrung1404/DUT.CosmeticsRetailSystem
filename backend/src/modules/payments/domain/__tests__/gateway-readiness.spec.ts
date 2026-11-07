import { assertGatewayReady } from '../gateway-readiness';
describe('Gateway readiness', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it('allows COD and configured MoMo but rejects missing keys or an unconfirmed quota', () => {
    expect(() => assertGatewayReady('COD')).not.toThrow();
    process.env.MOMO_ENABLED = 'true';
    process.env.MOMO_PARTNER_CODE = 'merchant';
    process.env.MOMO_ACCESS_KEY = 'access';
    process.env.MOMO_SECRET_KEY = 'secret';
    process.env.MOMO_MAX_QPS = '50';
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://test.example/api/v1';
    process.env.PAYMENT_WEB_RETURN_URL = 'https://test.example/payment/return';
    expect(() => assertGatewayReady('MOMO')).not.toThrow();
    delete process.env.MOMO_SECRET_KEY;
    expect(() => assertGatewayReady('MOMO')).toThrow();
    process.env.MOMO_SECRET_KEY = 'secret';
    process.env.MOMO_MAX_QPS = '0';
    expect(() => assertGatewayReady('MOMO')).toThrow();
  });
  it('rejects checkout before reservation when public return URLs are not configured', () => {
    process.env.MOMO_ENABLED = 'true';
    process.env.MOMO_PARTNER_CODE = 'merchant';
    process.env.MOMO_ACCESS_KEY = 'access';
    process.env.MOMO_SECRET_KEY = 'secret';
    process.env.MOMO_MAX_QPS = '50';
    delete process.env.PAYMENT_PUBLIC_BASE_URL;
    expect(() => assertGatewayReady('MOMO')).toThrow();
  });
});
