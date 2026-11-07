import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { UsersService } from '../../application/services/users.service';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

@ApiTags('Customer - Profile (Viá»‡t Trung)')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Há»“ sÆ¡ ngÆ°á»i dÃ¹ng hiá»‡n táº¡i' })
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.userId);
  }

  @Put('me')
  @ApiOperation({
    summary: 'Cáº­p nháº­t há»“ sÆ¡; phone thay Ä‘á»•i sáº½ cáº§n xÃ¡c minh láº¡i',
  })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.service.update(user.userId, dto);
  }
}
