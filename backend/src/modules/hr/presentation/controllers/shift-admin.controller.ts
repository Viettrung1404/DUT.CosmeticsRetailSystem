import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { CreateShiftUseCase } from '../../application/use-cases/create-shift.use-case';
import { DeleteShiftUseCase } from '../../application/use-cases/delete-shift.use-case';
import { GetShiftsUseCase } from '../../application/use-cases/get-shifts.use-case';
import { UpdateShiftUseCase } from '../../application/use-cases/update-shift.use-case';
import { parseUuidVi } from '../pipes/parse-uuid-vi.pipe';
import {
  CreateShiftRequestDto,
  GetShiftsQueryDto,
  UpdateShiftRequestDto,
} from '../dtos/hr-request.dto';
import { ShiftResponseDto } from '../dtos/hr-response.dto';

@ApiTags('Admin - HR (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shifts')
export class ShiftAdminController {
  constructor(
    private readonly getShifts: GetShiftsUseCase,
    private readonly createShift: CreateShiftUseCase,
    private readonly updateShift: UpdateShiftUseCase,
    private readonly deleteShift: DeleteShiftUseCase,
  ) {}

  @Get()
  @RequirePermissions('EMPLOYEE_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách ca làm việc (lọc cửa hàng; theo phạm vi dữ liệu)' })
  async list(@CurrentUser() user: JwtPayload, @Query() query: GetShiftsQueryDto) {
    const shifts = await this.getShifts.execute(user.userId, query.storeId);
    return shifts.map((s) => ShiftResponseDto.fromDomain(s));
  }

  @Post()
  @RequirePermissions('EMPLOYEE_MANAGE')
  @ApiOperation({ summary: 'Admin - Tạo ca làm việc cho một cửa hàng (bỏ trống storeId = ca dùng chung)' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateShiftRequestDto) {
    return ShiftResponseDto.fromDomain(await this.createShift.execute(user.userId, dto));
  }

  @Put(':id')
  @RequirePermissions('EMPLOYEE_MANAGE')
  @ApiOperation({ summary: 'Admin - Sửa tên / giờ của ca (không đổi cửa hàng)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy ca làm việc' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', parseUuidVi) id: string,
    @Body() dto: UpdateShiftRequestDto,
  ) {
    return ShiftResponseDto.fromDomain(await this.updateShift.execute(user.userId, id, dto));
  }

  @Delete(':id')
  @RequirePermissions('EMPLOYEE_MANAGE')
  @ApiOperation({ summary: 'Admin - Xóa ca (chỉ khi chưa có dòng chấm công nào dùng ca)' })
  @ApiConflictResponse({ description: 'Ca đã có dòng chấm công' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id', parseUuidVi) id: string) {
    await this.deleteShift.execute(user.userId, id);
    return { message: 'Đã xóa ca làm việc', data: null };
  }
}
