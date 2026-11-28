import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { ReturnAbuseDetectorService } from '../../application/services/return-abuse-detector.service';

@ApiTags('Admin - Return Abuse & Fraud Detection (Epic 21)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/returns')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminReturnAbuseController {
  constructor(
    private readonly abuseService: ReturnAbuseDetectorService,
  ) {}

  @Get(':id/abuse-check')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Đánh giá rủi ro gian lận / lạm dụng đổi trả cho một hồ sơ RMA (EP21)' })
  async evaluateAbuse(@Param('id') returnOrderId: string) {
    return this.abuseService.evaluateReturnOrder(returnOrderId);
  }

  @Get('risk-profiles/:customerId')
  @RequireAnyPermission('RETURN_VIEW', 'RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Truy vấn hồ sơ lịch sử rủi ro đổi trả của khách hàng (Customer Risk Profile)' })
  async getCustomerRiskProfile(@Param('customerId') customerId: string) {
    return this.abuseService.getCustomerRiskProfile(customerId);
  }
}
