export const CAMPAIGN_REPOSITORY = Symbol('ICampaignRepository');

export const CAMPAIGN_CHANNELS = ['PUSH', 'EMAIL'] as const;
// Nhóm RFM sẽ thêm vào đây khi nối với báo cáo khách hàng
export const CAMPAIGN_AUDIENCES = ['ALL', 'TIER', 'CUSTOMERS'] as const;
export const CAMPAIGN_ROUTES = ['PRODUCT', 'PROMOTION', 'BLOG'] as const;
export const CAMPAIGN_STATUSES = ['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];
export type CampaignRoute = (typeof CAMPAIGN_ROUTES)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface AudienceValue {
  tierIds?: string[];
  customerIds?: string[];
  // Nhóm RFM: danh sách khách được tính lại lúc gửi
  rfmSegments?: string[];
  // Nhãn gắn tay cho khách: danh sách khách được tính lại lúc gửi
  customerTags?: string[];
}

export interface CampaignData {
  name: string;
  channel: CampaignChannel;
  audienceType: CampaignAudience;
  audienceValue: AudienceValue | null;
  title: string;
  content: string;
  route: CampaignRoute | null;
  resourceId: string | null;
}

export interface CampaignView extends CampaignData {
  id: string;
  status: CampaignStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  recipientCount: number;
  sendVersion: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignRecipient {
  userId: string;
  email: string;
  fullName?: string | null;
  // Thư đã cá nhân hóa, chỉ có ở kênh EMAIL
  html?: string;
  text?: string;
}

export interface CampaignStats {
  recipientCount: number;
  push: { recipients: number; delivered: number; deliveries: Record<string, number> };
  email: Record<string, number>;
  engagement: {
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
    openRate: number;
    clickRate: number;
    topLinks: { url: string; clicks: number }[];
  } | null;
}

export interface ICampaignRepository {
  find(filter: {
    skip: number;
    take: number;
    status?: CampaignStatus;
    channel?: CampaignChannel;
    search?: string;
  }): Promise<{ items: CampaignView[]; total: number }>;
  findById(id: string): Promise<CampaignView | null>;
  create(data: CampaignData, createdBy: string): Promise<CampaignView>;
  update(id: string, data: CampaignData): Promise<CampaignView>;
  // Chỉ đổi khi trạng thái hiện tại nằm trong `from`; trả null nếu không khớp
  transition(
    id: string,
    from: CampaignStatus[],
    to: CampaignStatus,
    scheduledAt?: Date | null,
  ): Promise<CampaignView | null>;
  findDueIds(now: Date, limit: number): Promise<string[]>;
  findTierIds(ids: string[]): Promise<string[]>;
  findCustomerIds(ids: string[]): Promise<string[]>;
  resolveRecipients(
    audienceType: CampaignAudience,
    value: AudienceValue | null,
    needEmail: boolean,
  ): Promise<CampaignRecipient[]>;
  // Khóa trạng thái, gửi, đánh dấu SENT trong một transaction; trả null nếu chiến dịch đã gửi / hủy
  dispatch(campaign: CampaignView, recipients: CampaignRecipient[]): Promise<CampaignView | null>;
  getStats(campaign: CampaignView): Promise<CampaignStats>;
  recordEmailEvent(event: {
    campaignId: string;
    userId: string;
    type: 'OPEN' | 'CLICK';
    url: string | null;
  }): Promise<void>;
  setEmailOptOut(userId: string, optOut: boolean): Promise<void>;
}
