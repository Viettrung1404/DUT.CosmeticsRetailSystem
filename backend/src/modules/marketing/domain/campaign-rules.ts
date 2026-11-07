import { BadRequestException } from '@nestjs/common';
import {
  AudienceValue,
  CampaignAudience,
  CampaignChannel,
  CampaignRoute,
  CampaignStatus,
} from './repositories/campaign.repository.interface';

export function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['SCHEDULED', 'SENDING', 'CANCELLED'],
  SCHEDULED: ['SCHEDULED', 'SENDING', 'CANCELLED'],
  SENDING: ['SENT'],
  SENT: [],
  CANCELLED: [],
};

export const canTransition = (from: CampaignStatus, to: CampaignStatus) =>
  TRANSITIONS[from].includes(to);

export function validateAudience(
  type: CampaignAudience,
  value: AudienceValue | null | undefined,
): AudienceValue | null {
  if (type === 'ALL') return null;
  if (type === 'CUSTOMERS') {
    const chosen = [value?.customerIds, value?.rfmSegments, value?.customerTags].filter((v) => v?.length);
    if (chosen.length > 1) {
      throw new BadRequestException('Chỉ chọn một trong: danh sách khách, nhóm RFM hoặc nhãn khách');
    }
    if (value?.rfmSegments?.length) return { rfmSegments: [...new Set(value.rfmSegments)] };
    if (value?.customerTags?.length) return { customerTags: [...new Set(value.customerTags)] };
  }
  const key = type === 'TIER' ? 'tierIds' : 'customerIds';
  const ids = [...new Set(value?.[key] ?? [])];
  if (!ids.length) {
    throw new BadRequestException(
      type === 'TIER' ? 'Chọn ít nhất một hạng thành viên' : 'Chọn ít nhất một khách hàng',
    );
  }
  return { [key]: ids };
}

export function validateChannelTarget(
  channel: CampaignChannel,
  route: CampaignRoute | null | undefined,
  resourceId: string | null | undefined,
): { route: CampaignRoute | null; resourceId: string | null } {
  if (channel === 'EMAIL') return { route: null, resourceId: null };
  if (!route || !resourceId) {
    throw new BadRequestException(
      'Thông báo đẩy cần chọn nơi mở khi khách bấm vào (sản phẩm, khuyến mãi hoặc bài viết)',
    );
  }
  return { route, resourceId };
}
