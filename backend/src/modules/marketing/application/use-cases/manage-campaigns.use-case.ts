import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CAMPAIGN_REPOSITORY,
  CampaignChannel,
  CampaignData,
  CampaignStatus,
  CampaignView,
  ICampaignRepository,
  AudienceValue,
  CampaignAudience,
  CampaignRoute,
} from '../../domain/repositories/campaign.repository.interface';
import {
  canTransition,
  validateAudience,
  validateChannelTarget,
} from '../../domain/campaign-rules';
import { CUSTOMER_SEGMENT_PORT, ICustomerSegmentPort } from '../ports/customer-segment.port';
import { EmailTrackingService } from '../services/email-tracking.service';

const PUSH_CONTENT_MAX = 2000;

export interface CampaignInput {
  name: string;
  channel: CampaignChannel;
  audienceType: CampaignAudience;
  audienceValue?: AudienceValue | null;
  title: string;
  content: string;
  route?: CampaignRoute | null;
  resourceId?: string | null;
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'bản nháp',
  SCHEDULED: 'đã hẹn giờ',
  SENDING: 'đang gửi',
  SENT: 'đã gửi',
  CANCELLED: 'đã hủy',
};

@Injectable()
export class ManageCampaignsUseCase {
  private readonly logger = new Logger(ManageCampaignsUseCase.name);

  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly repository: ICampaignRepository,
    @Inject(CUSTOMER_SEGMENT_PORT) private readonly segments: ICustomerSegmentPort,
    private readonly tracking: EmailTrackingService,
  ) {}

  list(input: {
    page: number;
    limit: number;
    status?: CampaignStatus;
    channel?: CampaignChannel;
    search?: string;
  }) {
    return this.repository.find({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      status: input.status,
      channel: input.channel,
      search: input.search,
    });
  }

  detail(id: string) {
    return this.get(id);
  }

  async create(userId: string, input: CampaignInput) {
    return this.repository.create(await this.prepare(input), userId);
  }

  async update(id: string, input: CampaignInput) {
    const campaign = await this.get(id);
    if (campaign.status !== 'DRAFT') {
      throw new ConflictException(
        `Chỉ sửa được chiến dịch ở trạng thái bản nháp, chiến dịch này đang ${STATUS_LABEL[campaign.status]}`,
      );
    }
    return this.repository.update(id, await this.prepare(input));
  }

  async schedule(id: string, scheduledAt: Date, now: Date = new Date()) {
    if (scheduledAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Thời điểm hẹn giờ phải ở tương lai');
    }
    const campaign = await this.get(id);
    this.assertCanMove(campaign, 'SCHEDULED');
    const moved = await this.repository.transition(
      id,
      ['DRAFT', 'SCHEDULED'],
      'SCHEDULED',
      scheduledAt,
    );
    if (!moved) throw this.changedConflict();
    return moved;
  }

  async cancel(id: string) {
    const campaign = await this.get(id);
    this.assertCanMove(campaign, 'CANCELLED');
    const moved = await this.repository.transition(id, ['DRAFT', 'SCHEDULED'], 'CANCELLED');
    if (!moved) throw this.changedConflict();
    return moved;
  }

  async send(id: string) {
    const campaign = await this.get(id);
    this.assertCanMove(campaign, 'SENDING');
    const rfmSegments = campaign.audienceValue?.rfmSegments;
    const recipients = rfmSegments?.length
      ? await this.repository.resolveRecipients(
          'CUSTOMERS',
          { customerIds: await this.segments.customerIdsBySegments(rfmSegments) },
          campaign.channel === 'EMAIL',
        )
      : await this.repository.resolveRecipients(
          campaign.audienceType,
          campaign.audienceValue,
          campaign.channel === 'EMAIL',
        );
    if (!recipients.length) {
      throw new BadRequestException(
        campaign.channel === 'EMAIL'
          ? 'Không có khách hàng nào phù hợp (đang hoạt động và đã xác thực email) để gửi'
          : 'Không có khách hàng nào phù hợp để gửi',
      );
    }
    const messages =
      campaign.channel === 'EMAIL'
        ? recipients.map((r) => ({
            ...r,
            ...this.tracking.render(campaign, { ...r, fullName: r.fullName ?? null }),
          }))
        : recipients;
    const sent = await this.repository.dispatch(campaign, messages);
    if (!sent) throw this.changedConflict();
    return sent;
  }

  async createAndSend(userId: string, input: CampaignInput) {
    const campaign = await this.create(userId, input);
    try {
      return await this.send(campaign.id);
    } catch (error) {
      await this.repository.transition(campaign.id, ['DRAFT'], 'CANCELLED');
      throw error;
    }
  }

  async stats(id: string) {
    const campaign = await this.get(id);
    const stats = await this.repository.getStats(campaign);
    return {
      campaignId: campaign.id,
      channel: campaign.channel,
      status: campaign.status,
      sentAt: campaign.sentAt,
      ...stats,
    };
  }

  async sendDue(now: Date = new Date()) {
    const ids = await this.repository.findDueIds(now, 20);
    let sent = 0;
    for (const id of ids) {
      try {
        await this.send(id);
        sent += 1;
      } catch (error) {
        if (error instanceof BadRequestException) {
          await this.repository.transition(id, ['SCHEDULED'], 'CANCELLED');
          this.logger.warn(`Hủy chiến dịch ${id} vì không có người nhận`);
        } else if (!(error instanceof ConflictException)) {
          this.logger.error(`Gửi chiến dịch ${id} thất bại`, error);
        }
      }
    }
    return sent;
  }

  private async get(id: string): Promise<CampaignView> {
    const campaign = await this.repository.findById(id);
    if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');
    return campaign;
  }

  private assertCanMove(campaign: CampaignView, to: CampaignStatus) {
    if (!canTransition(campaign.status, to)) {
      throw new ConflictException(
        `Không thực hiện được vì chiến dịch này ${STATUS_LABEL[campaign.status]}`,
      );
    }
  }

  private changedConflict() {
    return new ConflictException('Chiến dịch vừa được thay đổi bởi người khác, tải lại để xem');
  }

  private async prepare(input: CampaignInput): Promise<CampaignData> {
    const audienceValue = validateAudience(input.audienceType, input.audienceValue);
    const target = validateChannelTarget(input.channel, input.route, input.resourceId);
    if (audienceValue?.tierIds) {
      const found = await this.repository.findTierIds(audienceValue.tierIds);
      if (found.length !== audienceValue.tierIds.length) {
        throw new BadRequestException('Có hạng thành viên không tồn tại');
      }
    }
    if (audienceValue?.customerIds) {
      const found = await this.repository.findCustomerIds(audienceValue.customerIds);
      if (found.length !== audienceValue.customerIds.length) {
        throw new BadRequestException('Có khách hàng không tồn tại');
      }
    }
    const name = input.name.trim();
    const title = input.title.trim();
    const content = input.content.trim();
    if (!name) throw new BadRequestException('Tên chiến dịch không được để trống');
    if (!title) throw new BadRequestException('Tiêu đề không được để trống');
    if (!content) throw new BadRequestException('Nội dung không được để trống');
    if (input.channel === 'PUSH' && content.length > PUSH_CONTENT_MAX) {
      throw new BadRequestException(`Nội dung thông báo đẩy tối đa ${PUSH_CONTENT_MAX} ký tự`);
    }
    return {
      name,
      channel: input.channel,
      audienceType: input.audienceType,
      audienceValue,
      title,
      content,
      ...target,
    };
  }
}
