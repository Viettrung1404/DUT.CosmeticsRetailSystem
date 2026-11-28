import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { RmaWorkflowService } from '../../application/services/rma-workflow.service';
import {
  ExpireStaleRmaDto,
  CheckQcSlaDto,
  HandleLostPackageDto,
} from '../dtos/rma-workflow.dto';

@ApiTags('Admin - RMA Workflows & Automation (Epic 19)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/returns/workflows')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminRmaWorkflowController {
  constructor(private readonly rmaWorkflowService: RmaWorkflowService) {}

  @Post('expire-stale')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quét và tự động hủy các hồ sơ RMA quá hạn 7 ngày không gửi hàng (TC-RMA-18)' })
  async expireStaleRmas(@Body() dto: ExpireStaleRmaDto) {
    return this.rmaWorkflowService.expireStaleApprovedRmas(dto.thresholdDays);
  }

  @Post('check-qc-sla')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quét và cảnh báo các hồ sơ RMA lưu kho quá 48h chưa kiểm định KCS' })
  async checkQcSla(@Body() dto: CheckQcSlaDto) {
    return this.rmaWorkflowService.checkQcSlaBreaches(dto.thresholdHours);
  }

  @Post('lost-package/:shipmentId')
  @RequireAnyPermission('RETURN_MANAGE', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xử lý bưu kiện thu gom bị thất lạc: Tự động hoàn tiền cho khách & lập bồi thường 3PL (TC-RMA-19)' })
  async handleLostPackage(
    @Param('shipmentId') shipmentId: string,
    @Body() dto: HandleLostPackageDto,
    @Req() req: any,
  ) {
    const operatorUserId = req.user?.id || req.user?.sub;
    return this.rmaWorkflowService.handleLostReturnPackage(shipmentId, {
      ...dto,
      operatorUserId,
    });
  }
}
