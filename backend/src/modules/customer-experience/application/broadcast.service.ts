import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export interface BroadcastInput {
  campaignId: string;
  sendVersion: number;
  userIds: string[];
  title: string;
  message: string;
  route: 'PRODUCT' | 'PROMOTION' | 'BLOG';
  resourceId: string;
}
@Injectable()
export class BroadcastService {
  private busy = false;
  constructor(private readonly db: PrismaService) {}
  /** Internal integration: caller must authorize Admin and resolve audience first. */
  async freeze(tx: Prisma.TransactionClient, input: BroadcastInput) {
    const uuid =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    if (
      !uuid.test(input.campaignId) ||
      !uuid.test(input.resourceId) ||
      !Number.isSafeInteger(input.sendVersion) ||
      input.sendVersion < 1 ||
      !['PRODUCT', 'PROMOTION', 'BLOG'].includes(input.route) ||
      !input.title?.length ||
      input.title.length > 255 ||
      !input.message?.length ||
      input.message.length > 2000 ||
      !input.userIds.length ||
      input.userIds.length > 10000 ||
      input.userIds.some((id) => !uuid.test(id))
    )
      throw new BadRequestException('INVALID_BROADCAST');
    const userIds = [...new Set(input.userIds)].sort();
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ ...input, userIds }))
      .digest('hex');
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`BROADCAST:${input.campaignId}:${input.sendVersion}`}, 0))::text`;
    const where = {
      campaignId_sendVersion: {
        campaignId: input.campaignId,
        sendVersion: input.sendVersion,
      },
    };
    const previous = await tx.broadcastSend.findUnique({ where });
    if (previous) {
      if (previous.payloadHash !== payloadHash)
        throw new ConflictException('BROADCAST_PAYLOAD_MISMATCH');
      return { id: previous.id, recipients: userIds.length };
    }
    const users = await tx.user.findMany({
      where: { id: { in: userIds }, roleId: 6, status: 'ACTIVE' },
      select: { id: true },
    });
    if (users.length !== userIds.length)
      throw new BadRequestException('BROADCAST_AUDIENCE_INVALID');
    const { userIds: _, ...data } = input;
    const send = await tx.broadcastSend.create({
      data: { ...data, payloadHash },
    });
    await tx.broadcastRecipient.createMany({
      data: userIds.map((userId) => ({ sendId: send.id, userId })),
    });
    return { id: send.id, recipients: userIds.length };
  }
  @Interval(5000)
  async tick() {
    if (this.busy || process.env.BROADCAST_WORKER_ENABLED !== 'true') return;
    this.busy = true;
    try {
      await this.deliverBatch();
    } finally {
      this.busy = false;
    }
  }
  async deliverBatch() {
    return this.db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM broadcast_recipients WHERE delivered_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`;
        for (const row of rows) {
          const recipient = await tx.broadcastRecipient.findUniqueOrThrow({
            where: { id: row.id },
            include: { send: true },
          });
          const user = await tx.user.findFirst({
            where: { id: recipient.userId, roleId: 6, status: 'ACTIVE' },
            select: { id: true },
          });
          if (user) {
            const { send } = recipient;
            const eventKey = `CAMPAIGN:${send.campaignId}:${send.sendVersion}:${user.id}`;
            const notification = await tx.notification.upsert({
              where: { eventKey },
              update: {},
              create: {
                userId: user.id,
                eventKey,
                title: send.title,
                message: send.message,
                type: 'CAMPAIGN',
                data: { route: send.route, resourceId: send.resourceId },
              },
            });
            const devices = await tx.userDevice.findMany({
              where: { userId: user.id, isActive: true },
              select: { id: true },
            });
            if (devices.length)
              await tx.pushDelivery.createMany({
                skipDuplicates: true,
                data: devices.map((d) => ({
                  notificationId: notification.id,
                  deviceId: d.id,
                })),
              });
          }
          await tx.broadcastRecipient.update({
            where: { id: row.id },
            data: { deliveredAt: new Date() },
          });
        }
        return rows.length;
      },
      { timeout: 20000 },
    );
  }
}
