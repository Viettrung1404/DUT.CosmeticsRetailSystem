const {
  assertGatewayReady,
} = require('../../src/modules/payments/domain/gateway-readiness');

const required = [
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'VNPAY_MAX_QPS',
  'PAYMENT_PUBLIC_BASE_URL',
  'PAYMENT_WEB_RETURN_URL',
];
for (const key of required)
  console.log(`${key}: ${process.env[key]?.trim() ? 'set' : 'MISSING'}`);
console.log(
  `VNPAY_ENABLED: ${process.env.VNPAY_ENABLED === 'true' ? 'enabled' : 'disabled'}`,
);
console.log(
  `PAYMENT_WORKER_ENABLED: ${process.env.PAYMENT_WORKER_ENABLED === 'false' ? 'disabled' : 'enabled'}`,
);

try {
  assertGatewayReady('VNPAY');
  const base = process.env.PAYMENT_PUBLIC_BASE_URL.replace(/\/+$/, '');
  console.log(`IPN URL: ${base}/payments/vnpay/ipn`);
  console.log(
    `Return URL: ${base}/payments/vnpay/callback (state is generated per payment)`,
  );
  console.log(`Frontend return: ${process.env.PAYMENT_WEB_RETURN_URL}`);
  console.log(
    'Configuration ready locally. Merchant credentials and public IPN reachability still need a sandbox transaction.',
  );
} catch {
  console.error(
    'VNPay is not ready. See docs/vnpay-setup.md for credentials, HTTPS URLs and quota configuration.',
  );
  process.exitCode = 1;
}
