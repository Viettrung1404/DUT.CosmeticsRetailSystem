import { Body, Controller, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { ProcessCarrierEventUseCase } from '../../application/use-cases/process-carrier-event.use-case';
import { CarrierWebhookResultDto } from '../dtos/shipment-admin.dto';

@ApiTags('Shipment webhooks')
@Controller('webhooks/shipments')
export class ShipmentWebhookController {
  constructor(private readonly processEvent: ProcessCarrierEventUseCase) {}

  @Post(':carrierCode')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hãng vận chuyển báo sự kiện (công khai, xác thực bằng chữ ký). Gửi lại cùng eventId thì chỉ ghi nhận một lần',
  })
  @ApiOkResponse({ type: CarrierWebhookResultDto })
  @ApiUnauthorizedResponse({ description: 'Chữ ký sự kiện không hợp lệ' })
  @ApiConflictResponse({ description: 'Sự kiện không hợp lệ với trạng thái vận đơn hoặc cũ hơn sự kiện đã ghi' })
  async receive(
    @Param('carrierCode') carrierCode: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    return this.processEvent.execute(carrierCode, body, headers);
  }
}
