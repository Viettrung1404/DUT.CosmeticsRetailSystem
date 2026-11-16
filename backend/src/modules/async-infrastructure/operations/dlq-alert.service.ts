import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DlqAlertPayload {
  inboxId?: string;
  carrierCode: string;
  eventId: string;
  trackingCode?: string | null;
  errorMessage?: string | null;
  queueName?: string;
  occurredAt?: Date | string;
}

export interface DlqAlertResult {
  sent: boolean;
  channel?: 'DISCORD' | 'SLACK' | 'BOTH' | 'NONE';
  error?: string;
}

@Injectable()
export class DlqAlertService {
  private readonly logger = new Logger(DlqAlertService.name);
  private readonly discordWebhookUrl?: string;
  private readonly slackWebhookUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.discordWebhookUrl = this.configService.get<string>('DISCORD_DLQ_WEBHOOK_URL');
    this.slackWebhookUrl = this.configService.get<string>('SLACK_DLQ_WEBHOOK_URL');
  }

  /**
   * Phát cảnh báo tức thời tới Discord và/hoặc Slack khi có sự kiện rơi vào Dead Letter Queue (AC2)
   */
  async notifyDlq(payload: DlqAlertPayload): Promise<DlqAlertResult> {
    const queueName = payload.queueName || 'glowup-logistics-webhooks-dlq';
    const timestamp = payload.occurredAt
      ? new Date(payload.occurredAt).toISOString()
      : new Date().toISOString();

    this.logger.warn(
      `[DLQ ALERT TRIGGERED] Carrier=${payload.carrierCode}, EventId=${payload.eventId}, Tracking=${payload.trackingCode || 'N/A'}, Error=${payload.errorMessage || 'UNKNOWN'}`,
    );

    const hasDiscord = Boolean(this.discordWebhookUrl && this.discordWebhookUrl.trim());
    const hasSlack = Boolean(this.slackWebhookUrl && this.slackWebhookUrl.trim());

    if (!hasDiscord && !hasSlack) {
      this.logger.debug(
        'No Discord or Slack webhook URL configured for DLQ alerting. Alert logged locally.',
      );
      return { sent: false, channel: 'NONE' };
    }

    const promises: Promise<any>[] = [];

    if (hasDiscord) {
      promises.push(this.sendDiscordAlert(payload, queueName, timestamp));
    }

    if (hasSlack) {
      promises.push(this.sendSlackAlert(payload, queueName, timestamp));
    }

    try {
      await Promise.allSettled(promises);
      const channel = hasDiscord && hasSlack ? 'BOTH' : hasDiscord ? 'DISCORD' : 'SLACK';
      return { sent: true, channel };
    } catch (err: any) {
      this.logger.error(`Failed to dispatch DLQ alert webhook: ${err.message}`, err.stack);
      return { sent: false, error: err.message };
    }
  }

  private async sendDiscordAlert(
    payload: DlqAlertPayload,
    queueName: string,
    timestamp: string,
  ): Promise<void> {
    if (!this.discordWebhookUrl) return;

    const body = {
      content: '🚨 **[GLOWUP CRITICAL ALERT] Webhook Error Moved to DLQ**',
      embeds: [
        {
          title: `DLQ Alert: ${payload.carrierCode} Event`,
          color: 0xff0000, // Đỏ rực
          fields: [
            { name: 'Carrier', value: payload.carrierCode, inline: true },
            { name: 'Queue', value: queueName, inline: true },
            { name: 'Tracking Code', value: payload.trackingCode || 'N/A', inline: true },
            { name: 'Event ID', value: payload.eventId, inline: false },
            {
              name: 'Error Detail',
              value: (payload.errorMessage || 'Unknown Error').substring(0, 1000),
              inline: false,
            },
          ],
          timestamp,
          footer: { text: 'GlowUp Logistics Disaster Recovery & Observability' },
        },
      ],
    };

    try {
      await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err: any) {
      this.logger.error(`Discord alert delivery failed: ${err.message}`);
    }
  }

  private async sendSlackAlert(
    payload: DlqAlertPayload,
    queueName: string,
    timestamp: string,
  ): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const body = {
      text: `🚨 *[GLOWUP ALERT] Webhook Error in DLQ* (${payload.carrierCode} - ${payload.trackingCode || payload.eventId})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Critical: Webhook Moved to DLQ',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Carrier:*\n${payload.carrierCode}` },
            { type: 'mrkdwn', text: `*Queue:*\n${queueName}` },
            { type: 'mrkdwn', text: `*Tracking Code:*\n${payload.trackingCode || 'N/A'}` },
            { type: 'mrkdwn', text: `*Event ID:*\n\`${payload.eventId}\`` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error Message:*\n\`\`\`${payload.errorMessage || 'Unknown error'}\`\`\``,
          },
        },
      ],
    };

    try {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err: any) {
      this.logger.error(`Slack alert delivery failed: ${err.message}`);
    }
  }
}
