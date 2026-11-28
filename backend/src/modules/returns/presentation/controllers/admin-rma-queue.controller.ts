import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../core/guards/permission.guard';
import { LocationScopeGuard } from '../../../../core/guards/location-scope.guard';
import { LocationScoped } from '../../../../core/decorators/location-scoped.decorator';
import { RequireAnyPermission } from '../../../../core/decorators/require-permissions.decorator';
import { RmaQueueService } from '../../application/services/rma-queue.service';
import { RmaQueueQueryDto } from '../dtos/rma-queue.dto';

@ApiTags('Admin - RMA Work Queues & Operations')
@ApiBearerAuth('JWT-auth')
@Controller('admin/returns/queues')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminRmaQueueController {
  constructor(private readonly rmaQueueService: RmaQueueService) {}

  @Get('review')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'CS_STAFF',
    'STAFF',
  )
  @ApiOperation({
    summary:
      'Hàng đợi 1: CSKH thẩm tra hồ sơ yêu cầu đổi trả mới nộp (SUBMITTED) (EP18-T01)',
  })
  async getReviewQueue(@Query() query: RmaQueueQueryDto, @Req() req: any) {
    const userContext = req.user;
    return this.rmaQueueService.getReviewQueue(query, userContext);
  }

  @Get('dropoff')
  @LocationScoped({ resourceType: 'RETURN_ORDER' })
  @UseGuards(LocationScopeGuard)
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'STORE_MGR',
    'STAFF',
  )
  @ApiOperation({
    summary:
      'Hàng đợi 2: Showroom tiếp nhận hàng khách mang tới (AWAITING_RETURN / APPROVED) (EP18-T01)',
  })
  async getDropoffQueue(@Query() query: RmaQueueQueryDto, @Req() req: any) {
    const userContext = req.user;
    return this.rmaQueueService.getDropoffQueue(query, userContext);
  }

  @Get('inspection')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'WAREHOUSE_STAFF',
    'QC_STAFF',
  )
  @ApiOperation({
    summary:
      'Hàng đợi 3: Chuyên viên KCS kiểm định chất lượng hàng hoàn tại kho (RECEIVED) (EP18-T01)',
  })
  async getInspectionQueue(@Query() query: RmaQueueQueryDto, @Req() req: any) {
    const userContext = req.user;
    return this.rmaQueueService.getInspectionQueue(query, userContext);
  }

  @Get('settlement')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'ACCOUNTANT',
    'FINANCE',
  )
  @ApiOperation({
    summary:
      'Hàng đợi 4: Phòng Tài chính duyệt hoàn tiền và quyết toán đổi hàng (RESOLUTION_PENDING) (EP18-T01)',
  })
  async getSettlementQueue(@Query() query: RmaQueueQueryDto, @Req() req: any) {
    const userContext = req.user;
    return this.rmaQueueService.getSettlementQueue(query, userContext);
  }

  @Get('summary')
  @RequireAnyPermission(
    'RETURN_VIEW',
    'RETURN_MANAGE',
    'ADMIN',
    'STORE_MGR',
    'STAFF',
  )
  @ApiOperation({
    summary:
      'Thống kê tổng số lượng hồ sơ đang chờ xử lý trên cả 4 hàng đợi công việc',
  })
  async getQueueSummary(@Req() req: any) {
    const userContext = req.user;
    return this.rmaQueueService.getQueueSummary(userContext);
  }
}
