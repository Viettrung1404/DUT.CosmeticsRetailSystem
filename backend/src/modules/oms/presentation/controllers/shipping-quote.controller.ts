import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { ShippingQuoteService } from '../../application/services/shipping-quote.service';
import {
  CalculateShippingQuoteDto,
  ShippingQuoteResponseDto,
} from '../dtos/shipping-quote.dto';

@ApiTags('Shipping Quotes & Distance')
@Controller('shipping/quotes')
export class ShippingQuoteController {
  constructor(private readonly shippingQuoteService: ShippingQuoteService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Tính toán báo giá cước vận chuyển và kiểm tra khả năng giao hỏa tốc 2H',
    description:
      'Đánh giá khoảng cách đường bộ thực tế theo DEC-01 (<= 10km cho Hỏa tốc Ahamove) và biểu phí GHN Standard. Cấp mã quoteGroupId có hiệu lực trong 15 phút.',
  })
  @ApiResponse({
    status: 201,
    description: 'Báo giá vận chuyển được tính toán thành công',
  })
  async calculateQuotes(
    @Body() dto: CalculateShippingQuoteDto,
  ): Promise<ShippingQuoteResponseDto> {
    return this.shippingQuoteService.calculateQuotes(dto);
  }

  @Public()
  @Get(':quoteGroupId')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết nhóm báo giá vận chuyển đã cấp',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết báo giá vận chuyển',
  })
  async getQuoteGroup(
    @Param('quoteGroupId', ParseUUIDPipe) quoteGroupId: string,
  ): Promise<ShippingQuoteResponseDto | null> {
    return this.shippingQuoteService.getQuoteGroup(quoteGroupId);
  }
}
