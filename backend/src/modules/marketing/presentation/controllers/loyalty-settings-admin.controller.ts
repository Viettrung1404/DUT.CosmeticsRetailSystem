import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ManageLoyaltySettingsUseCase } from '../../application/use-cases/manage-loyalty-settings.use-case';
import { LoyaltyTierDto, PointRateDto } from '../dtos/marketing-request.dto';
import { LoyaltySettingsResponseDto } from '../dtos/marketing-response.dto';
import { LoyaltyConfigResponseDto } from '../dtos/marketing-response.dto';
import { LoyaltyTierResponseDto } from '../dtos/marketing-response.dto';

@ApiTags('Admin - Marketing (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class LoyaltySettingsAdminController {
  constructor(private readonly loyalty: ManageLoyaltySettingsUseCase) {}

  @Get('settings/loyalty')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Xem tỷ lệ tích điểm và các hạng thành viên' })
  @ApiOkResponse({ type: LoyaltySettingsResponseDto })
  get() {
    return this.loyalty.get();
  }

  @Put('settings/loyalty')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Đổi tỷ lệ tích điểm (ghi nhật ký thao tác)' })
  @ApiOkResponse({ type: LoyaltyConfigResponseDto })
  async updateRate(@CurrentUser('userId') userId: string, @Body() dto: PointRateDto) {
    const data = await this.loyalty.updatePointRate(userId, dto.pointRate);
    return { message: 'Đã cập nhật tỷ lệ tích điểm', data };
  }

  @Put('loyalty-tiers/:id')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Sửa hạng thành viên (ngưỡng, hệ số, ưu đãi), ghi nhật ký thao tác' })
  @ApiOkResponse({ type: LoyaltyTierResponseDto })
  async updateTier(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LoyaltyTierDto,
  ) {
    const data = await this.loyalty.updateTier(userId, id, dto);
    return { message: `Đã cập nhật hạng ${data.name}`, data };
  }
}
