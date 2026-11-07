import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ManageLoyaltySettingsUseCase } from '../../application/use-cases/manage-loyalty-settings.use-case';
import { LoyaltyTierDto, PointRateDto } from '../dtos/marketing-request.dto';

@ApiTags('Admin - Marketing (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class LoyaltySettingsAdminController {
  constructor(private readonly loyalty: ManageLoyaltySettingsUseCase) {}

  @Get('settings/loyalty')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Xem tỷ lệ tích điểm và các hạng thành viên' })
  get() {
    return this.loyalty.get();
  }

  @Put('settings/loyalty')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Đổi tỷ lệ tích điểm (ghi nhật ký thao tác)' })
  async updateRate(@CurrentUser('userId') userId: string, @Body() dto: PointRateDto) {
    const data = await this.loyalty.updatePointRate(userId, dto.pointRate);
    return { message: 'Đã cập nhật tỷ lệ tích điểm', data };
  }

  @Put('loyalty-tiers/:id')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Sửa hạng thành viên (ngưỡng, hệ số, ưu đãi), ghi nhật ký thao tác' })
  async updateTier(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LoyaltyTierDto,
  ) {
    const data = await this.loyalty.updateTier(userId, id, dto);
    return { message: `Đã cập nhật hạng ${data.name}`, data };
  }
}
