import { assertGatewayReady, gatewayAvailable } from '../gateway-readiness';
describe('Gateway readiness', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it('requires SePay credentials, receiving account, mode and an API quota no higher than 3', () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      PAYMENT_WORKER_ENABLED: 'true',
      SEPAY_ENABLED: 'true',
      SEPAY_MODE: 'sandbox',
      SEPAY_API_TOKEN: 'token',
      SEPAY_WEBHOOK_SECRET: 'secret',
      SEPAY_ACCOUNT_NUMBER: '0123456789',
      SEPAY_BANK_ACCOUNT_ID: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
      SEPAY_BANK_CODE: 'ACB',
      SEPAY_ACCOUNT_NAME: 'GLOWUP',
      SEPAY_MAX_QPS: '3',
      PAYMENT_PUBLIC_BASE_URL: 'https://api.test/api/v1',
      PAYMENT_WEB_RETURN_URL: 'https://shop.test/payment/return',
    });
    expect(gatewayAvailable('SEPAY')).toBe(true);
    for (const key of [
      'SEPAY_API_TOKEN',
      'SEPAY_WEBHOOK_SECRET',
      'SEPAY_ACCOUNT_NUMBER',
      'SEPAY_BANK_ACCOUNT_ID',
      'SEPAY_MODE',
    ]) {
      const value = process.env[key];
      delete process.env[key];
      expect(gatewayAvailable('SEPAY')).toBe(false);
      process.env[key] = value;
    }
    process.env.SEPAY_MAX_QPS = '4';
    expect(gatewayAvailable('SEPAY')).toBe(false);
    process.env.SEPAY_MAX_QPS = '3';
    process.env.NODE_ENV = 'production';
    expect(gatewayAvailable('SEPAY')).toBe(false);
    process.env.SEPAY_MODE = 'live';
    expect(gatewayAvailable('SEPAY')).toBe(true);
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

  it('exposes only availability and requires VNPay keys, quota, HTTPS and reconciliation', () => {
    process.env.VNPAY_ENABLED = 'true';
    process.env.VNPAY_TMN_CODE = 'test-terminal';
    process.env.VNPAY_HASH_SECRET = 'test-secret';
    process.env.VNPAY_MAX_QPS = '1';
    process.env.PAYMENT_PUBLIC_BASE_URL = 'https://api.example.test/api/v1';
    process.env.PAYMENT_WEB_RETURN_URL =
      'https://shop.example.test/payment/return';
    process.env.PAYMENT_WORKER_ENABLED = 'true';
    expect(gatewayAvailable('VNPAY')).toBe(true);
    for (const key of [
      'VNPAY_TMN_CODE',
      'VNPAY_HASH_SECRET',
      'VNPAY_MAX_QPS',
    ]) {
      const value = process.env[key];
      delete process.env[key];
      expect(gatewayAvailable('VNPAY')).toBe(false);
      process.env[key] = value;
    }
    process.env.PAYMENT_WORKER_ENABLED = 'false';
    expect(gatewayAvailable('VNPAY')).toBe(false);
    expect(gatewayAvailable('COD')).toBe(true);
    process.env.PAYMENT_WORKER_ENABLED = 'true';
    process.env.PAYMENT_PUBLIC_BASE_URL = 'http://localhost:3000/api/v1';
    expect(gatewayAvailable('VNPAY')).toBe(false);
  });
});
