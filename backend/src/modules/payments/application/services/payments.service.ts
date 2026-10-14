import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Payment } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { enqueueOrderEvent } from '@core/services/order-events';
import {
  Gateway,
  ONLINE_METHODS,
  validatePaymentAmount,
} from '../../domain/payment-policy';
import {
  Attempt,
  GatewayAdapter,
  Observation,
  vnDate,
} from '../../infrastructure/gateways/gateway-adapters';
import { cancelReservedOrder } from '@core/services/cancel-reserved-order';
import { assertGatewayReady } from '../../domain/gateway-readiness';
import { ConcurrencyLimiter } from '@core/utils/concurrency-limiter';
import { GatewayCallNotStartedError } from '../../domain/gateway-call-not-started.error';
export const PAYMENT_GATEWAYS = Symbol('PAYMENT_GATEWAYS');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
@Injectable()
export class PaymentsService {
  private readonly applyLimiter = new ConcurrencyLimiter(8);
  constructor(
    private readonly db: PrismaService,
    @Inject(PAYMENT_GATEWAYS)
    private readonly gateways: Record<Gateway, GatewayAdapter>,
  ) {}

  private async lock(
    tx: Prisma.TransactionClient,
    orderId: string,
    paymentId?: string,
  ) {
    await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId}::uuid FOR UPDATE`;
    if (paymentId)
      await tx.$queryRaw`SELECT id FROM payments WHERE id=${paymentId}::uuid FOR UPDATE`;
  }
  private async clock(tx: Prisma.TransactionClient): Promise<Date> {
    const [row] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS now`;
    return row.now;
  }
  private async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    receipt = false,
  ): Promise<T> {
    return this.db.transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT set_config('lock_timeout', ${receipt ? '250ms' : '500ms'}, true), set_config('statement_timeout', ${receipt ? '750ms' : '1500ms'}, true)`;
        return work(tx);
      },
      { maxWait: receipt ? 250 : 1000, timeout: receipt ? 1500 : 3000 },
    );
  }
  private async applyWithRetry<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const retryUntil = Date.now() + 25_000;
    for (;;) {
      try {
        return await this.applyLimiter.run(() => this.transaction(work));
      } catch (error) {
        const code = (error as any)?.code;
        const sqlState = (error as any)?.meta?.code;
        const transient =
          ['P2028', 'P2034', 'P2024', 'P1001', 'P1002'].includes(code) ||
          (code === 'P2010' &&
            ['55P03', '40P01', '40001', '57014'].includes(sqlState));
        if (!transient || Date.now() >= retryUntil) throw error;
        // Keep the verified gateway result in memory while retrying a short DB
        // write. Querying the gateway again adds 10/30s and can consume grace.
        await new Promise((resolve) =>
          setTimeout(resolve, 50 + Math.floor(Math.random() * 100)),
        );
      }
    }
  }
  private attempt(p: Payment, userId = 'GlowUp', ip = '127.0.0.1'): Attempt {
    return {
      id: p.id,
      merchantReference: p.merchantReference!,
      requestId: p.requestId!,
      amount: Number(p.amount),
      expiresAt: p.expiresAt!,
      createdAt: p.createdAt,
      returnUrl: p.returnUrl!,
      userId,
      ip,
    };
  }
  private response(p: Payment) {
    return {
      paymentId: p.id,
      orderId: p.orderId,
      method: p.paymentMethod,
      status: p.status,
      paymentUrl: p.paymentUrl,
      walletDeeplink: p.walletDeeplink,
      qrCodeData: p.qrCodeData,
      returnUrl: p.returnUrl,
      expiresAt: p.expiresAt,
    };
  }
  private checkMerchant(p: Payment, o: Observation) {
    const field = {
      MOMO: 'partnerCode',
      VNPAY: 'vnp_TmnCode',
      ZALOPAY: 'app_id',
    }[o.gateway];
    const snapshot = p.requestSnapshot as Record<string, unknown> | null;
    if (
      snapshot?.[field] !== undefined &&
      String(snapshot[field]) !== String(o.merchantId ?? o.payload[field])
    )
      throw new BadRequestException(
        'Payment merchant does not match its attempt',
      );
  }
  async create(
    userId: string,
    method: Gateway,
    orderId: string,
    platform = 'WEB',
    ip = '127.0.0.1',
  ) {
    if (
      !ONLINE_METHODS.includes(method) ||
      !['WEB', 'MOBILE'].includes(platform)
    )
      throw new BadRequestException('Invalid payment method/platform');
    assertGatewayReady(method);
    const prepared = await this.transaction(async (tx) => {
      await this.lock(tx, orderId);
      const order = await tx.order.findFirst({
        where: { id: orderId, customer: { userId } },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const active = order.payments[0];
      if (!active || active.paymentMethod !== method)
        throw new BadRequestException(
          'Đơn hàng phải dùng cổng đã chọn khi checkout',
        );
      if (order.status !== 'PENDING')
        throw new BadRequestException('Đơn hàng không còn chờ thanh toán');
      const now = await this.clock(tx);
      const expiresAt = new Date(order.createdAt.getTime() + 900000);
      if (now >= expiresAt)
        throw new BadRequestException('Đơn hàng đã hết hạn thanh toán');
      if (active.merchantReference && active.status !== 'FAILED') {
        // VNPay create only signs a URL locally, so a crash before publishing it is safely replayable.
        const recoverUrl =
          method === 'VNPAY' &&
          active.status === 'INITIATING' &&
          !active.paymentUrl &&
          !!active.requestSnapshot;
        return { payment: active, send: recoverUrl };
      }
      validatePaymentAmount(method, Number(order.totalAmount));
      const id = active.merchantReference ? randomUUID() : active.id;
      const state = randomBytes(32).toString('hex');
      const route = method === 'ZALOPAY' ? 'return' : 'callback';
      const base = process.env.PAYMENT_PUBLIC_BASE_URL?.replace(/\/+$/, '');
      if (!base || new URL(base).protocol !== 'https:')
        throw new BadRequestException(
          'Cần cấu hình PAYMENT_PUBLIC_BASE_URL HTTPS',
        );
      const webReturn = process.env.PAYMENT_WEB_RETURN_URL;
      if (!webReturn || new URL(webReturn).protocol !== 'https:')
        throw new BadRequestException(
          'Cần cấu hình PAYMENT_WEB_RETURN_URL HTTPS',
        );
      const returnUrl = `${base}/payments/${method.toLowerCase()}/${route}?state=${state}`;
      const merchantReference =
        method === 'ZALOPAY'
          ? `${vnDate(now).slice(2, 8)}_${id.replace(/-/g, '')}`
          : id.replace(/-/g, '');
      const a: Attempt = {
        id,
        merchantReference,
        requestId: randomBytes(16).toString('hex'),
        amount: Number(order.totalAmount),
        expiresAt,
        createdAt: now,
        returnUrl,
        userId,
        ip,
      };
      const request = this.gateways[method].prepare(a, now);
      const data = {
        orderId,
        paymentMethod: method,
        amount: order.totalAmount,
        status: 'INITIATING',
        merchantReference,
        requestId: a.requestId,
        platform,
        returnState: state,
        returnStateExpiresAt: new Date(now.getTime() + 86400000),
        returnUrl,
        expiresAt,
        requestSnapshot: request as Prisma.InputJsonValue,
        nextQueryAt: new Date(now.getTime() + 30000),
        recoveryUntil: new Date(now.getTime() + 86400000),
        createdAt: now,
      };
      const payment = active.merchantReference
        ? await tx.payment.create({ data: { id, ...data } })
        : await tx.payment.update({ where: { id }, data });
      return { payment, send: true };
    });
    if (!prepared.send) return this.response(prepared.payment);
    let creation;
    try {
      creation = await this.gateways[method].create(
        prepared.payment.requestSnapshot as Record<string, any>,
        this.attempt(prepared.payment, userId, ip),
      );
    } catch (error) {
      creation = {
        status:
          error instanceof GatewayCallNotStartedError ? 'FAILED' : 'UNKNOWN',
        paymentUrl: null,
        walletDeeplink: null,
        qrCodeData: null,
        payload:
          error instanceof GatewayCallNotStartedError
            ? { localCode: 'OUTBOUND_NOT_STARTED' }
            : {},
      };
    }
    const result = await this.transaction(async (tx) => {
      await this.lock(tx, orderId, prepared.payment.id);
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: prepared.payment.id },
      });
      const evidence =
        current.verificationPending || current.firstPaidReceivedAt !== null;
      await tx.payment.updateMany({
        where: { id: prepared.payment.id, status: 'INITIATING' },
        data: {
          status:
            evidence && creation.status === 'FAILED'
              ? 'UNKNOWN'
              : creation.status,
          paymentUrl: creation.paymentUrl,
          walletDeeplink: creation.walletDeeplink,
          qrCodeData: creation.qrCodeData,
          gatewayResponse: creation.payload,
          nextQueryAt:
            creation.status === 'FAILED' && !evidence ? null : new Date(),
          verificationPending: evidence || creation.status === 'UNKNOWN',
        },
      });
      return tx.payment.findUniqueOrThrow({
        where: { id: prepared.payment.id },
      });
    });
    return this.response(result);
  }
  async receive(o: Observation): Promise<boolean> {
    return this.transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { merchantReference: o.merchantReference },
      });
      if (!payment || payment.paymentMethod !== o.gateway)
        throw new NotFoundException('Payment not found');
      await this.lock(tx, payment.orderId, payment.id);
      this.checkMerchant(payment, o);
      if (
        o.amount !== Number(payment.amount) ||
        (o.requestId !== undefined && o.requestId !== payment.requestId)
      )
        throw new BadRequestException({
          code: 'PAYMENT_INVALID_AMOUNT',
          message: 'Invalid amount or reference',
        });
      const eventKey = hash(
        [
          o.gateway,
          o.merchantReference,
          o.transactionId,
          o.kind,
          o.code,
          o.subCode,
        ].join('|'),
      );
      const [result] = await tx.$queryRaw<
        { inserted: boolean; charge_matched: boolean }[]
      >`WITH inserted AS (
        INSERT INTO payment_webhook_inbox (id,payment_id,event_key,payload_hash,payload,transaction_id,reported_status)
        VALUES (${randomUUID()}::uuid,${payment.id}::uuid,${eventKey},${hash(JSON.stringify(o.payload))},${JSON.stringify(o.payload)}::jsonb,${o.transactionId},${o.state})
        ON CONFLICT(event_key) DO NOTHING RETURNING received_at
      ), charge AS (
        INSERT INTO payment_charges (id,payment_id,gateway,transaction_id,amount,first_paid_received_at)
        SELECT ${randomUUID()}::uuid,${payment.id}::uuid,${o.gateway},${o.transactionId},${o.amount},i.received_at FROM inserted i WHERE ${o.state === 'PAID'}
        ON CONFLICT(gateway,transaction_id) DO UPDATE SET id=payment_charges.id
        WHERE payment_charges.payment_id=EXCLUDED.payment_id AND payment_charges.amount=EXCLUDED.amount RETURNING first_paid_received_at
      ), updated AS (
        UPDATE payments p SET gateway_reported_status=${o.state},verification_pending=true,next_query_at=i.received_at,
          first_paid_received_at=COALESCE(p.first_paid_received_at,c.first_paid_received_at)
        FROM inserted i LEFT JOIN charge c ON true WHERE p.id=${payment.id}::uuid RETURNING p.id
      ) SELECT EXISTS(SELECT 1 FROM inserted) AS inserted,EXISTS(SELECT 1 FROM charge) AS charge_matched`;
      if (result.inserted && o.state === 'PAID' && !result.charge_matched)
        throw new BadRequestException('Charge identity mismatch');
      return !result.inserted;
    }, true);
  }
  async process(paymentId: string, claimToken?: string): Promise<void> {
    const payment = await this.db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const o = await this.gateways[payment.paymentMethod as Gateway].query(
      this.attempt(payment),
    );
    this.checkMerchant(payment, o);
    if (
      o.gateway !== payment.paymentMethod ||
      o.merchantReference !== payment.merchantReference ||
      (o.state === 'PAID' && o.amount !== Number(payment.amount))
    )
      throw new BadRequestException('Query response mismatch');
    await this.applyWithRetry(async (tx) => {
      await this.lock(tx, payment.orderId);
      const [current] = await tx.$queryRaw<
        Array<{
          claimToken: string | null;
          leaseUntil: Date | null;
          expiresAt: Date;
          orderStatus: string;
          storeId: string;
          now: Date;
          fulfilledTransactionId: string | null;
          hasPaidEvidence: boolean;
        }>
      >`
        SELECT p.claim_token AS "claimToken",p.lease_until AS "leaseUntil",p.expires_at AS "expiresAt",o.status AS "orderStatus",o.store_id AS "storeId",clock_timestamp() AS now,
          (SELECT c.transaction_id FROM payment_charges c JOIN payments cp ON cp.id=c.payment_id WHERE cp.order_id=o.id AND c.fulfilled LIMIT 1) AS "fulfilledTransactionId",
          EXISTS(SELECT 1 FROM payment_charges c WHERE c.payment_id=p.id) AS "hasPaidEvidence"
        FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.id=${payment.id}::uuid FOR UPDATE OF p`;
      if (
        claimToken &&
        (current.claimToken !== claimToken ||
          !current.leaseUntil ||
          current.leaseUntil <= current.now)
      )
        return;
      if (o.state === 'PAID') {
        const [charge] = await tx.$queryRaw<
          Array<{ id: string; firstPaidReceivedAt: Date }>
        >`WITH charge AS (
          INSERT INTO payment_charges (id,payment_id,gateway,transaction_id,amount,verified_at)
          VALUES (${randomUUID()}::uuid,${payment.id}::uuid,${o.gateway},${o.transactionId},${o.amount},clock_timestamp())
          ON CONFLICT(gateway,transaction_id) DO UPDATE SET verified_at=clock_timestamp()
          WHERE payment_charges.payment_id=EXCLUDED.payment_id AND payment_charges.amount=EXCLUDED.amount
          RETURNING id,first_paid_received_at
        ), observed AS (
          UPDATE payments p SET first_paid_received_at=COALESCE(p.first_paid_received_at,c.first_paid_received_at) FROM charge c WHERE p.id=${payment.id}::uuid
        ) SELECT id,first_paid_received_at AS "firstPaidReceivedAt" FROM charge`;
        if (!charge) throw new BadRequestException('Charge identity mismatch');
        let confirmed = false;
        if (
          !current.fulfilledTransactionId &&
          current.orderStatus === 'PENDING'
        ) {
          await tx.$queryRaw`SELECT id FROM inventory WHERE store_id=${current.storeId}::uuid AND product_variant_id IN (SELECT product_variant_id FROM order_items WHERE order_id=${payment.orderId}::uuid) ORDER BY id FOR UPDATE`;
          // Compare native timestamps in PostgreSQL; JS Date truncates microseconds.
          const changed =
            await tx.$executeRaw`UPDATE orders o SET status='CONFIRMED',updated_at=clock_timestamp()
            FROM payments p JOIN payment_charges c ON c.payment_id=p.id
            WHERE o.id=${payment.orderId}::uuid AND o.id=p.order_id AND p.id=${payment.id}::uuid AND c.id=${charge.id}::uuid AND o.status='PENDING'
            AND c.first_paid_received_at<p.expires_at AND clock_timestamp()<p.expires_at+interval '60 seconds'`;
          confirmed = changed === 1;
        }
        const refund =
          !confirmed &&
          (current.orderStatus === 'CANCELLED' ||
            current.fulfilledTransactionId !== o.transactionId);
        if (refund && current.orderStatus === 'PENDING')
          await cancelReservedOrder(
            tx,
            payment.orderId,
            'Hết hạn thanh toán hoặc xác minh',
          );
        const compensationKey = `ONLINE_UNFULFILLED:${o.gateway}:${o.transactionId}`;
        await tx.$executeRaw`WITH completed AS (
          UPDATE payments p SET status='COMPLETED',transaction_id=COALESCE(p.transaction_id,${o.transactionId}),paid_at=COALESCE(p.paid_at,clock_timestamp()),gateway_reported_status='PAID',gateway_response=${JSON.stringify(o.payload)}::jsonb,reconciled_at=clock_timestamp(),
            verification_pending=EXISTS(SELECT 1 FROM payment_charges c WHERE c.payment_id=p.id AND c.verified_at IS NULL),
            next_query_at=CASE WHEN p.recovery_until>clock_timestamp() AND EXISTS(SELECT 1 FROM payment_charges c WHERE c.payment_id=p.id AND c.verified_at IS NULL) THEN clock_timestamp()+interval '15 seconds' ELSE NULL END,
            claim_token=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE p.id=${payment.id}::uuid
        ), fulfilled AS (
          UPDATE payment_charges SET fulfilled=true WHERE id=${charge.id}::uuid AND ${confirmed}
        ), inbox AS (
          UPDATE payment_webhook_inbox SET processed_at=clock_timestamp() WHERE payment_id=${payment.id}::uuid AND transaction_id=${o.transactionId} AND processed_at IS NULL
        ), history AS (
          INSERT INTO order_status_history (id,order_id,status,note) SELECT ${randomUUID()}::uuid,${payment.orderId}::uuid,'CONFIRMED','Đã xác minh thanh toán online' WHERE ${confirmed}
        ) INSERT INTO refunds (id,order_id,payment_id,amount,reason,status,compensation_key,updated_at)
          SELECT ${randomUUID()}::uuid,${payment.orderId}::uuid,${payment.id}::uuid,${o.amount},'Thanh toán muộn hoặc thừa; chờ hoàn tiền thủ công','PENDING',${compensationKey},clock_timestamp() WHERE ${refund}
          ON CONFLICT(compensation_key) DO NOTHING`;
        if (confirmed)
          await enqueueOrderEvent(tx, payment.orderId, 'CONFIRMED');
        if (refund)
          await enqueueOrderEvent(
            tx,
            payment.orderId,
            'REFUND_PENDING',
            hash(compensationKey).slice(0, 16),
          );
      } else {
        const terminal = o.state === 'FAILED' && !current.hasPaidEvidence;
        await tx.$executeRaw`WITH updated AS (
          UPDATE payments SET status=CASE WHEN status='COMPLETED' THEN 'COMPLETED' WHEN recovery_until<=clock_timestamp() THEN 'NEEDS_REVIEW' WHEN ${terminal} THEN 'FAILED' WHEN ${o.state === 'PAYABLE'} THEN 'PAYABLE' ELSE 'UNKNOWN' END,
            gateway_reported_status=${o.state},gateway_response=${JSON.stringify(o.payload)}::jsonb,reconciled_at=clock_timestamp(),verification_pending=NOT ${terminal},
            next_query_at=CASE WHEN ${terminal} OR recovery_until<=clock_timestamp() THEN NULL ELSE clock_timestamp()+interval '15 seconds' END,
            claim_token=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE id=${payment.id}::uuid
        ) UPDATE payment_webhook_inbox SET processed_at=clock_timestamp() WHERE payment_id=${payment.id}::uuid AND processed_at IS NULL AND ${terminal}`;
      }
    });
  }
  async expire(): Promise<number> {
    const rows = await this.db.$queryRaw<
      { id: string }[]
    >`SELECT o.id FROM orders o WHERE o.status='PENDING' AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.payment_method IN ('VNPAY','MOMO','ZALOPAY')) AND o.created_at + interval '15 minutes' <= clock_timestamp() ORDER BY o.created_at LIMIT 50`;
    let count = 0;
    for (const row of rows) {
      try {
        await this.applyLimiter.run(() =>
          this.transaction(async (tx) => {
            await this.lock(tx, row.id);
            const [state] = await tx.$queryRaw<
              { shouldCancel: boolean }[]
            >`SELECT o.status='PENDING' AND clock_timestamp()>=o.created_at+interval '15 minutes'
            AND NOT (clock_timestamp()<o.created_at+interval '16 minutes' AND EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.first_paid_received_at<COALESCE(p.expires_at,o.created_at+interval '15 minutes'))) AS "shouldCancel"
            FROM orders o WHERE o.id=${row.id}::uuid`;
            if (!state?.shouldCancel) return;
            if (
              await cancelReservedOrder(
                tx,
                row.id,
                'Hết hạn thanh toán hoặc xác minh',
              )
            )
              count++;
          }),
        );
      } catch {
        /* Busy orders are retried on the next one-second sweep. */
      }
    }
    return count;
  }
  async status(userId: string, paymentId: string) {
    const [result] = await this.db.$queryRaw<
      Array<{
        paymentId: string;
        orderId: string;
        method: string;
        status: string;
        paymentStatus: string;
        orderStatus: string;
        paymentUrl: string | null;
        walletDeeplink: string | null;
        qrCodeData: string | null;
        returnUrl: string | null;
        expiresAt: Date;
        verificationPending: boolean;
        refundPending: boolean;
        verificationDeadline: Date | null;
      }>
    >`
      SELECT p.id AS "paymentId",p.order_id AS "orderId",p.payment_method AS method,p.status,p.status AS "paymentStatus",o.status AS "orderStatus",
        CASE WHEN o.status='PENDING' AND clock_timestamp()<p.expires_at AND p.status IN ('PAYABLE','UNKNOWN','INITIATING') THEN p.payment_url END AS "paymentUrl",
        CASE WHEN o.status='PENDING' AND clock_timestamp()<p.expires_at AND p.status IN ('PAYABLE','UNKNOWN','INITIATING') THEN p.wallet_deeplink END AS "walletDeeplink",
        CASE WHEN o.status='PENDING' AND clock_timestamp()<p.expires_at AND p.status IN ('PAYABLE','UNKNOWN','INITIATING') THEN p.qr_code_data END AS "qrCodeData",
        p.return_url AS "returnUrl",COALESCE(p.expires_at,o.created_at+CASE WHEN p.payment_method='COD' THEN interval '30 minutes' ELSE interval '15 minutes' END) AS "expiresAt",
        p.verification_pending AS "verificationPending",EXISTS(SELECT 1 FROM refunds r WHERE r.payment_id=p.id AND r.status='PENDING') AS "refundPending",
        CASE WHEN p.first_paid_received_at<p.expires_at THEN p.expires_at+interval '60 seconds' END AS "verificationDeadline"
      FROM payments p JOIN orders o ON o.id=p.order_id JOIN customers c ON c.id=o.customer_id
      WHERE p.id=${paymentId}::uuid AND c.user_id=${userId}::uuid`;
    if (!result) throw new NotFoundException('Không tìm thấy thanh toán');
    return result;
  }
}
