import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  emailLayout,
  htmlToText,
  personalize,
  rewriteLinks,
  toHtmlBody,
} from '../../domain/email-content';

export type TrackingKind = 'open' | 'click' | 'unsubscribe';

export interface TrackingPayload {
  campaignId: string;
  userId: string;
  kind: TrackingKind;
  url?: string;
}

const KIND_CODE: Record<TrackingKind, string> = { open: 'o', click: 'c', unsubscribe: 'u' };

// Token ký HMAC nên không cần lưu từng link trong DB, và link nhấp không thể bị đổi thành chuyển hướng tự do
@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string | null {
    return this.config.get<string>('PUBLIC_API_URL')?.replace(/\/+$/, '') || null;
  }

  private sign(data: string): Buffer {
    const key = createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update('email-tracking')
      .digest();
    return createHmac('sha256', key).update(data).digest();
  }

  token(payload: TrackingPayload): string {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${data}.${this.sign(data).toString('base64url')}`;
  }

  verify(token: string, kind: TrackingKind): TrackingPayload | null {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expected = this.sign(data);
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TrackingPayload;
      return payload.kind === kind ? payload : null;
    } catch {
      return null;
    }
  }

  private link(payload: TrackingPayload): string {
    return `${this.baseUrl}/email/${KIND_CODE[payload.kind]}/${this.token(payload)}`;
  }

  render(
    campaign: { id: string; title: string; content: string },
    recipient: { userId: string; email: string; fullName: string | null },
  ): { html: string; text: string } {
    const body = personalize(toHtmlBody(campaign.content), recipient);
    const ids = { campaignId: campaign.id, userId: recipient.userId };
    if (!this.baseUrl) {
      this.logger.warn('Chưa cấu hình PUBLIC_API_URL: email không có theo dõi mở/nhấp và link hủy nhận');
      const footer = 'Bạn nhận thư này vì đã đăng ký tài khoản GlowUp.';
      return { html: emailLayout(campaign.title, body, footer), text: htmlToText(body) };
    }
    const tracked = rewriteLinks(body, (url) => this.link({ ...ids, kind: 'click', url }));
    const unsubscribe = this.link({ ...ids, kind: 'unsubscribe' });
    const pixel = `<img src="${this.link({ ...ids, kind: 'open' })}" width="1" height="1" alt="" style="display:none">`;
    const footer = `Bạn nhận thư này vì đã đăng ký tài khoản GlowUp. <a href="${unsubscribe}">Hủy nhận thư khuyến mãi</a>.${pixel}`;
    return {
      html: emailLayout(campaign.title, tracked, footer),
      text: `${htmlToText(body)}\n\nHủy nhận thư khuyến mãi: ${unsubscribe}`,
    };
  }
}
