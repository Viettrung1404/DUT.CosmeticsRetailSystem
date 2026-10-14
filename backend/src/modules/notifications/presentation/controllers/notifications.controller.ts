import { Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { NotificationsService } from '../../application/services/notifications.service';
import { NotificationQueryDto } from '../dtos/notification-query.dto';

@Controller('notifications')
@ApiTags('Customer - Notifications (Viá»‡t Trung)')
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sÃ¡ch thÃ´ng bÃ¡o vÃ  tá»•ng chÆ°a Ä‘á»c' })
  list(@CurrentUser() user: JwtPayload, @Query() dto: NotificationQueryDto) {
    return this.service.list(user.userId, dto.page, dto.limit);
  }

  @Put(':id/read')
  @ApiOperation({
    summary: 'ÄÃ¡nh dáº¥u thÃ´ng bÃ¡o thuá»™c ngÆ°á»i dÃ¹ng Ä‘Ã£ Ä‘á»c',
  })
  read(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.read(user.userId, id);
  }
}
