import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto, PageOptionsDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { ManageCampaignsUseCase } from '../../application/use-cases/manage-campaigns.use-case';
import { ManageContentUseCase } from '../../application/use-cases/manage-content.use-case';
import {
  CampaignContentDto,
  CampaignQueryDto,
  EmailTemplateDto,
  ScheduleCampaignDto,
  SendEmailCampaignDto,
  SendPushDto,
} from '../dtos/campaign-request.dto';
import { ApiPagedOkResponse } from '@core/decorators/api-paged-response.decorator';
import { CampaignResponseDto } from '../dtos/marketing-response.dto';
import { CampaignStatsResponseDto } from '../dtos/marketing-response.dto';
import { EmailTemplateResponseDto } from '../dtos/marketing-response.dto';

@ApiTags('Admin - Marketing (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class CampaignAdminController {
  constructor(
    private readonly campaigns: ManageCampaignsUseCase,
    private readonly content: ManageContentUseCase,
  ) {}

  @Get('campaigns')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách chiến dịch marketing (push / email)' })
  @ApiPagedOkResponse(CampaignResponseDto)
  async list(@Query() query: CampaignQueryDto) {
    const { items, total } = await this.campaigns.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      channel: query.channel,
      search: query.search,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('campaigns/:id')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết chiến dịch' })
  @ApiOkResponse({ type: CampaignResponseDto })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.detail(id);
  }

  @Get('campaigns/:id/stats')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Thống kê chiến dịch: số người nhận, push đã giao theo trạng thái, email theo trạng thái (PENDING / SENT / lỗi). Chưa theo dõi mở / nhấp',
  })
  @ApiOkResponse({ type: CampaignStatsResponseDto })
  stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.stats(id);
  }

  @Post('campaigns')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo chiến dịch (bản nháp)' })
  @ApiCreatedResponse({ type: CampaignResponseDto })
  async create(@CurrentUser('userId') userId: string, @Body() dto: CampaignContentDto) {
    const data = await this.campaigns.create(userId, dto);
    return { message: `Đã tạo chiến dịch ${data.name}`, data };
  }

  @Put('campaigns/:id')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa chiến dịch (chỉ khi còn là bản nháp)' })
  @ApiOkResponse({ type: CampaignResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CampaignContentDto) {
    return this.campaigns.update(id, dto);
  }

  @Put('campaigns/:id/schedule')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Hẹn giờ gửi (job kiểm tra 5 phút / lần)' })
  @ApiOkResponse({ type: CampaignResponseDto })
  async schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleCampaignDto) {
    const data = await this.campaigns.schedule(id, dto.scheduledAt);
    return { message: 'Đã hẹn giờ gửi chiến dịch', data };
  }

  @Post('campaigns/:id/send')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Gửi chiến dịch ngay' })
  @ApiCreatedResponse({ type: CampaignResponseDto })
  async send(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.campaigns.send(id);
    return { message: `Đã gửi chiến dịch tới ${data.recipientCount} khách hàng`, data };
  }

  @Put('campaigns/:id/cancel')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Hủy chiến dịch (bản nháp hoặc đã hẹn giờ)' })
  @ApiOkResponse({ type: CampaignResponseDto })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.campaigns.cancel(id);
    return { message: 'Đã hủy chiến dịch', data };
  }

  @Post('email-campaigns')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Gửi email marketing ngay (lối tắt: tạo chiến dịch EMAIL rồi gửi luôn)' })
  @ApiCreatedResponse({ type: CampaignResponseDto })
  async emailNow(@CurrentUser('userId') userId: string, @Body() dto: SendEmailCampaignDto) {
    const data = await this.campaigns.createAndSend(userId, { ...dto, channel: 'EMAIL' });
    return { message: `Đã xếp hàng gửi email cho ${data.recipientCount} khách`, data };
  }

  @Get('email-templates')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách mẫu email' })
  @ApiPagedOkResponse(EmailTemplateResponseDto)
  async templates(@Query() query: PageOptionsDto) {
    const { items, total } = await this.content.listCms('emailTemplate', query.page ?? 1, query.limit ?? 20);
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('email-templates/:id')
  @RequireAnyPermission('MARKETING_PROMO_VIEW', 'MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết mẫu email' })
  @ApiOkResponse({ type: EmailTemplateResponseDto })
  template(@Param('id', ParseUUIDPipe) id: string) {
    return this.content.getCms('emailTemplate', id);
  }

  @Post('email-templates')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Thêm mẫu email' })
  @ApiCreatedResponse({ type: EmailTemplateResponseDto })
  createTemplate(@Body() dto: EmailTemplateDto) {
    return this.content.createCms('emailTemplate', { ...dto });
  }

  @Put('email-templates/:id')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa mẫu email' })
  @ApiOkResponse({ type: EmailTemplateResponseDto })
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EmailTemplateDto) {
    return this.content.updateCms('emailTemplate', id, { ...dto });
  }

  @Delete('email-templates/:id')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa mẫu email' })
  @ApiOkResponse({ description: 'Thành công', schema: { type: 'null' } })
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.content.deleteCms('emailTemplate', id);
    return { message: 'Đã xóa mẫu email', data: null };
  }

  @Post('notifications/push')
  @RequirePermissions('MARKETING_PROMO_MANAGE')
  @ApiOperation({
    summary: 'Admin - Gửi thông báo đẩy ngay (lối tắt: tạo chiến dịch PUSH rồi gửi luôn)',
  })
  @ApiCreatedResponse({ type: CampaignResponseDto })
  async pushNow(@CurrentUser('userId') userId: string, @Body() dto: SendPushDto) {
    const byRfm = dto.target === 'segment' && !!dto.rfmSegments?.length;
    const audienceType =
      dto.target === 'all' ? 'ALL' : dto.target === 'segment' && !byRfm ? 'TIER' : 'CUSTOMERS';
    const data = await this.campaigns.createAndSend(userId, {
      name: `Thông báo đẩy ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      channel: 'PUSH',
      audienceType,
      audienceValue: byRfm
        ? { rfmSegments: dto.rfmSegments }
        : { tierIds: dto.tierIds, customerIds: dto.customerIds },
      title: dto.title,
      content: dto.message,
      route: dto.route,
      resourceId: dto.resourceId,
    });
    return { message: `Đã gửi thông báo tới ${data.recipientCount} khách hàng`, data };
  }
}
