import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { InternalTokenGuard } from './internal-token.guard';
import { WebhookProcessorService } from './webhook-processor.service';
import { WebhookInboxService } from './webhook-inbox.service';

export interface InternalWebhookDispatchDto {
  carrierCode: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
  queueMessageId?: string;
  eventId?: string;
  trackingCode?: string;
}

@ApiTags('Internal Webhooks & Queue Dispatcher')
@Controller('api/v1/internal')
@UseGuards(InternalTokenGuard)
export class InternalWebhookController {
  private readonly logger = new Logger(InternalWebhookController.name);

  constructor(
    private readonly webhookInboxService: WebhookInboxService,
    private readonly webhookProcessorService: WebhookProcessorService,
  ) {}

  /**
   * Endpoint nội bộ nhận Webhook từ Cloudflare Queue Consumer (EP09-T03)
   * Được bảo vệ bằng Shared Token X-Internal-Token
   */
  @Post('webhooks/consume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tiếp nhận và xử lý webhook từ Cloudflare Queue Consumer' })
  @ApiHeader({
    name: 'X-Internal-Token',
    required: true,
    description: 'Shared secret token giữa Cloudflare Queue Consumer và NestJS',
  })
  @ApiResponse({ status: 200, description: 'Xử lý hoặc lưu trữ webhook thành công' })
  @ApiResponse({ status: 401, description: 'Sai hoặc thiếu X-Internal-Token' })
  async consumeWebhook(
    @Body() body: InternalWebhookDispatchDto,
    @Headers() headers: Record<string, any>,
  ) {
    const carrier = body.carrierCode || headers['x-carrier-code'] || 'GENERIC';
    const payload = body.payload || body;
    const combinedHeaders = { ...headers, ...(body.headers || {}) };

    this.logger.log(
      `Received internal dispatch for carrier: ${carrier} (queueMessageId: ${body.queueMessageId || 'N/A'})`,
    );

    // Xử lý trọn gói: Ghi nhận Inbox (Deduplication) -> Chuyển trạng thái Shipment & Order Pipeline
    const processResult = await this.webhookProcessorService.processWebhook(
      carrier,
      payload,
      combinedHeaders,
    );

    return {
      success: processResult.status !== 'FAILED',
      status: processResult.status,
      inboxId: processResult.inboxId,
      shipmentId: processResult.shipmentId,
      newStatus: processResult.newStatus,
      reason: processResult.reason,
    };
  }

  /**
   * Alias endpoint cho dispatcher
   */
  @Post('queue/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispatcher tiếp nhận message từ queue' })
  async dispatchFromQueue(
    @Body() body: InternalWebhookDispatchDto,
    @Headers() headers: Record<string, any>,
  ) {
    return this.consumeWebhook(body, headers);
  }
}
