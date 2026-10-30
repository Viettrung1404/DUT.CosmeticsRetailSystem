import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { CheckInUseCase } from '../../application/use-cases/check-in.use-case';
import { CheckOutUseCase } from '../../application/use-cases/check-out.use-case';
import { GetAttendanceUseCase } from '../../application/use-cases/get-attendance.use-case';
import { GetAttendanceQueryDto } from '../dtos/hr-request.dto';
import { AttendanceResponseDto } from '../dtos/hr-response.dto';

@ApiTags('Admin - HR (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/attendance')
export class AttendanceAdminController {
  constructor(
    private readonly checkIn: CheckInUseCase,
    private readonly checkOut: CheckOutUseCase,
    private readonly getAttendance: GetAttendanceUseCase,
  ) {}

  // Không đòi quyền riêng: nhân viên nào đăng nhập cũng tự chấm cho mình, tài khoản không có hồ sơ nhân viên bị 403
  @Post('check-in')
  @HttpCode(200)
  @ApiOperation({ summary: 'Nhân viên tự chấm công vào ca (trễ quá 15 phút so với ca đã phân = LATE)' })
  @ApiConflictResponse({ description: 'Đã chấm công vào / đã chấm đủ trong ngày' })
  async checkInNow(@CurrentUser() user: JwtPayload) {
    const row = await this.checkIn.execute(user.userId);
    return { message: 'Chấm công vào thành công', data: AttendanceResponseDto.fromDomain(row) };
  }

  @Post('check-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Nhân viên tự chấm công ra' })
  @ApiConflictResponse({ description: 'Chưa chấm công vào hoặc đã chấm công ra' })
  async checkOutNow(@CurrentUser() user: JwtPayload) {
    const row = await this.checkOut.execute(user.userId);
    return { message: 'Chấm công ra thành công', data: AttendanceResponseDto.fromDomain(row) };
  }

  @Get()
  @RequirePermissions('EMPLOYEE_ATTENDANCE')
  @ApiOperation({ summary: 'Admin - Bảng chấm công (lọc nhân viên, cửa hàng, khoảng ngày, trạng thái; theo phạm vi dữ liệu)' })
  async list(@CurrentUser() user: JwtPayload, @Query() query: GetAttendanceQueryDto) {
    const { items, total } = await this.getAttendance.execute(user.userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      employeeId: query.employeeId,
      storeId: query.storeId,
      from: query.from,
      to: query.to,
      status: query.status,
    });
    return new PageDto(
      items.map((a) => AttendanceResponseDto.fromDomain(a)),
      new PageMetaDto({ pageOptionsDto: query, itemCount: total }),
    );
  }
}
