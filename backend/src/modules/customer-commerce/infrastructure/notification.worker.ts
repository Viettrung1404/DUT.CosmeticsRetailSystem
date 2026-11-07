import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationWorker {
  private busy = false;
  private readonly logger = new Logger(NotificationWorker.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  @Interval(5000)
  async tick() {
    if (
      this.busy ||
      this.config.get('NOTIFICATION_DELIVERY_ENABLED') !== 'true'
    )
      return;
    this.busy = true;
    try {
      if (
        this.config.get('SMTP_HOST') &&
        this.config.get('SMTP_USER') &&
        this.config.get('SMTP_PASS')
      )
        await this.email();
      if (this.config.get('FCM_SERVICE_ACCOUNT_JSON')) await this.push();
    } catch {
      this.logger.error(
        'Notification worker failed; durable jobs remain available for retry',
      );
    } finally {
      this.busy = false;
    }
  }
  async email() {
    const claim = randomUUID();
    const jobs = await this.prisma.$queryRaw<
      {
        id: string;
        recipient: string;
        subject: string;
        text: string;
        attempts: number;
      }[]
    >`
      UPDATE email_outbox SET status='PROCESSING', claim_token=${claim}::uuid,
        lease_until=now()+interval '2 minutes', attempts=attempts+1
      WHERE id IN (SELECT id FROM email_outbox WHERE status IN ('PENDING','PROCESSING') AND next_attempt_at<=now()
        AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at,id LIMIT 10 FOR UPDATE SKIP LOCKED)
      RETURNING id,recipient,subject,text,attempts`;
    const port = Number(this.config.get('SMTP_PORT', 587));
    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    for (const job of jobs) {
      try {
        const stillOwned = await this.prisma.emailOutbox.findFirst({
          where: {
            id: job.id,
            claimToken: claim,
            leaseUntil: { gt: new Date() },
          },
        });
        if (!stillOwned) continue;
        await transport.sendMail({
          from: this.config.get('SMTP_FROM'),
          to: job.recipient,
          subject: job.subject,
          text: job.text,
          messageId: `<${job.id}@glowup.notifications>`,
        });
        await this.prisma.emailOutbox.updateMany({
          where: { id: job.id, claimToken: claim },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            leaseUntil: null,
            claimToken: null,
          },
        });
      } catch {
        await this.prisma.emailOutbox.updateMany({
          where: { id: job.id, claimToken: claim },
          data: this.retry(job.attempts),
        });
      }
    }
  }
  async push() {
    const claim = randomUUID();
    const jobs = await this.prisma.$queryRaw<
      { id: string; attempts: number }[]
    >`
      UPDATE push_deliveries SET status='PROCESSING', claim_token=${claim}::uuid,
        lease_until=now()+interval '2 minutes', attempts=attempts+1
      WHERE id IN (SELECT id FROM push_deliveries WHERE status IN ('PENDING','PROCESSING') AND next_attempt_at<=now()
        AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at,id LIMIT 10 FOR UPDATE SKIP LOCKED)
      RETURNING id,attempts`;
    const app =
      getApps().find((app) => app.name === 'glowup-notifications') ??
      initializeApp(
        {
          credential: cert(
            JSON.parse(this.config.getOrThrow('FCM_SERVICE_ACCOUNT_JSON')),
          ),
        },
        'glowup-notifications',
      );
    for (const job of jobs) {
      const delivery = await this.prisma.pushDelivery.findFirst({
        where: {
          id: job.id,
          claimToken: claim,
          leaseUntil: { gt: new Date() },
        },
        include: { notification: true, device: true },
      });
      if (!delivery) continue;
      const { device, notification } = delivery;
      if (!device.isActive || device.userId !== notification.userId) {
        await this.prisma.pushDelivery.updateMany({
          where: { id: job.id, claimToken: claim },
          data: { status: 'CANCELLED', claimToken: null, leaseUntil: null },
        });
        continue;
      }
      try {
        const refs =
          notification.data &&
          typeof notification.data === 'object' &&
          !Array.isArray(notification.data)
            ? (Object.fromEntries(
                Object.entries(notification.data).filter(
                  ([key, value]) =>
                    [
                      'orderId',
                      'returnId',
                      'refundId',
                      'shipmentId',
                      'redemptionId',
                      'resourceId',
                      'route',
                    ].includes(key) && typeof value === 'string',
                ),
              ) as Record<string, string>)
            : {};
        await getMessaging(app).send({
          token: device.deviceToken,
          notification: {
            title: notification.title,
            body: notification.message,
          },
          data: {
            notificationId: notification.id,
            type: notification.type,
            ...refs,
          },
        });
        await this.prisma.pushDelivery.updateMany({
          where: { id: job.id, claimToken: claim },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            leaseUntil: null,
            claimToken: null,
          },
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        const invalid =
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token';
        if (invalid)
          await this.prisma.userDevice.updateMany({
            where: {
              id: device.id,
              userId: notification.userId,
              deviceToken: device.deviceToken,
            },
            data: { isActive: false },
          });
        await this.prisma.pushDelivery.updateMany({
          where: { id: job.id, claimToken: claim },
          data: invalid
            ? {
                status: 'FAILED',
                claimToken: null,
                leaseUntil: null,
                lastError: 'INVALID_DEVICE',
              }
            : this.retry(job.attempts),
        });
      }
    }
  }
  private retry(attempts: number) {
    return {
      status: attempts >= 8 ? 'FAILED' : 'PENDING',
      claimToken: null,
      leaseUntil: null,
      nextAttemptAt: new Date(
        Date.now() + Math.min(3600, 2 ** attempts * 5) * 1000,
      ),
      lastError: 'PROVIDER_SEND_FAILED',
    };
  }
}
