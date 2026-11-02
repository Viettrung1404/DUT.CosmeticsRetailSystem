const { createHmac, timingSafeEqual } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const { PrismaClient } = require('@prisma/client');
const {
  VnpayQueryError,
} = require('../../src/modules/payments/domain/vnpay-query.error');
const {
  VnpayAdapter,
} = require('../../src/modules/payments/infrastructure/gateways/gateway-adapters');
const {
  createGatewayTransport,
} = require('../../src/modules/payments/infrastructure/gateways/gateway-http.transport');

const fields = [
  'vnp_RequestId',
  'vnp_Version',
  'vnp_Command',
  'vnp_TmnCode',
  'vnp_TxnRef',
  'vnp_TransactionDate',
  'vnp_CreateDate',
  'vnp_IpAddr',
  'vnp_OrderInfo',
];
const endpoint = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

function queryTimeIsCurrent(value) {
  if (!/^\d{14}$/.test(value)) return false;
  const utc = Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)) - 7,
    Number(value.slice(10, 12)),
    Number(value.slice(12, 14)),
  );
  return Math.abs(Date.now() - utc) <= 5000;
}

async function main() {
  const paymentId = process.argv[2];
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(paymentId || ''))
    throw new Error('Usage: npm run payment:vnpay:diagnose -- PAYMENT_UUID');
  if ((process.env.VNPAY_QUERY_URL || endpoint) !== endpoint)
    throw new Error(
      'This diagnostic supports only the official VNPay sandbox endpoint.',
    );
  if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET)
    throw new Error('VNPay merchant credentials are missing.');

  const db = new PrismaClient();
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { order: { select: { status: true } } },
    });
    if (
      !payment ||
      payment.paymentMethod !== 'VNPAY' ||
      !payment.paymentUrl ||
      !payment.merchantReference
    )
      throw new Error(
        'A VNPay payment with an existing payment URL is required.',
      );
    const original = new URL(payment.paymentUrl);
    if (original.hostname !== 'sandbox.vnpayment.vn')
      throw new Error('The payment must belong to the VNPay sandbox.');
    const snapshot = payment.requestSnapshot || {};
    const hashData = original.search
      .slice(1)
      .split('&')
      .filter((value) => !/^vnp_SecureHash(?:Type)?=/.test(value))
      .join('&');
    const expected = createHmac('sha512', process.env.VNPAY_HASH_SECRET)
      .update(hashData, 'utf8')
      .digest('hex');
    const originalHash = original.searchParams.get('vnp_SecureHash') || '';
    const secretMatchesOriginal =
      /^[a-f0-9]{128}$/i.test(originalHash) &&
      timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(originalHash, 'hex'),
      );
    if (
      !secretMatchesOriginal ||
      snapshot.vnp_TmnCode !== process.env.VNPAY_TMN_CODE
    )
      throw new Error(
        'Current merchant credentials do not match the original payment. No query was sent.',
      );
    const inboxCount = await db.paymentWebhookInbox.count({
      where: { paymentId },
    });
    const report = {
      paymentId,
      observedAtUtc: new Date().toISOString(),
      orderStatus: payment.order.status,
      paymentStatus: payment.status,
      ipnInboxCount: inboxCount,
      original: {
        transactionRef: snapshot.vnp_TxnRef,
        createDateGMT7: snapshot.vnp_CreateDate,
      },
      checks: { secretMatchesOriginalPaymentUrl: secretMatchesOriginal },
      signing: { algorithm: 'HMAC-SHA512', separator: '|', fieldOrder: fields },
    };
    const transport = createGatewayTransport('VNPAY');
    const adapter = new VnpayAdapter(process.env, async (url, payload) => {
      if (url !== endpoint) throw new Error('Unexpected query endpoint.');
      const independentHash = createHmac(
        'sha512',
        process.env.VNPAY_HASH_SECRET,
      )
        .update(fields.map((key) => String(payload[key])).join('|'), 'utf8')
        .digest('hex');
      Object.assign(report.checks, {
        transactionDateMatchesOriginalCreateDate:
          payload.vnp_TransactionDate === snapshot.vnp_CreateDate &&
          payload.vnp_TransactionDate ===
            original.searchParams.get('vnp_CreateDate'),
        transactionRefMatchesOriginal:
          payload.vnp_TxnRef === snapshot.vnp_TxnRef &&
          payload.vnp_TxnRef === original.searchParams.get('vnp_TxnRef'),
        merchantMatchesOriginal: payload.vnp_TmnCode === snapshot.vnp_TmnCode,
        requestIdHasValidFormat: /^[a-f0-9]{32}$/.test(payload.vnp_RequestId),
        queryDateGMT7WithinFiveSeconds: queryTimeIsCurrent(
          payload.vnp_CreateDate,
        ),
        signatureMatchesIndependentCalculation:
          payload.vnp_SecureHash === independentHash,
      });
      report.request = {
        endpoint: url,
        method: 'POST',
        contentType: 'application/json',
        vnp_RequestId: payload.vnp_RequestId,
        vnp_TmnCode: payload.vnp_TmnCode,
        vnp_TxnRef: payload.vnp_TxnRef,
        vnp_TransactionDate: payload.vnp_TransactionDate,
        vnp_CreateDate: payload.vnp_CreateDate,
        vnp_IpAddr: payload.vnp_IpAddr,
      };
      if (!Object.values(report.checks).every((value) => value === true))
        throw new Error('A request check failed; no query was sent.');
      // Delegate to the production transport so quota, HTTPS and timeout behavior match the worker.
      // Capture HTTP status without retaining the full request/response or signatures.
      const originalFetch = global.fetch;
      let httpStatus;
      global.fetch = async (...args) => {
        const response = await originalFetch(...args);
        httpStatus = response.status;
        return response;
      };
      let data;
      try {
        data = await transport(url, payload);
      } finally {
        global.fetch = originalFetch;
      }
      const safeCode = (value) =>
        /^\d{2}$/.test(String(value || '')) ? String(value) : null;
      report.response = {
        httpStatus,
        vnp_ResponseCode: safeCode(data.vnp_ResponseCode),
        vnp_TransactionStatus: safeCode(data.vnp_TransactionStatus),
        message: [
          'Unexpected error',
          'Success',
          'Successful',
          'Transaction not found',
        ].includes(data.vnp_Message)
          ? data.vnp_Message
          : '[omitted]',
        hasSignature:
          typeof data.vnp_SecureHash === 'string' &&
          data.vnp_SecureHash.length > 0,
      };
      return data;
    });
    try {
      const observation = await adapter.query({
        id: payment.id,
        merchantReference: payment.merchantReference,
        requestId: payment.requestId,
        amount: Number(payment.amount),
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
        returnUrl: payment.returnUrl,
        userId: 'diagnostic',
        ip: '127.0.0.1',
      });
      report.verification = { accepted: true, gatewayState: observation.state };
    } catch (error) {
      report.verification = {
        accepted: false,
        errorCode:
          error instanceof VnpayQueryError
            ? 'VNPAY_QUERY_UNAVAILABLE'
            : 'VNPAY_QUERY_NOT_VERIFIED',
        reason:
          error instanceof VnpayQueryError
            ? `VNPay returned unsigned provider error ${error.responseCode}; payment remains unverified.`
            : 'Query was not completed or the response failed verification.',
      };
    }
    await mkdir('.tmp', { recursive: true });
    const filename = `.tmp/vnpay-query-diagnostic-${paymentId}.json`;
    await writeFile(filename, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    console.log(`Saved ${filename}. No order or payment state was modified.`);
    if (!report.verification.accepted) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error.message?.startsWith('Usage:') ||
      error.message?.startsWith('This diagnostic') ||
      error.message?.startsWith('Current merchant')
      ? error.message
      : 'Diagnostic could not run. Check the payment ID, database and sandbox configuration.',
  );
  process.exitCode = 1;
});
