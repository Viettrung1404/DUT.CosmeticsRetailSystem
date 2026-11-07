import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Public } from '@core/decorators/public.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ManageSeoSettingsUseCase } from '../../application/use-cases/manage-seo-settings.use-case';
import { SeoSettingsDto } from '../dtos/seo-settings.dto';

@ApiTags('Admin - Marketing (Thành Lập)')
@Controller()
export class SeoSettingsController {
  constructor(private readonly seo: ManageSeoSettingsUseCase) {}

  @Get('settings/seo')
  @Public()
  @ApiOperation({ summary: 'Công khai - Cấu hình SEO mặc định cho web khách (tên site, mô tả, ảnh chia sẻ)' })
  getPublic() {
    return this.seo.get();
  }

  @Get('admin/settings/seo')
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Xem cấu hình SEO mặc định' })
  get() {
    return this.seo.get();
  }

  @Put('admin/settings/seo')
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('SYSTEM_SETTING_UPDATE')
  @ApiOperation({ summary: 'Admin - Đổi cấu hình SEO mặc định (ghi nhật ký thao tác)' })
  async update(@CurrentUser('userId') userId: string, @Body() dto: SeoSettingsDto) {
    const data = await this.seo.update(userId, dto);
    return { message: 'Đã cập nhật cấu hình SEO', data };
  }
}
