import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { WebhookInboxService } from './webhook-inbox.service';

export interface WebhookConsumeRequest {
  carrierCode: string;
  payload: Record<string, any>;
  eventId?: string;
  trackingCode?: string;
}

@ApiTags('Shipping Webhooks')
@Public()
@Controller('webhooks')
export class WebhookIngressController {
  private readonly logger = new Logger(WebhookIngressController.name);

  constructor(private readonly webhookInboxService: WebhookInboxService) {}

  /**
   * Endpoint tiếp nhận Webhook trực tiếp từ GHN (Giao Hàng Nhanh)
   */
  @Post('ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook tiếp nhận sự kiện từ Giao Hàng Nhanh (GHN)' })
  async receiveGhnWebhook(
    @Body() body: Record<string, any>,
    @Headers() headers: Record<string, any>,
  ) {
    const result = await this.webhookInboxService.recordWebhook('GHN', body, headers);
    return {
      success: true,
      status: result.status,
      isDuplicate: result.isDuplicate,
      eventId: result.inbox.eventId,
    };
  }

  /**
   * Endpoint tiếp nhận Webhook trực tiếp từ Ahamove On-Demand Delivery
   */
  @Post('ahamove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook tiếp nhận sự kiện từ Ahamove' })
  async receiveAhamoveWebhook(
    @Body() body: Record<string, any>,
    @Headers() headers: Record<string, any>,
  ) {
    const result = await this.webhookInboxService.recordWebhook('AHAMOVE', body, headers);
    return {
      success: true,
      status: result.status,
      isDuplicate: result.isDuplicate,
      eventId: result.inbox.eventId,
    };
  }

  /**
   * Endpoint đa hình theo carrierCode
   */
  @Post('shipping/:carrierCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook đa hình theo mã nhà vận chuyển' })
  async receiveGenericCarrierWebhook(
    @Param('carrierCode') carrierCode: string,
    @Body() body: Record<string, any>,
    @Headers() headers: Record<string, any>,
  ) {
    const result = await this.webhookInboxService.recordWebhook(
      carrierCode.toUpperCase(),
      body,
      headers,
    );
    return {
      success: true,
      status: result.status,
      isDuplicate: result.isDuplicate,
      eventId: result.inbox.eventId,
    };
  }
}
