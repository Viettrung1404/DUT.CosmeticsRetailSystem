import { Injectable } from '@nestjs/common';
import { MarketingCampaign, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BroadcastService } from '@modules/customer-experience/application/broadcast.service';
import {
  AudienceValue,
  CampaignAudience,
  CampaignChannel,
  CampaignData,
  CampaignRecipient,
  CampaignRoute,
  CampaignStats,
  CampaignStatus,
  CampaignView,
  ICampaignRepository,
} from '../../domain/repositories/campaign.repository.interface';
import { chunk } from '../../domain/campaign-rules';

const PUSH_CHUNK = 10000;
const EMAIL_CHUNK = 1000;

const toView = (c: MarketingCampaign): CampaignView => ({
  id: c.id,
  name: c.name,
  channel: c.channel as CampaignChannel,
  audienceType: c.audienceType as CampaignAudience,
  audienceValue: (c.audienceValue as AudienceValue | null) ?? null,
  title: c.title,
  content: c.content,
  route: c.route as CampaignRoute | null,
  resourceId: c.resourceId,
  status: c.status as CampaignStatus,
  scheduledAt: c.scheduledAt,
  sentAt: c.sentAt,
  recipientCount: c.recipientCount,
  sendVersion: c.sendVersion,
  createdBy: c.createdBy,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const toPersistence = (d: CampaignData) => ({
  name: d.name,
  channel: d.channel,
  audienceType: d.audienceType,
  audienceValue: d.audienceValue ? (d.audienceValue as Prisma.InputJsonValue) : Prisma.DbNull,
  title: d.title,
  content: d.content,
  route: d.route,
  resourceId: d.resourceId,
});

const countBy = (rows: { status: string; total: bigint }[]) =>
  Object.fromEntries(rows.map((r) => [r.status, Number(r.total)]));

@Injectable()
export class PrismaCampaignRepository implements ICampaignRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcast: BroadcastService,
  ) {}

  async find(filter: {
    skip: number;
    take: number;
    status?: CampaignStatus;
    channel?: CampaignChannel;
    search?: string;
  }) {
    const where: Prisma.MarketingCampaignWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.channel && { channel: filter.channel }),
      ...(filter.search && { name: { contains: filter.search, mode: 'insensitive' } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.marketingCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);
    return { items: rows.map(toView), total };
  }

  async findById(id: string) {
    const row = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    return row ? toView(row) : null;
  }

  async create(data: CampaignData, createdBy: string) {
    return toView(
      await this.prisma.marketingCampaign.create({ data: { ...toPersistence(data), createdBy } }),
    );
  }

  async update(id: string, data: CampaignData) {
    return toView(
      await this.prisma.marketingCampaign.update({ where: { id }, data: toPersistence(data) }),
    );
  }

  async transition(
    id: string,
    from: CampaignStatus[],
    to: CampaignStatus,
    scheduledAt?: Date | null,
  ) {
    const result = await this.prisma.marketingCampaign.updateMany({
      where: { id, status: { in: from } },
      data: { status: to, ...(scheduledAt !== undefined && { scheduledAt }) },
    });
    return result.count ? this.findById(id) : null;
  }

  async findDueIds(now: Date, limit: number) {
    const rows = await this.prisma.marketingCampaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findTierIds(ids: string[]) {
    const rows = await this.prisma.loyaltyTier.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findCustomerIds(ids: string[]) {
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async resolveRecipients(
    audienceType: CampaignAudience,
    value: AudienceValue | null,
    needEmail: boolean,
  ) {
    const base: Prisma.UserWhereInput = {
      roleId: 6,
      status: 'ACTIVE',
      ...(needEmail && { emailVerified: true, NOT: { customer: { is: { emailOptOut: true } } } }),
    };
    const customers: Prisma.CustomerWhereInput | null =
      audienceType === 'ALL'
        ? null
        : audienceType === 'TIER'
          ? { loyaltyTierId: { in: value?.tierIds ?? [] } }
          : value?.customerTags?.length
            ? { tags: { some: { tag: { in: value.customerTags } } } }
            : { id: { in: value?.customerIds ?? [] } };
    const rows = await this.prisma.user.findMany({
      where: customers ? { ...base, customer: { is: customers } } : base,
      select: { id: true, email: true, fullName: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((r): CampaignRecipient => ({ userId: r.id, email: r.email, fullName: r.fullName }));
  }

  async dispatch(campaign: CampaignView, recipients: CampaignRecipient[]) {
    return this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.marketingCampaign.updateMany({
          where: { id: campaign.id, status: { in: ['DRAFT', 'SCHEDULED'] } },
          data: { status: 'SENDING' },
        });
        if (!claimed.count) return null;

        let version = campaign.sendVersion;
        if (campaign.channel === 'PUSH') {
          for (const part of chunk(recipients, PUSH_CHUNK)) {
            version += 1;
            await this.broadcast.freeze(tx, {
              campaignId: campaign.id,
              sendVersion: version,
              userIds: part.map((r) => r.userId),
              title: campaign.title,
              message: campaign.content,
              route: campaign.route as CampaignRoute,
              resourceId: campaign.resourceId as string,
            });
          }
        } else {
          for (const part of chunk(recipients, EMAIL_CHUNK)) {
            await tx.emailOutbox.createMany({
              skipDuplicates: true,
              data: part.map((r) => ({
                userId: r.userId,
                eventKey: `CAMPAIGN_EMAIL:${campaign.id}:${r.userId}`,
                recipient: r.email,
                subject: campaign.title,
                text: r.text ?? campaign.content,
                html: r.html ?? null,
              })),
            });
          }
        }

        const done = await tx.marketingCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            recipientCount: recipients.length,
            sendVersion: version,
          },
        });
        return toView(done);
      },
      { timeout: 60000, maxWait: 10000 },
    );
  }

  async getStats(campaign: CampaignView): Promise<CampaignStats> {
    const id = campaign.id;
    if (campaign.channel === 'EMAIL') {
      const rows = await this.prisma.$queryRaw<{ status: string; total: bigint }[]>`
        SELECT status, COUNT(*) AS total FROM email_outbox
        WHERE event_key LIKE ${`CAMPAIGN_EMAIL:${id}:%`} GROUP BY status`;
      return {
        recipientCount: campaign.recipientCount,
        push: { recipients: 0, delivered: 0, deliveries: {} },
        email: countBy(rows),
        engagement: await this.engagement(id, countBy(rows).SENT ?? 0),
      };
    }
    const [sent] = await this.prisma.$queryRaw<{ recipients: bigint; delivered: bigint }[]>`
      SELECT COUNT(r.id) AS recipients, COUNT(r.delivered_at) AS delivered
      FROM broadcast_sends s JOIN broadcast_recipients r ON r.send_id = s.id
      WHERE s.campaign_id = ${id}::uuid`;
    const rows = await this.prisma.$queryRaw<{ status: string; total: bigint }[]>`
      SELECT d.status, COUNT(*) AS total
      FROM notifications n JOIN push_deliveries d ON d.notification_id = n.id
      WHERE n.event_key LIKE ${`CAMPAIGN:${id}:%`} GROUP BY d.status`;
    return {
      recipientCount: campaign.recipientCount,
      push: {
        recipients: Number(sent?.recipients ?? 0),
        delivered: Number(sent?.delivered ?? 0),
        deliveries: countBy(rows),
      },
      email: {},
      engagement: null,
    };
  }

  // Tỷ lệ tính trên số thư đã gửi được; lượt mở có thể thiếu vì nhiều ứng dụng thư chặn ảnh
  private async engagement(campaignId: string, sent: number) {
    const [totals] = await this.prisma.$queryRaw<
      { opens: bigint; unique_opens: bigint; clicks: bigint; unique_clicks: bigint }[]
    >`
      SELECT count(*) FILTER (WHERE type = 'OPEN') AS opens,
        count(DISTINCT user_id) FILTER (WHERE type = 'OPEN') AS unique_opens,
        count(*) FILTER (WHERE type = 'CLICK') AS clicks,
        count(DISTINCT user_id) FILTER (WHERE type = 'CLICK') AS unique_clicks
      FROM marketing_email_events WHERE campaign_id = ${campaignId}::uuid`;
    const links = await this.prisma.$queryRaw<{ url: string; clicks: bigint }[]>`
      SELECT url, count(*) AS clicks FROM marketing_email_events
      WHERE campaign_id = ${campaignId}::uuid AND type = 'CLICK'
      GROUP BY url ORDER BY count(*) DESC, url LIMIT 10`;
    const uniqueOpens = Number(totals?.unique_opens ?? 0);
    const uniqueClicks = Number(totals?.unique_clicks ?? 0);
    const rate = (part: number) => (sent ? Math.round((part / sent) * 1000) / 10 : 0);
    return {
      opens: Number(totals?.opens ?? 0),
      uniqueOpens,
      clicks: Number(totals?.clicks ?? 0),
      uniqueClicks,
      openRate: rate(uniqueOpens),
      clickRate: rate(uniqueClicks),
      topLinks: links.map((l) => ({ url: l.url, clicks: Number(l.clicks) })),
    };
  }

  async recordEmailEvent(event: {
    campaignId: string;
    userId: string;
    type: 'OPEN' | 'CLICK';
    url: string | null;
  }) {
    await this.prisma.marketingEmailEvent.create({ data: event });
  }

  async setEmailOptOut(userId: string, optOut: boolean) {
    await this.prisma.customer.updateMany({ where: { userId }, data: { emailOptOut: optOut } });
  }
}
